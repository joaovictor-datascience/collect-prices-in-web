from selenium.webdriver.common.by import By
from .base import BaseScraper


class FastShopScraper(BaseScraper):
    store_name = "Fast Shop"

    def extract(self, url: str) -> dict | None:
        self.browser.get(url)

        price = self.browser.find_element(By.CSS_SELECTOR, "[class*='OfferList_PriceFormat__']").text

        return {
            "price": price,  # Example: "R$ 1.299,00"
        }
