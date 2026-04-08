import undetected_chromedriver as uc

from .scrapers.amazon import AmazonScraper
from .scrapers.kabum import KabumScraper


# Map each supported domain to its scraper implementation.
SCRAPERS = {
    "www.amazon.com.br": AmazonScraper,
    "www.kabum.com.br":  KabumScraper,
}


def get_scraper(url: str, browser):
    for domain, cls in SCRAPERS.items():
        if domain in url:
            return cls(browser)
    return None


def run(products: dict):
    # Reuse a single browser session so the scraping loop stays lightweight.
    options = uc.ChromeOptions()
    options.add_argument("--headless=new")
    browser = uc.Chrome(options=options, version_main=146)

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
                    print(f"  ✓ {result['store']} | BRL {result['price']:.2f} | {result['name'][:50]}")

    finally:
        browser.quit()  # Always close the browser, even if scraping fails.

    return results
