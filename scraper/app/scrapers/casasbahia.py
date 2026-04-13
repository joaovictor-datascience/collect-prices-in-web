from selenium.webdriver.common.by import By
from .base import BaseScraper


class CasasBahiaScraper(BaseScraper):
    store_name = "Casas Bahia"

    def extract(self, url: str) -> dict | None:
        self.browser.get(url)

        price = self.browser.find_element(By.XPATH, '//p[@data-testid="product-price-value"]/span[1]').text

        print(price)

        return {
            "price": price,  # Example: "R$ 1.299,00"
        }
