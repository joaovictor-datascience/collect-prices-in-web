FROM python:3.11.13-slim-bookworm

WORKDIR /app
COPY requirements.txt .

# need pin, the scraper need this
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium=147.0.7727.101-1~deb12u1 \
    chromium-driver=147.0.7727.101-1~deb12u1 \
    fonts-liberation=1:1.07.4-11 \
    xvfb=2:21.1.7-3+deb12u11 \
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
