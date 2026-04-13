from selenium.webdriver.common.by import By
from .base import BaseScraper


class AmericanasScraper(BaseScraper):
    store_name = "Americanas"

    def extract(self, url: str) -> dict | None:
        self.browser.get(url)

        # Americanas, Submarino and Shoptime share the same B2W platform.
        price = self.browser.find_element(By.CSS_SELECTOR, "[class*='ProductPrice_productPrice__']").text

        return {
            "price": price,  # Example: "R$ 1.299,00"
        }
