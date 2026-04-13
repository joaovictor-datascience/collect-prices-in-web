from selenium.webdriver.common.by import By
from .base import BaseScraper


class ExtraScraper(BaseScraper):
    store_name = "Extra"

    def extract(self, url: str) -> dict | None:
        self.browser.get(url)

        # Extra shares the same platform as Casas Bahia.
        price = self.browser.find_element(By.XPATH, '//p[@data-testid="product-price-value"]/span[1]').text

        return {
            "price": price,  # Example: "R$ 1.299,00"
        }
