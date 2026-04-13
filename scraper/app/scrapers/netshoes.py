from selenium.webdriver.common.by import By
from .base import BaseScraper


class NetshoeScraper(BaseScraper):
    store_name = "Netshoes"

    def extract(self, url: str) -> dict | None:
        self.browser.get(url)

        price = self.browser.find_element(
            By.CSS_SELECTOR, ".final-price"
        ).text

        return {
            "price": price,  # Example: "R$ 299,99"
        }
