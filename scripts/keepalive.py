import os
import httpx
from datetime import date

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}


def main():
    today = str(date.today())
    rates = [
        {"date": today, "source": "bcb", "buy_price": 6.96, "sell_price": 6.96},
        {"date": today, "source": "paralelo", "buy_price": 9.20, "sell_price": 9.40},
        {"date": today, "source": "referencial", "buy_price": 8.10, "sell_price": 8.30},
    ]
    for rate in rates:
        resp = httpx.post(f"{SUPABASE_URL}/rest/v1/exchange_rates", headers=HEADERS, json=rate)
        print(f"{rate['source']}: {resp.status_code}")


if __name__ == "__main__":
    main()
