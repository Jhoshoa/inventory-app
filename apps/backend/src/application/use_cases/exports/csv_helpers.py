from datetime import datetime, timezone, timedelta
import csv
from io import StringIO


def validate_export_range(from_date: datetime, to_date: datetime) -> None:
    if from_date > to_date:
        raise ValueError("La fecha inicial no puede ser mayor a la fecha final")
    if to_date - from_date > timedelta(days=90):
        raise ValueError("El rango maximo es 90 dias")


def default_from_to(from_date: datetime | None, to_date: datetime | None) -> tuple[datetime, datetime]:
    end = to_date or datetime.now(timezone.utc)
    start = from_date or (end - timedelta(days=7))
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    validate_export_range(start, end)
    return start, end


def write_csv(headers: list[str], rows: list[dict]) -> str:
    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=headers, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow(row)
    return output.getvalue()
