from app.database import create_tables, get_products_to_scrape, save_result
from app.runner import run

# Ensure the tables and compatibility migrations exist before scraping starts.
create_tables()

summary = run(
    get_products_to_scrape,
    save_result=save_result,
)

print(f"\nTotal saved: {summary.saved_results} records")
