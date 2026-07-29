# Dockerfile — KPC Downtime Reduction Backend API
FROM python:3.13-slim

WORKDIR /app

# Prevent Python from writing .pyc files & buffer stdout
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Generate initial simulated data if missing
RUN python generate_data.py

EXPOSE 8000

# Run FastAPI backend service
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
