from selenium.webdriver.common.by import By
from .base import BaseScraper


class AmazonScraper(BaseScraper):
    store_name = "Amazon"

    def extract(self, url: str) -> dict | None:
        self.browser.get(url)

        name  = self.browser.find_element(By.ID, "productTitle").text
        whole = self.browser.find_element(By.CLASS_NAME, "a-price-whole").text
        frac  = self.browser.find_element(By.CLASS_NAME, "a-price-fraction").text

        return {
            "name":  name,
            "price": whole + "," + frac,  # Example: "1299,90"
        }
