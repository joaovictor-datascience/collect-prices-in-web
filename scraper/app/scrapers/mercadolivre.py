from selenium.webdriver.common.by import By

from .base import BaseScraper


class MercadoLivreScraper(BaseScraper):
    store_name = "Mercado Livre"

    def extract(self, url: str) -> dict | None:
        self.browser.get(url)
        self.wait_for_document_ready(timeout=20)

        price = self.wait_for_non_empty_text(
            By.CSS_SELECTOR,
            ".ui-pdp-price__second-line .andes-money-amount__fraction",
            timeout=20,
        )
        price_frac = self.wait_for_non_empty_text(
            By.CSS_SELECTOR,
            ".ui-pdp-price__second-line .andes-money-amount__cents",
            timeout=20,
        )

        return {
            "price": price + "," + price_frac,  # Example: "1299,90"
        }
