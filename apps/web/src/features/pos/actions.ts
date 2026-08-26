"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import { isPaymentMethod, validateCheckout } from "./schemas";
import type { CartItem, CheckoutActionState, PosProduct, StockConflict } from "./types";
import type { Sale } from "@/features/sales/types";

export async function createSaleAction(
  _previousState: CheckoutActionState,
  formData: FormData,
): Promise<CheckoutActionState> {
  const cartItems = parseCartItems(formData.get("items"));
  const paymentMethod = stringValue(formData, "payment_method") || "efectivo";
  const customerName = stringValue(formData, "customer_name");
  const discountTypeRaw = stringValue(formData, "discount_type");
  const discountValueRaw = stringValue(formData, "discount_value");
  const discountSourceOverrideRaw = stringValue(formData, "discount_source_override");
  const fieldErrors: CheckoutActionState["fieldErrors"] = validateCheckout(cartItems, paymentMethod);

  if (customerName.length > 100) {
    fieldErrors.customer_name = "Nombre del cliente debe tener maximo 100 caracteres";
  }

  const discountType = discountTypeRaw === "percentage" || discountTypeRaw === "fixed" ? discountTypeRaw : null;
  let discountValue = 0;
  if (discountType) {
    discountValue = Number(discountValueRaw);
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      fieldErrors.discount_value = "Ingresa un valor de descuento valido";
    } else if (discountType === "percentage" && discountValue > 100) {
      fieldErrors.discount_value = "El porcentaje no puede superar 100";
    }
  }

  const discountSourceOverride =
    discountSourceOverrideRaw === "auto" ||
    discountSourceOverrideRaw === "product" ||
    discountSourceOverrideRaw === "manual" ||
    discountSourceOverrideRaw === "none"
      ? discountSourceOverrideRaw
      : null;

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  if (!isPaymentMethod(paymentMethod)) {
    return { ok: false, fieldErrors: { payment_method: "Metodo de pago invalido" } };
  }

  const token = await getAuthToken();
  const result = await apiRequest<Sale>("/sales", {
    method: "POST",
    token: token ?? undefined,
    body: {
      items: cartItems.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
      })),
      payment_method: paymentMethod,
      device_id: "web-pos",
      customer_name: customerName || null,
      ...(discountType ? { discount_type: discountType, discount_value: String(discountValue) } : {}),
      ...(discountSourceOverride ? { discount_source_override: discountSourceOverride } : {}),
    },
  });

  if (!result.ok) {
    const stockConflicts = stockConflictsFromDetails(result.error.details);
    const refreshedProducts = stockConflicts.length > 0 ? await refreshCartProducts(cartItems, token) : [];

    return {
      ok: false,
      message: stockConflicts.length > 0 ? stockConflictMessage(stockConflicts) : result.error.message,
      fieldErrors: {},
      stockConflicts,
      refreshedProducts,
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/sales");
  redirect(`/dashboard/sales/${result.data.id}`);
}

function parseCartItems(value: FormDataEntryValue | null): CartItem[] {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): CartItem[] => {
      if (!isRecord(item) || !isRecord(item.product)) return [];
      const product = parseProduct(item.product);
      const quantity = Number(item.quantity);
      if (!product || !Number.isInteger(quantity)) return [];
      return [{ product, quantity }];
    });
  } catch {
    return [];
  }
}

function parseProduct(value: Record<string, unknown>): PosProduct | null {
  const stock = value.stock;
  if (
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.price !== "string" ||
    typeof value.unit !== "string" ||
    typeof stock !== "number" ||
    !Number.isInteger(stock)
  ) {
    return null;
  }

  const discountType = value.discount_type === "percentage" || value.discount_type === "fixed" ? value.discount_type : null;

  return {
    id: value.id,
    name: value.name,
    price: value.price,
    stock,
    unit: value.unit,
    qr_code: typeof value.qr_code === "string" ? value.qr_code : null,
    discount_type: discountType,
    discount_value: typeof value.discount_value === "string" ? value.discount_value : "0",
    effective_price: typeof value.effective_price === "string" ? value.effective_price : value.price,
  };
}

async function refreshCartProducts(items: CartItem[], token: string | null): Promise<PosProduct[]> {
  if (!token || items.length === 0) return [];

  const uniqueProductIds = [...new Set(items.map((item) => item.product.id))];
  const results = await Promise.all(
    uniqueProductIds.map((productId) => apiRequest<PosProduct>(`/products/${productId}`, { token })),
  );

  return results.flatMap((result) => (result.ok ? [compactProduct(result.data)] : []));
}

function compactProduct(product: PosProduct & { qr_code?: string | null }): PosProduct {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    stock: product.stock,
    unit: product.unit,
    qr_code: product.qr_code ?? null,
    discount_type: product.discount_type ?? null,
    discount_value: product.discount_value ?? "0",
    effective_price: product.effective_price ?? product.price,
  };
}

function stockConflictsFromDetails(details: unknown): StockConflict[] {
  if (!isRecord(details) || !Array.isArray(details.stock_conflicts)) return [];

  return details.stock_conflicts.flatMap((conflict): StockConflict[] => {
    if (!isRecord(conflict)) return [];
    if (
      typeof conflict.product_id !== "string" ||
      typeof conflict.product_name !== "string" ||
      typeof conflict.available_stock !== "number" ||
      typeof conflict.requested_quantity !== "number"
    ) {
      return [];
    }

    return [
      {
        product_id: conflict.product_id,
        product_name: conflict.product_name,
        available_stock: conflict.available_stock,
        requested_quantity: conflict.requested_quantity,
      },
    ];
  });
}

function stockConflictMessage(conflicts: StockConflict[]) {
  const [firstConflict] = conflicts;
  if (!firstConflict) return "No se pudo confirmar la venta porque el stock cambio.";

  return (
    "No se pudo confirmar la venta porque el stock cambio. " +
    `${firstConflict.product_name}: solicitaste ${firstConflict.requested_quantity}, ` +
    `disponible ${firstConflict.available_stock}.`
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
