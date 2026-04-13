import undetected_chromedriver as uc
import time
import random


from .scrapers.amazon import AmazonScraper
from .scrapers.americanas import AmericanasScraper
from .scrapers.carrefour import CarrefourScraper
from .scrapers.casasbahia import CasasBahiaScraper
from .scrapers.extra import ExtraScraper
from .scrapers.fastshop import FastShopScraper
from .scrapers.kabum import KabumScraper
from .scrapers.magazineluiza import MagazineLuizaScraper
from .scrapers.mercadolivre import MercadoLivreScraper
from .scrapers.netshoes import NetshoeScraper
from .scrapers.ponto import PontoScraper
from .scrapers.samsung import SamsungScraper

# Map each supported domain to its scraper implementation.
SCRAPERS = {
    "amazon.com.br": AmazonScraper,
    "americanas.com.br": AmericanasScraper,
    "casasbahia.com.br": CasasBahiaScraper,
    "carrefour.com.br": CarrefourScraper,
    "extra.com.br": ExtraScraper,
    "fastshop.com.br": FastShopScraper,
    "kabum.com.br": KabumScraper,
    "magazineluiza.com.br": MagazineLuizaScraper,
    "mercadolivre.com.br": MercadoLivreScraper,
    "netshoes.com.br": NetshoeScraper,
    "ponto.com.br": PontoScraper,
    "pontofrio.com.br": PontoScraper,
    "samsung.com.br": SamsungScraper,
    "samsung.com": SamsungScraper,
}


def get_scraper(url: str, browser):
    for domain, cls in SCRAPERS.items():
        if domain in url:
            return cls(browser)
    return None


def run(products: dict):
    # Reuse a single browser session so the scraping loop stays lightweight.
    options = uc.ChromeOptions()
    # options.add_argument("--headless=new")
    browser = uc.Chrome(options=options, version_main=146)
    browser.implicitly_wait(4)
    time.sleep(random.uniform(1, 3))

    results = []

    try:
        for product_name, urls in products.items():
            print(f"\nProduct: {product_name}")

            for url in urls:
                scraper = get_scraper(url, browser)

                if scraper is None:
                    print(f"  [!] Unsupported store: {url}")
                    continue

                result = scraper.scrape(url)

                if result is not None:
                    result["product_name"] = product_name
                    results.append(result)
                    print(f"  ✓ {result['store']} | BRL {result['price']:.2f}")

    finally:
        browser.quit()  # Always close the browser, even if scraping fails.

    return results
