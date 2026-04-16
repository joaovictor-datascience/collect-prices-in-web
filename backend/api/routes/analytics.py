from flask import Blueprint, jsonify, request

from api.db import get_db_connection

analytics_bp = Blueprint('analytics', __name__)


def _empty_analytics_payload(store_stats=None):
    return {
        "filteredData": [],
        "overallStats": {
            "current": None,
            "currentStore": None,
            "min": None,
            "minStore": None,
            "max": None,
            "maxStore": None,
            "avg": None,
        },
        "storeStats": store_stats or [],
    }


def _parse_date_filter(days):
    """Return a SQL fragment and extra params for the date range filter."""
    if days == 'all':
        return "", []
    try:
        return "AND ph.scraped_at >= NOW() - INTERVAL '%s days'", [int(days)]
    except ValueError:
        return "", []


def _fetch_price_history(cur, product_id, date_filter, filter_params):
    """Fetch chronological price history for a product."""
    cur.execute(
        f"""
        SELECT ph.id, ph.price, ph.url, ph.scraped_at, s.name AS store_name
          FROM price_history ph
          JOIN stores s ON ph.store_id = s.id
         WHERE ph.product_id = %s {date_filter}
         ORDER BY ph.scraped_at ASC
        """,
        tuple([product_id] + filter_params),
    )
    return cur.fetchall()


def _fetch_store_stats(cur, product_id, date_filter, filter_params):
    """Compute per-store stats using SQL aggregation instead of Python loops."""
    base_params = [product_id] + filter_params
    cur.execute(
        f"""
        WITH store_agg AS (
            SELECT s.name AS store_name,
                   MIN(ph.price) AS min_price,
                   MAX(ph.price) AS max_price,
                   AVG(ph.price) AS avg_price,
                   COUNT(*)      AS samples
              FROM price_history ph
              JOIN stores s ON ph.store_id = s.id
             WHERE ph.product_id = %s {date_filter}
             GROUP BY s.name
        ),
        latest AS (
            SELECT DISTINCT ON (s.name)
                   s.name        AS store_name,
                   ph.price      AS latest_price,
                   ph.url        AS latest_url,
                   ph.scraped_at AS latest_scraped_at
              FROM price_history ph
              JOIN stores s ON ph.store_id = s.id
             WHERE ph.product_id = %s {date_filter}
             ORDER BY s.name, ph.scraped_at DESC
        )
        SELECT sa.store_name, sa.min_price, sa.max_price, sa.avg_price, sa.samples,
               l.latest_price, l.latest_url, l.latest_scraped_at
          FROM store_agg sa
          JOIN latest l ON sa.store_name = l.store_name
         ORDER BY sa.store_name
        """,
        tuple(base_params + base_params),
    )
    return [
        {
            "storeName": row["store_name"],
            "min": float(row["min_price"]),
            "max": float(row["max_price"]),
            "avg": float(row["avg_price"]),
            "samples": row["samples"],
            "latestPrice": float(row["latest_price"]),
            "latestUrl": row["latest_url"],
            "latestScrapedAt": row["latest_scraped_at"],
        }
        for row in cur.fetchall()
    ]


def _build_overall_stats(history_for_stats):
    """Compute overall min/max/avg/current from a pre-filtered price history."""
    prices = [float(item['price']) for item in history_for_stats]
    min_idx = prices.index(min(prices))
    max_idx = prices.index(max(prices))

    # Group by store to find the best (lowest) current price.
    stores = {}
    for item in history_for_stats:
        store = item['store_name'] or 'Loja'
        stores.setdefault(store, []).append(item)

    latest_by_store = [
        {"store": store, "price": float(items[-1]['price'])}
        for store, items in stores.items()
    ]
    best_latest = min(latest_by_store, key=lambda x: x["price"])

    return {
        "current": best_latest["price"],
        "currentStore": best_latest["store"],
        "min": prices[min_idx],
        "minStore": history_for_stats[min_idx]['store_name'],
        "max": prices[max_idx],
        "maxStore": history_for_stats[max_idx]['store_name'],
        "avg": sum(prices) / len(prices),
    }


@analytics_bp.route('/api/analytics/<int:product_id>', methods=['GET'])
def get_product_analytics(product_id):
    """Return the price history, overall stats, and store stats for a product."""
    try:
        days = request.args.get('days', '30')
        store_filter = request.args.get('store', 'all')
        date_filter, filter_params = _parse_date_filter(days)

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                history = _fetch_price_history(cur, product_id, date_filter, filter_params)

                if not history:
                    return jsonify(_empty_analytics_payload())

                store_stats = _fetch_store_stats(cur, product_id, date_filter, filter_params)

        # Apply optional store filter for overall stats and chart data.
        if store_filter != 'all':
            history_for_stats = [item for item in history if item['store_name'] == store_filter]
        else:
            history_for_stats = history

        if not history_for_stats:
            return jsonify(_empty_analytics_payload(store_stats))

        overall_stats = _build_overall_stats(history_for_stats)

        return jsonify({
            "filteredData": history_for_stats,
            "overallStats": overall_stats,
            "storeStats": store_stats,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
