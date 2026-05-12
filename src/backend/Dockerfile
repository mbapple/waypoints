FROM python:3.12-slim

# Install system deps: pg_isready and friends
RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client bash \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first for better caching
COPY app/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy backend code (optional during development; typically overridden by volume mount)
COPY . /app

EXPOSE 3001

# Default command (overridden by docker-compose to run start.sh)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3001"]
