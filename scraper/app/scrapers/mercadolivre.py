from selenium.webdriver.common.by import By
from .base import BaseScraper


class MercadoLivreScraper(BaseScraper):
    store_name = "Mercado Livre"

    def extract(self, url: str) -> dict | None:
        self.browser.get(url)
        
        price = self.browser.find_element(By.XPATH, '//span[@andes-money-amount__fraction]').text
        price_frac = self.browser.find_element(By.XPATH, '//span[@andes-money-amount__cents"]').text

        return {
            "price": price + "," + price_frac,  # Example: "1299,90"
        }
