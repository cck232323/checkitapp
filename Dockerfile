# === Stage 1: Build frontend (Next.js) ===
FROM node:18-slim AS frontend-builder
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN npm ci --omit=dev
COPY styles ./styles
COPY . .
RUN npm run build

# === Stage 2: Build backend (Python) ===
FROM python:3.11-slim AS backend-builder
WORKDIR /app/analyzer-backend
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

COPY analyzer-backend/ .
# RUN pip install --no-cache-dir \
#     numpy opencv-python pillow \
#     openai-whisper tiktoken \
#     Flask Werkzeug flask-cors \
#     tqdm click PyYAML requests matplotlib pandas \
RUN pip install --no-cache-dir \
    numpy opencv-python pillow \
    "openai-whisper @ git+https://github.com/openai/whisper.git" \
    --prefer-binary --extra-index-url https://download.pytorch.org/whl/cpu \
    tiktoken \
    Flask Werkzeug flask-cors \
    tqdm click PyYAML requests matplotlib pandas \
    gunicorn

# === Final Stage: Runtime ===
FROM python:3.11-slim
WORKDIR /app

# 安装 Node.js + ffmpeg + deps
RUN apt-get update && apt-get install -y \
    curl ffmpeg libgl1 libglib2.0-0 \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir gunicorn
# 拷贝 Python 后端和已安装依赖
COPY --from=backend-builder /app/analyzer-backend /app/analyzer-backend
COPY --from=backend-builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages

# 拷贝 Next.js 构建产物
COPY --from=frontend-builder /app/.next/standalone ./
COPY --from=frontend-builder /app/.next/static ./.next/static
COPY --from=frontend-builder /app/public ./public
COPY --from=frontend-builder /app/package*.json ./
COPY --from=frontend-builder /app/node_modules ./node_modules

COPY --from=frontend-builder /app/prisma ./prisma
ENV PYTHONPATH="/app/analyzer-backend"
ENV PYTHONUNBUFFERED=1
EXPOSE 3000 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/healthz || exit 1

#CMD ["sh", "-c", "python3 analyzer-backend/server.py & node .next/standalone/server.js"]
#CMD ["sh", "-c", "python3 analyzer-backend/server.py & node server.js"]
#CMD ["sh", "-c", "gunicorn analyzer-backend.server:app --bind 0.0.0.0:5000 --timeout 600 & node server.js"]
CMD ["sh", "-c", "gunicorn analyzer-backend.server:app --bind 0.0.0.0:5000 --timeout 600 --workers 2 --threads 2 & node server.js"]
