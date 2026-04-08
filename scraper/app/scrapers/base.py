from abc import ABC, abstractmethod
from datetime import datetime


class BaseScraper(ABC):
    store_name: str = ""

    def __init__(self, browser):
        self.browser = browser

    @abstractmethod
    def extract(self, url: str) -> dict | None:
        """Each store provides its own extraction logic."""
        pass

    def scrape(self, url: str) -> dict | None:
        try:
            raw = self.extract(url)
            if raw is None:
                return None

            # Normalize the shared payload once so every scraper returns the
            # same shape to the runner and database layer.
            return {
                "store":       self.store_name,
                "price":       self._parse_price(raw["price"]),
                "name":        raw["name"].strip(),
                "url":         url,
                "scraped_at":  datetime.now().isoformat(),
            }
        except Exception as e:
            print(f"[{self.store_name}] Error while scraping {url}: {e}")
            return None

    @staticmethod
    def _parse_price(raw: str) -> float:
        """Convert values like 'R$ 1.299,90' or '1299.90' to 1299.90."""
        cleaned = raw.replace("R$", "").strip()
        if "," in cleaned:
            # Handle the Brazilian number format before converting to float.
            cleaned = cleaned.replace(".", "").replace(",", ".")
        return float(''.join(c for c in cleaned if c.isdigit() or c == '.'))
