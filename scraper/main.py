from app.database import create_tables, get_products_to_scrape, save_result
from app.runner import run

# Ensure the tables and compatibility migrations exist before scraping starts.
create_tables()

products = get_products_to_scrape()

if not products:
    print("No active products were found in the database.")
    print("Use the API to register products and URLs.")
    exit(0)

print(f"Products found: {len(products)}")

results = run(products)

# Persist each collected price snapshot separately to keep the write path simple.
for result in results:
    save_result(result)

print(f"\nTotal saved: {len(results)} records")
