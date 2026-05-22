from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


@dataclass(frozen=True)
class BusinessDateRange:
    from_date: date
    to_date: date
    start_at_utc: datetime
    end_at_utc: datetime
    timezone: str


class BusinessDateRangeService:
    MAX_RANGE_DAYS = 90

    def today(self, timezone_name: str, *, first_business_date: date | None = None) -> BusinessDateRange:
        current_date = datetime.now(self._zone(timezone_name)).date()
        return self.custom(current_date, current_date, timezone_name, first_business_date=first_business_date)

    def month(self, timezone_name: str, *, first_business_date: date | None = None) -> BusinessDateRange:
        current_date = datetime.now(self._zone(timezone_name)).date()
        first_day = current_date.replace(day=1)
        next_month = (first_day.replace(day=28) + timedelta(days=4)).replace(day=1)
        last_day = next_month - timedelta(days=1)
        if first_business_date is not None and first_business_date > first_day:
            first_day = first_business_date
        return self.custom(first_day, last_day, timezone_name, first_business_date=first_business_date)

    def custom(
        self,
        from_date: date,
        to_date: date,
        timezone_name: str,
        *,
        first_business_date: date | None = None,
        clamp_to_first_business_date: bool = False,
    ) -> BusinessDateRange:
        if from_date > to_date:
            raise ValueError("La fecha inicial no puede ser posterior a la fecha final")
        if first_business_date is not None and from_date < first_business_date:
            if clamp_to_first_business_date and to_date >= first_business_date:
                from_date = first_business_date
            else:
                raise ValueError("La fecha consultada es anterior a la apertura operativa de la tienda")
        if (to_date - from_date).days > self.MAX_RANGE_DAYS:
            raise ValueError("El rango maximo es 90 dias")

        zone = self._zone(timezone_name)
        start_local = datetime.combine(from_date, time.min, tzinfo=zone)
        end_local_exclusive = datetime.combine(to_date + timedelta(days=1), time.min, tzinfo=zone)
        return BusinessDateRange(
            from_date=from_date,
            to_date=to_date,
            start_at_utc=start_local.astimezone(UTC),
            end_at_utc=end_local_exclusive.astimezone(UTC),
            timezone=timezone_name,
        )

    def _zone(self, timezone_name: str) -> ZoneInfo:
        try:
            return ZoneInfo(timezone_name)
        except ZoneInfoNotFoundError:
            return ZoneInfo("America/La_Paz")
