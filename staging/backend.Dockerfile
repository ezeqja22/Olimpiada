FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends build-essential libpq-dev curl && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt httpx
COPY backend /app/backend
COPY alembic /app/alembic
COPY alembic.ini /app/alembic.ini
COPY staging/bootstrap.py /app/staging/bootstrap.py
COPY staging/seed_demo.py /app/staging/seed_demo.py
COPY staging/smoke.py /app/staging/smoke.py
ENV PYTHONPATH=/app/backend
EXPOSE 8000
CMD ["uvicorn","main:app","--app-dir","backend","--host","0.0.0.0","--port","8000"]
