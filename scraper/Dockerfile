FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .

RUN apt-get update && apt-get install -y \
    chromium \
    chromium-driver \
    fonts-liberation \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir -r requirements.txt
COPY scraper/ ./scraper/
COPY shared/ ./shared/
COPY scraper/docker-entrypoint.sh /usr/local/bin/scraper-entrypoint.sh
ENV PYTHONPATH=/app
ENV HOME=/home/appuser
RUN adduser --disabled-password --gecos "" appuser
RUN chmod +x /usr/local/bin/scraper-entrypoint.sh
USER appuser
ENTRYPOINT ["scraper-entrypoint.sh"]
CMD ["python", "main.py"]
