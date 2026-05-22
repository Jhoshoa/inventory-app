from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


DEFAULT_STORE_TIMEZONE = "America/La_Paz"


def local_business_date(timezone_name: str | None):
    try:
        timezone = ZoneInfo(timezone_name or DEFAULT_STORE_TIMEZONE)
    except ZoneInfoNotFoundError:
        timezone = ZoneInfo(DEFAULT_STORE_TIMEZONE)
    return datetime.now(timezone).date()
