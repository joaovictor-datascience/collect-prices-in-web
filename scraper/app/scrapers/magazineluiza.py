from selenium.webdriver.common.by import By
from .base import BaseScraper


class MagazineLuizaScraper(BaseScraper):
    store_name = "Magazine Luiza"

    def extract(self, url: str) -> dict | None:
        self.browser.get(url)

        price = self.browser.find_element(By.XPATH, '//span[@data-testid="price-value-integer"]').text
        price_frac = self.browser.find_element(By.XPATH, '//span[@data-testid="price-value-split-cents-fraction"]').text

        return {
            "price": price + "," + price_frac,
        }
