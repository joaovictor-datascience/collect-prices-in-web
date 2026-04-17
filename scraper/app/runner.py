import os
import random
import time
from dataclasses import dataclass

import undetected_chromedriver as uc

from .scrapers.amazon import AmazonScraper
from .scrapers.americanas import AmericanasScraper
from .scrapers.carrefour import CarrefourScraper
from .scrapers.casasbahia import CasasBahiaScraper
from .scrapers.casadascercas import CasaDasCercasScraper
from .scrapers.extra import ExtraScraper
from .scrapers.fastshop import FastShopScraper
from .scrapers.kabum import KabumScraper
from .scrapers.magazineluiza import MagazineLuizaScraper
from .scrapers.mercadolivre import MercadoLivreScraper
from .scrapers.netshoes import NetshoeScraper
from .scrapers.ponto import PontoScraper
from .scrapers.samsung import SamsungScraper
from shared.scraper_jobs import COMPLETED, COMPLETED_WITH_ERRORS

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
    "casadascercas.com.br": CasaDasCercasScraper,
}


def get_scraper(url: str, browser):
    for domain, cls in SCRAPERS.items():
        if domain in url:
            return cls(browser)
    return None


@dataclass
class RunSummary:
    total_products: int = 0
    total_urls: int = 0
    successful_urls: int = 0
    failed_urls: int = 0
    unsupported_urls: int = 0
    saved_results: int = 0

    def as_dict(self):
        return {
            "total_products": self.total_products,
            "total_urls": self.total_urls,
            "successful_urls": self.successful_urls,
            "failed_urls": self.failed_urls,
            "unsupported_urls": self.unsupported_urls,
            "saved_results": self.saved_results,
        }

    def final_status(self):
        if self.failed_urls or self.unsupported_urls:
            return COMPLETED_WITH_ERRORS
        return COMPLETED


def _create_browser():
    # Reuse a single browser session so the scraping loop stays lightweight.
    options = uc.ChromeOptions()
    options.add_argument("--window-size=1440,1200")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--no-sandbox")
    options.page_load_strategy = os.getenv("SCRAPER_PAGE_LOAD_STRATEGY", "eager")

    if not (os.getenv("DISPLAY") or os.getenv("WAYLAND_DISPLAY")):
        raise RuntimeError(
            "Scraper requires a graphical display. "
            "Expose DISPLAY/WAYLAND_DISPLAY to the container or start Xvfb before launch."
        )

    options.add_argument("--start-maximized")

    chrome_major_version = int(os.getenv("SCRAPER_CHROME_MAJOR_VERSION", "146"))
    browser = uc.Chrome(options=options, version_main=chrome_major_version)
    browser.set_page_load_timeout(int(os.getenv("SCRAPER_PAGE_LOAD_TIMEOUT_SECONDS", "30")))
    browser.implicitly_wait(int(os.getenv("SCRAPER_IMPLICIT_WAIT_SECONDS", "4")))
    time.sleep(
        random.uniform(
            float(os.getenv("SCRAPER_STARTUP_DELAY_MIN_SECONDS", "3")),
            float(os.getenv("SCRAPER_STARTUP_DELAY_MAX_SECONDS", "6")),
        )
    )
    return browser


def _default_log_event(
    *,
    level,
    event_type,
    message,
    product_name=None,
    url=None,
    store_name=None,
    details=None,
):
    context = []
    if product_name:
        context.append(f"product={product_name}")
    if store_name:
        context.append(f"store={store_name}")
    if url:
        context.append(f"url={url}")

    suffix = f" ({' | '.join(context)})" if context else ""
    print(f"[{level.upper()}] {event_type}: {message}{suffix}")
    if details:
        print(f"  details={details}")


def _resolve_products(products_or_loader):
    if callable(products_or_loader):
        return products_or_loader()
    return products_or_loader


def _build_error_details(exc, *, url=None, store_name=None, include_traceback=False):
    details = {
        "exception_class": exc.__class__.__name__,
        "exception_message": str(exc),
    }
    if url:
        details["url"] = url
    if store_name:
        details["store_name"] = store_name
    if include_traceback:
        import traceback

        details["traceback"] = traceback.format_exc()
    return details


def run(
    products_or_loader,
    *,
    summary=None,
    log_event=None,
    sync_summary=None,
    save_result=None,
    browser_factory=None,
):
    summary = summary or RunSummary()
    log_event = log_event or _default_log_event
    sync_summary = sync_summary or (lambda _summary: None)
    save_result = save_result or (lambda _result: None)
    browser_factory = browser_factory or _create_browser

    log_event(
        level="info",
        event_type="job_started",
        message="Scraper job started",
        details=summary.as_dict(),
    )

    products = _resolve_products(products_or_loader)
    summary.total_products = len(products)
    summary.total_urls = sum(len(urls) for urls in products.values())

    log_event(
        level="info",
        event_type="products_loaded",
        message="Loaded products for scraping",
        details=summary.as_dict(),
    )
    sync_summary(summary)

    browser = browser_factory()

    try:
        for product_name, urls in products.items():
            log_event(
                level="info",
                event_type="product_started",
                product_name=product_name,
                message="Starting product scrape",
                details={"url_count": len(urls)},
            )

            for url in urls:
                scraper = get_scraper(url, browser)
                store_name = scraper.store_name if scraper is not None else None

                log_event(
                    level="info",
                    event_type="url_started",
                    product_name=product_name,
                    url=url,
                    store_name=store_name,
                    message="Scraping URL",
                )

                if scraper is None:
                    summary.unsupported_urls += 1
                    log_event(
                        level="warning",
                        event_type="url_unsupported",
                        product_name=product_name,
                        url=url,
                        message="Unsupported store URL",
                    )
                    sync_summary(summary)
                    continue

                try:
                    result = scraper.scrape(url)
                except Exception as exc:
                    summary.failed_urls += 1
                    log_event(
                        level="error",
                        event_type="url_failed",
                        product_name=product_name,
                        url=url,
                        store_name=store_name,
                        message="Scraping URL failed",
                        details=_build_error_details(exc, url=url, store_name=store_name),
                    )
                    sync_summary(summary)
                    continue

                if result is None:
                    summary.failed_urls += 1
                    log_event(
                        level="warning",
                        event_type="url_no_result",
                        product_name=product_name,
                        url=url,
                        store_name=store_name,
                        message="Scraper returned no usable result",
                    )
                    sync_summary(summary)
                    continue

                result["product_name"] = product_name
                summary.successful_urls += 1
                log_event(
                    level="info",
                    event_type="url_succeeded",
                    product_name=product_name,
                    url=url,
                    store_name=result["store"],
                    message="URL scraped successfully",
                    details={"price": result["price"]},
                )
                sync_summary(summary)

                save_result(result)
                summary.saved_results += 1
                log_event(
                    level="info",
                    event_type="result_saved",
                    product_name=product_name,
                    url=url,
                    store_name=result["store"],
                    message="Result saved to price history",
                    details={"price": result["price"]},
                )
                sync_summary(summary)
    finally:
        browser.quit()

    final_status = summary.final_status()
    final_event_type = "job_completed" if final_status == COMPLETED else "job_completed_with_errors"
    final_level = "info" if final_status == COMPLETED else "warning"
    final_message = (
        "Scraper job completed successfully"
        if final_status == COMPLETED
        else "Scraper job completed with recoverable errors"
    )
    log_event(
        level=final_level,
        event_type=final_event_type,
        message=final_message,
        details=summary.as_dict(),
    )
    sync_summary(summary)

    return summary
