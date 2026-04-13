from selenium.webdriver.common.by import By
from .base import BaseScraper


class SamsungScraper(BaseScraper):
    store_name = "Samsung"

    def extract(self, url: str) -> dict | None:
        self.browser.get(url)

        price = self.browser.find_element(
            By.CSS_SELECTOR, ".price-sales-standard"
        ).text

        return {
            "price": price,  # Example: "R$ 1.299,00"
        }
