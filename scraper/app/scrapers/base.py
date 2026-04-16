from abc import ABC, abstractmethod
from datetime import datetime, timezone

from selenium.common.exceptions import JavascriptException, NoSuchElementException, StaleElementReferenceException
from selenium.webdriver.support.ui import WebDriverWait


class BaseScraper(ABC):
    store_name: str = ""

    def __init__(self, browser):
        self.browser = browser

    @abstractmethod
    def extract(self, url: str) -> dict | None:
        """Each store provides its own extraction logic."""
        pass

    def scrape(self, url: str) -> dict | None:
        raw = self.extract(url)
        if raw is None:
            return None

        # Normalize the shared payload once so every scraper returns the
        # same shape to the runner and database layer.
        return {
            "store": self.store_name,
            "price": self._parse_price(raw["price"]),
            "url": url,
            "scraped_at": datetime.now(timezone.utc).isoformat(),
        }

    def wait_for_document_ready(self, timeout: int = 60):
        """Wait until the page signals the DOM is fully loaded."""

        def _is_ready(driver):
            try:
                return driver.execute_script("return document.readyState") == "complete"
            except JavascriptException:
                return False

        return WebDriverWait(self.browser, timeout, poll_frequency=0.25).until(_is_ready)

    def wait_for_non_empty_text(self, by, selector: str, *, timeout: int = 60) -> str:
        """
        Wait until an element exists and exposes non-empty text.

        `.text` can stay empty for hydrated pages during initial render, so we
        also fall back to `textContent` when needed.
        """

        def _resolve(_driver):
            try:
                element = self.browser.find_element(by, selector)
            except (NoSuchElementException, StaleElementReferenceException):
                return False

            text = (element.text or "").strip()
            if not text:
                text = (element.get_attribute("textContent") or "").strip()

            return text or False

        return WebDriverWait(
            self.browser,
            timeout,
            poll_frequency=0.25,
            ignored_exceptions=(NoSuchElementException, StaleElementReferenceException),
        ).until(_resolve)

    @staticmethod
    def _parse_price(raw: str) -> float:
        """Convert values like 'R$ 1.299,90' or '1299.90' to 1299.90."""
        cleaned = raw.replace("R$", "").strip()
        if "," in cleaned:
            # Handle the Brazilian number format before converting to float.
            cleaned = cleaned.replace(".", "").replace(",", ".")
        return float(''.join(c for c in cleaned if c.isdigit() or c == '.'))
