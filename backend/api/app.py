import os

from flask import Flask
from flask_cors import CORS

from api.db import ensure_schema
from api.routes.analytics import analytics_bp
from api.routes.products import products_bp
from api.routes.scraper import scraper_bp
from api.routes.stores import stores_bp
from api.routes.urls import urls_bp


def create_app(*, bootstrap_schema=True):
    app = Flask(__name__)
    CORS(app, origins=os.getenv("CORS_ORIGIN", "http://localhost:5173"))
    app.config['MAX_CONTENT_LENGTH'] = 1 * 1024 * 1024  # 1 MB max request body

    if bootstrap_schema:
        ensure_schema()

    app.register_blueprint(products_bp)
    app.register_blueprint(urls_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(stores_bp)
    app.register_blueprint(scraper_bp)

    return app


app = create_app(bootstrap_schema=os.getenv("API_BOOTSTRAP_SCHEMA", "1") == "1")


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
