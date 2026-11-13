import {
  BadgeCheck,
  Boxes,
  CalendarClock,
  FileSpreadsheet,
  QrCode,
  Receipt,
  ShieldCheck,
  ShoppingCart,
} from "lucide-react";

export interface MarketingFeature {
  icon: typeof Boxes;
  title: string;
  description: string;
}

// Funcionalidades reales del producto, verificadas contra el codigo actual
// (apps/backend README y rutas de apps/web/app/(app)/dashboard). No listar
// nada que el producto no haga todavia.
export const FEATURES: MarketingFeature[] = [
  {
    icon: Boxes,
    title: "Control de inventario",
    description:
      "Registra productos, categorías, stock mínimo y ajustes de inventario en tiempo real, con alertas cuando un producto está por agotarse.",
  },
  {
    icon: ShoppingCart,
    title: "Punto de venta (POS)",
    description:
      "Registra ventas rápido desde el mostrador y descuenta el stock automáticamente, sin pasos manuales adicionales.",
  },
  {
    icon: Receipt,
    title: "Ventas y reportes",
    description:
      "Historial de ventas, reportes de ingresos y movimientos de stock para saber exactamente que esta pasando en tu negocio cada dia.",
  },
  {
    icon: CalendarClock,
    title: "Cierre de caja diario",
    description:
      "Abre y cierra caja con control de efectivo esperado vs. contado, para detectar diferencias antes de que se vuelvan un problema.",
  },
  {
    icon: QrCode,
    title: "Etiquetas y codigos QR",
    description: "Genera e imprime etiquetas con código QR por producto para agilizar el registro en el punto de venta.",
  },
  {
    icon: FileSpreadsheet,
    title: "Importacion masiva por CSV",
    description: "Carga tu catálogo completo de productos desde una planilla en minutos, sin cargar uno por uno.",
  },
  {
    icon: ShieldCheck,
    title: "Roles y permisos",
    description: "Diferencia entre el rol de dueño y el de cajero, para que cada persona vea solo lo que necesita operar.",
  },
  {
    icon: BadgeCheck,
    title: "Tipo de cambio integrado",
    description:
      "Registra tipo de cambio (oficial BCB y paralelo) para negocios que manejan precios en bolivianos y dolares.",
  },
];

export interface MarketingSegment {
  title: string;
  description: string;
}

export const SEGMENTS: MarketingSegment[] = [
  {
    title: "Tiendas y minimarkets",
    description: "Controla decenas o cientos de productos sin depender de cuadernos ni hojas de calculo sueltas.",
  },
  {
    title: "Ferreterias",
    description: "Maneja catálogos grandes y variados con categorías, SKU y stock mínimo por producto.",
  },
  {
    title: "Almacenes y distribuidoras",
    description: "Lleva el control de entradas, salidas y ventas con reportes claros para tomar decisiones.",
  },
];

export interface FaqItem {
  question: string;
  answer: string;
}

// Preguntas frecuentes: honestas sobre el estado actual del producto. No
// prometer funcionalidad que todavia no existe (ej. modo sin conexion, ver
// docs/mejoras/04-offline-first-pwa.md).
export const FAQS: FaqItem[] = [
  {
    question: "¿Cuánto cuesta el sistema?",
    answer:
      "El precio depende del tamaño de tu negocio. Escríbenos por WhatsApp y te damos una cotización en minutos. Todos los planes incluyen una prueba gratuita.",
  },
  {
    question: "¿Cuánto tiempo toma empezar a usarlo?",
    answer:
      "Puedes crear tu cuenta y empezar a cargar productos el mismo día. Si tienes un catálogo grande, la importación por CSV lo hace más rápido.",
  },
  {
    question: "¿Funciona sin conexión a internet?",
    answer:
      "Hoy la plataforma funciona con conexión a internet estable. Estamos trabajando en soporte para ventas sin conexión, pensado para negocios con internet inestable.",
  },
  {
    question: "¿Puedo migrar mis productos actuales?",
    answer:
      "Sí. Puedes importar tu catálogo completo desde un archivo CSV en la sección de productos, sin cargar cada producto manualmente.",
  },
  {
    question: "¿Qué tan segura está mi información?",
    answer:
      "Cada tienda tiene su información completamente separada de las demás. El acceso requiere inicio de sesión y los datos se respaldan en una base de datos administrada.",
  },
  {
    question: "¿Ofrecen soporte si tengo problemas?",
    answer: "Sí, puedes escribirnos directamente por WhatsApp y te ayudamos a resolver cualquier duda o problema.",
  },
];

// ---------------------------------------------------------------------------
// Landing "boleta de mercado". Textos cortos para la portada; el detalle de
// cada funcion vive en FEATURES (pagina /funcionalidades).
// ---------------------------------------------------------------------------

/** Color de sticker: amarillo, acento (naranja) o papel blanco. */
export type StickerTone = "sun" | "accent" | "white";

export interface LandingFeature {
  number: string;
  tone: StickerTone;
  title: string;
  description: string;
}

export const LANDING_FEATURES: LandingFeature[] = [
  { number: "01", tone: "sun", title: "Control de inventario", description: "Productos, categorías, stock mínimo y alertas antes de quedarte sin nada." },
  { number: "02", tone: "accent", title: "Punto de venta", description: "Vende rápido desde el mostrador; el stock se descuenta solo." },
  { number: "03", tone: "sun", title: "Ventas y reportes", description: "Historial de ventas, ingresos y movimientos de stock, día por día." },
  { number: "04", tone: "accent", title: "Cierre de caja", description: "Efectivo esperado vs. contado, para detectar diferencias a tiempo." },
  { number: "05", tone: "accent", title: "Etiquetas y QR", description: "Imprime etiquetas con QR por producto y cobra más rápido." },
  { number: "06", tone: "sun", title: "Importación CSV", description: "Tu catálogo completo desde una planilla, en minutos." },
  { number: "07", tone: "accent", title: "Roles y permisos", description: "Dueño y cajero, cada uno ve solo lo que necesita." },
  { number: "08", tone: "sun", title: "Tipo de cambio", description: "Oficial BCB y paralelo, para precios en bolivianos y dólares." },
];

export interface LandingStep {
  number: string;
  tone: StickerTone;
  title: string;
  description: string;
}

export const LANDING_STEPS: LandingStep[] = [
  { number: "1", tone: "sun", title: "Crea tu cuenta", description: "Solo necesitas tu correo. Sin tarjeta de crédito." },
  { number: "2", tone: "accent", title: "Sube tus productos", description: "Importa tu planilla CSV o cárgalos a mano." },
  { number: "3", tone: "white", title: "Vende y cierra caja", description: "Cada venta registrada, cada caja cuadrada." },
];

export interface LandingSegment {
  number: string;
  tone: StickerTone;
  /** Inclinacion de la tarjeta, en grados. */
  tilt: number;
  title: string;
  description: string;
}

export const LANDING_SEGMENTS: LandingSegment[] = [
  {
    number: "01",
    tone: "sun",
    tilt: -1.5,
    title: "Tiendas y minimarkets",
    description: "Decenas o cientos de productos, sin depender de cuadernos ni hojas de cálculo sueltas.",
  },
  {
    number: "02",
    tone: "white",
    tilt: 1,
    title: "Ferreterías",
    description: "Catálogos grandes y variados, con categorías, SKU y stock mínimo por producto.",
  },
  {
    number: "03",
    tone: "accent",
    tilt: -1,
    title: "Almacenes y distribuidoras",
    description: "Entradas, salidas y ventas con reportes claros para decidir qué reponer.",
  },
];

export const LANDING_TICKER = [
  "Stock bajo: cemento 50 kg",
  "Venta registrada",
  "Caja abierta",
  "Etiqueta QR impresa",
  "Catálogo importado desde CSV",
  "Tipo de cambio actualizado",
  "Cierre de caja OK",
];

export const TRIAL_DAYS = 30;
