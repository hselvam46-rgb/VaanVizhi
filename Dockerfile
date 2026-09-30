# ==============================================================================
# VaanVizhi - 24/7 Cloud Docker Deployment Image
# Compatible with: Hugging Face Spaces, Render, Railway, Fly.io, Koyeb, AWS, GCP
# ==============================================================================

FROM python:3.11-slim

# Prevent python buffering and bytecode generation
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8055

WORKDIR /app

# Install system dependencies (libgomp1 is strictly required by LightGBM on Linux)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy source repository
COPY . .

# Expose default port
EXPOSE 8055

# Run with shell expansion to adapt dynamically to whichever PORT the host injects
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8055}"]
