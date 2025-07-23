# Stage 1: Build frontend
FROM node:18-slim AS frontend-builder
WORKDIR /app

# 先复制 prisma 文件夹和 package 文件
COPY prisma ./prisma
COPY package*.json ./

# 现在可以安全安装依赖
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN npm ci

# 可选：手动跑一次生成（但 postinstall 已自动触发）
# RUN npx prisma generate

# 再复制其他源码
COPY . .

# 构建前端
RUN npm run build

# Stage 2: Python backend base
FROM python:3.11-slim AS backend-base
WORKDIR /app
COPY analyzer-backend/ /app/analyzer-backend/
RUN pip install --no-cache-dir -r /app/analyzer-backend/requirements.txt

# Final Stage: Combine
# Final Stage: Combine
FROM node:18-slim
WORKDIR /app

# 安装 Python 和系统依赖（添加 ffmpeg）
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    libgl1 \
    libglib2.0-0 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# 拷贝 Python 后端
COPY --from=backend-base /app/analyzer-backend /app/analyzer-backend
RUN pip3 install --no-cache-dir --break-system-packages -r /app/analyzer-backend/requirements.txt

# 拷贝前端构建产物
COPY --from=frontend-builder /app/.next .next
COPY --from=frontend-builder /app/public public
COPY --from=frontend-builder /app/package*.json ./
COPY --from=frontend-builder /app/node_modules ./node_modules

ENV PYTHONUNBUFFERED=1
EXPOSE 3000 5000

CMD ["sh", "-c", "python3 analyzer-backend/server.py & node .next/standalone/server.js"]