from selenium.webdriver.common.by import By
from .base import BaseScraper


class AmazonScraper(BaseScraper):
    store_name = "Amazon"

    def extract(self, url: str) -> dict | None:
        self.browser.get(url)

        price = self.browser.find_element(By.CLASS_NAME, "a-price-whole").text
        price_frac  = self.browser.find_element(By.CLASS_NAME, "a-price-fraction").text

        return {
            "price": price + "," + price_frac,  # Example: "1299,90"
        }
