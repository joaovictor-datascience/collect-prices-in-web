import os

from flask import Blueprint, jsonify, request

from api.db import get_db_connection

analytics_bp = Blueprint('analytics', __name__)
ANALYTICS_TIMEZONE = os.getenv("ANALYTICS_TIMEZONE", os.getenv("TZ", "America/Sao_Paulo"))


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
    """Fetch deduplicated price history for a product.

    For each (store, day) group:
    - If all readings have the same price, keep only the last one.
    - If prices differ, keep only the readings with distinct prices
      (last occurrence of each price within the day).
    """
    cur.execute(
        f"""
        WITH filtered_history AS (
            SELECT ph.id, ph.price, ph.url, ph.scraped_at, ph.store_id, s.name AS store_name,
                   timezone(%s, ph.scraped_at)::date AS local_day
              FROM price_history ph
              JOIN stores s ON ph.store_id = s.id
             WHERE ph.product_id = %s {date_filter}
        ),
        day_groups AS (
            SELECT fh.store_id,
                   fh.local_day AS day,
                   COUNT(DISTINCT fh.price) AS distinct_prices
              FROM filtered_history fh
             GROUP BY fh.store_id, fh.local_day
        ),
        daily AS (
            SELECT fh.id, fh.price, fh.url, fh.scraped_at, fh.store_name,
                   dg.distinct_prices,
                   ROW_NUMBER() OVER (
                       PARTITION BY fh.store_id, fh.local_day, fh.price
                       ORDER BY fh.scraped_at DESC
                   ) AS rn_price,
                   ROW_NUMBER() OVER (
                       PARTITION BY fh.store_id, fh.local_day
                       ORDER BY fh.scraped_at DESC
                   ) AS rn_day
              FROM filtered_history fh
              JOIN day_groups dg
                ON dg.store_id = fh.store_id
               AND dg.day = fh.local_day
        )
        SELECT id, price, url, scraped_at, store_name
          FROM daily
         WHERE (distinct_prices = 1 AND rn_day = 1)
            OR (distinct_prices > 1  AND rn_price = 1)
         ORDER BY scraped_at ASC
        """,
        tuple([ANALYTICS_TIMEZONE, product_id] + filter_params),
    )
    return cur.fetchall()


def _fetch_store_stats(cur, product_id, date_filter, filter_params):
    """Compute per-store stats over deduplicated readings."""
    base_params = [product_id] + filter_params
    cur.execute(
        f"""
        WITH filtered_history AS (
            SELECT ph.id, ph.price, ph.url, ph.scraped_at, ph.store_id, s.name AS store_name,
                   timezone(%s, ph.scraped_at)::date AS local_day
              FROM price_history ph
              JOIN stores s ON ph.store_id = s.id
             WHERE ph.product_id = %s {date_filter}
        ),
        day_groups AS (
            SELECT fh.store_id,
                   fh.local_day AS day,
                   COUNT(DISTINCT fh.price) AS distinct_prices
              FROM filtered_history fh
             GROUP BY fh.store_id, fh.local_day
        ),
        daily AS (
            SELECT fh.id, fh.price, fh.url, fh.scraped_at,
                   fh.store_id, fh.store_name,
                   dg.distinct_prices,
                   ROW_NUMBER() OVER (
                       PARTITION BY fh.store_id, fh.local_day, fh.price
                       ORDER BY fh.scraped_at DESC
                   ) AS rn_price,
                   ROW_NUMBER() OVER (
                       PARTITION BY fh.store_id, fh.local_day
                       ORDER BY fh.scraped_at DESC
                   ) AS rn_day
              FROM filtered_history fh
              JOIN day_groups dg
                ON dg.store_id = fh.store_id
               AND dg.day = fh.local_day
        ),
        deduped AS (
            SELECT id, price, url, scraped_at, store_id, store_name
              FROM daily
             WHERE (distinct_prices = 1 AND rn_day = 1)
                OR (distinct_prices > 1  AND rn_price = 1)
        ),
        store_agg AS (
            SELECT store_name,
                   MIN(price) AS min_price,
                   MAX(price) AS max_price,
                   AVG(price) AS avg_price,
                   COUNT(*)   AS samples
              FROM deduped
             GROUP BY store_name
        ),
        latest AS (
            SELECT DISTINCT ON (store_name)
                   store_name,
                   price      AS latest_price,
                   url        AS latest_url,
                   scraped_at AS latest_scraped_at
              FROM deduped
             ORDER BY store_name, scraped_at DESC
        )
        SELECT sa.store_name, sa.min_price, sa.max_price, sa.avg_price, sa.samples,
               l.latest_price, l.latest_url, l.latest_scraped_at
          FROM store_agg sa
          JOIN latest l ON sa.store_name = l.store_name
         ORDER BY sa.store_name
        """,
        tuple([ANALYTICS_TIMEZONE] + base_params),
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
