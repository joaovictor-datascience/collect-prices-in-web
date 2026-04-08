from selenium.webdriver.common.by import By
from .base import BaseScraper


class KabumScraper(BaseScraper):
    store_name = "Kabum"

    def extract(self, url: str) -> dict | None:
        self.browser.get(url)

        name  = self.browser.find_element(By.CSS_SELECTOR, ".col-span-4 h1").text
        price = self.browser.find_element(By.CLASS_NAME, "text-4xl").text

        return {
            "name":  name,
            "price": price,  # Example: "R$ 1.299,90" parsed later by _parse_price.
        }
