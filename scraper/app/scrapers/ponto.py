from selenium.webdriver.common.by import By
from .base import BaseScraper


class PontoScraper(BaseScraper):
    store_name = "Ponto"

    def extract(self, url: str) -> dict | None:
        self.browser.get(url)

        # Ponto shares the same platform as Casas Bahia.
        price = self.browser.find_element(
            By.CSS_SELECTOR, "[data-testid='price-value']"
        ).text

        return {
            "price": price,  # Example: "R$ 1.299,00"
        }
