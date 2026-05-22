from decimal import Decimal

from src.application.dto.store_day_dto import StoreDayCloseReportDTO, StoreDayClosingPreviewDTO
from src.domain.entities.store_business_day import StoreBusinessDay


def closing_preview_from_summary(
    business_day: StoreBusinessDay,
    summary: dict,
    cash_movement_summary: dict | None = None,
) -> StoreDayClosingPreviewDTO:
    opening_cash = business_day.opening_cash_amount or Decimal("0")
    cash_sales = summary["cash_sales_total"]
    cash_movement_summary = cash_movement_summary or {}
    cash_movements_in = cash_movement_summary.get("cash_movements_in_total", Decimal("0"))
    cash_movements_out = cash_movement_summary.get("cash_movements_out_total", Decimal("0"))
    return StoreDayClosingPreviewDTO(
        business_day_id=business_day.id,
        business_date=business_day.business_date,
        status=business_day.status,
        opening_cash_amount=opening_cash,
        sales_total=summary["total_sales"],
        sales_count=summary["sales_count"],
        voided_sales_count=summary["voided_sales_count"],
        items_count=summary["items_count"],
        cash_sales_total=cash_sales,
        qr_sales_total=summary["qr_sales_total"],
        transfer_sales_total=summary["transfer_sales_total"],
        card_sales_total=summary["card_sales_total"],
        cash_movements_in_total=cash_movements_in,
        cash_movements_out_total=cash_movements_out,
        cash_movements_count=cash_movement_summary.get("cash_movements_count", 0),
        expected_cash_amount=opening_cash + cash_sales + cash_movements_in - cash_movements_out,
    )


def close_report_from_business_day(business_day: StoreBusinessDay) -> StoreDayCloseReportDTO:
    if business_day.closed_at is None or business_day.closed_by_user_id is None or business_day.closing_snapshot_at is None:
        raise ValueError("El cierre aun no tiene snapshot disponible")
    return StoreDayCloseReportDTO(
        business_day_id=business_day.id,
        business_date=business_day.business_date,
        status=business_day.status,
        opening_cash_amount=business_day.opening_cash_amount or Decimal("0"),
        sales_total=business_day.closing_sales_total or business_day.sales_total or Decimal("0"),
        sales_count=business_day.closing_sales_count or business_day.sales_count or 0,
        voided_sales_count=business_day.closing_voided_sales_count or business_day.voided_sales_count or 0,
        items_count=business_day.closing_items_count or 0,
        cash_sales_total=business_day.closing_cash_sales_total or Decimal("0"),
        qr_sales_total=business_day.closing_qr_sales_total or Decimal("0"),
        transfer_sales_total=business_day.closing_transfer_sales_total or Decimal("0"),
        card_sales_total=business_day.closing_card_sales_total or Decimal("0"),
        cash_movements_in_total=business_day.closing_cash_movements_in_total or Decimal("0"),
        cash_movements_out_total=business_day.closing_cash_movements_out_total or Decimal("0"),
        cash_movements_count=business_day.closing_cash_movements_count or 0,
        expected_cash_amount=business_day.expected_cash_amount or Decimal("0"),
        closed_at=business_day.closed_at,
        closed_by_user_id=business_day.closed_by_user_id,
        counted_cash_amount=business_day.counted_cash_amount,
        cash_difference_amount=business_day.cash_difference_amount,
        closing_note=business_day.closing_note,
        closing_snapshot_at=business_day.closing_snapshot_at,
    )
