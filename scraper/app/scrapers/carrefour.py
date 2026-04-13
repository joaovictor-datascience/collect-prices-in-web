from selenium.webdriver.common.by import By
from .base import BaseScraper


class CarrefourScraper(BaseScraper):
    store_name = "Carrefour"

    def extract(self, url: str) -> dict | None:
        self.browser.get(url)

        price = self.browser.find_element(
            By.CSS_SELECTOR, ".valtech-carrefourbr-product-price-0-x-sellingPriceValue"
        ).text

        return {
            "price": price,  # Example: "R$ 1.299,00"
        }
