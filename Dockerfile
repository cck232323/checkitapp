
# FROM --platform=linux/amd64 node:18-alpine AS base
FROM --platform=linux/amd64 node:18-slim AS base
# 避免构建时交互提示
ENV DEBIAN_FRONTEND=noninteractive

# 安装最小化依赖集
# RUN apk add --no-cache \
#     python3 \
#     py3-pip \
#     py3-numpy \
#     py3-pillow \
#     py3-flask \
#     py3-opencv \
#     ffmpeg \
#     make \
#     g++
# 安装系统依赖，不 pip 装 flask
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    python3-numpy \
    python3-opencv \
    ffmpeg \
    make \
    g++ \
 && apt-get clean && rm -rf /var/lib/apt/lists/*

# 创建并激活虚拟环境
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# 用虚拟环境的 pip 安装 Python 包
RUN pip install --no-cache-dir flask flask-cors

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY prisma ./prisma
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制所有文件
COPY . .

# 生成 Prisma 客户端
# RUN npx prisma generate

# 构建应用
RUN npm run build
# 加在 build 后
RUN mkdir -p .next/standalone/.next/static && cp -r .next/static .next/standalone/.next/
# 创建上传目录
RUN mkdir -p ./public/uploads && chmod 777 ./public/uploads

# 设置环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# ENV BACKEND_API_URL=http://backend:5000
ENV BACKEND_API_URL=${BACKEND_API_URL:-http://localhost:5000}
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL:-http://localhost:5000}
ENV PYTHONPATH="/usr/lib/python3.12/site-packages:/opt/venv/lib/python3.12/site-packages"

# 使用环境变量而不是硬编码敏感信息
# ENV OPENAI_API_KEY=${OPENAI_API_KEY}
# ENV DATABASE_URL=${DATABASE_URL}

# # 添加 AWS 环境变量
# ENV AWS_S3_BUCKET=${AWS_S3_BUCKET}
# ENV AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
# ENV AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
# ENV AWS_REGION=${AWS_REGION}

# 暴露端口
EXPOSE 3000 5000
# ENV PORT=8080
# EXPOSE 8080 5000
# 确保入口点脚本有执行权限
RUN chmod +x .next/standalone/server.js

# 添加启动后端服务的命令
COPY ./analyzer-backend /app/analyzer-backend
RUN cd /app/analyzer-backend && pip install -r requirements.txt

# 修改启动命令以同时启动前端和后端
CMD ["sh", "-c", "cd /app/analyzer-backend && python server.py & node .next/standalone/server.js"]