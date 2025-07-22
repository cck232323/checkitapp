FROM python:3.9

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 安装FFmpeg
RUN apt-get update && apt-get install -y ffmpeg

# 在适当的位置添加
RUN pip install requests

COPY . .

CMD ["python", "server.py"]  # 而不是 video_analyzer.py