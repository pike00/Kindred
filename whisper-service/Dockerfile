FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

ARG WHISPER_MODEL=base.en
ARG APP_VERSION=
ARG GIT_HASH=
LABEL org.opencontainers.image.version="${APP_VERSION}" \
    org.opencontainers.image.revision="${GIT_HASH}"
ENV WHISPER_MODEL=${WHISPER_MODEL} \
    WHISPER_MODEL_CACHE_PATH=/models

# PyAV bundles FFmpeg libraries; curl is used by the compose healthcheck.
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies with uv.
COPY requirements.txt .
RUN uv pip install --system --no-cache -r requirements.txt

# Bake the selected model into the image so startup needs no model download.
RUN mkdir -p /models && uv run --no-project --no-sync python -c \
    "from faster_whisper import WhisperModel; import os; WhisperModel(os.environ['WHISPER_MODEL'], device='cpu', compute_type='int8', download_root='/models')"

COPY app.py .

# Run the FastAPI app
CMD ["uv", "run", "--no-project", "--no-sync", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
