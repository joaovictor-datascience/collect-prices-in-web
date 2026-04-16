FROM python:3.11-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# The build context in docker-compose.yml is the project root (context: .)
# so /app contains the full backend/ tree and api/app.py is at /app/api/app.py
ENV PYTHONPATH=/app

ENV HOME=/home/appuser
RUN adduser --disabled-password --gecos "" appuser
USER appuser

EXPOSE 5000
CMD ["python", "api/app.py"]
