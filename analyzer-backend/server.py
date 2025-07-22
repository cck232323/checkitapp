from flask import Flask, request, jsonify
import os
import sys
import json
import subprocess
from flask_cors import CORS  # 添加 CORS 支持
from video_analyzer import extract_frames  # 修改为使用 extract_frames 函数

app = Flask(__name__)
CORS(app)  # 启用 CORS

# 确保上传目录存在并设置正确的权限
upload_dir = '/app/public/uploads'
os.makedirs(upload_dir, exist_ok=True)

# 尝试修复权限问题
try:
    # 使用 subprocess 而不是 os.system 来执行命令
    subprocess.run(['chmod', '-R', '777', upload_dir], check=True)
    print(f"Successfully set permissions on {upload_dir}")
    
    # 验证权限是否正确设置
    test_file_path = os.path.join(upload_dir, '.permission_test')
    with open(test_file_path, 'w') as f:
        f.write('test')
    os.remove(test_file_path)
    print(f"Upload directory {upload_dir} is now writable")
except Exception as e:
    print(f"WARNING: Could not set permissions on {upload_dir}: {str(e)}")

@app.route('/api/analyze', methods=['POST'])
def analyze():
    print(f"Python backend version: {sys.version}")
    print(f"Installed packages:")
    subprocess.run(["pip", "list"])
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # 保存上传的文件到共享卷
    upload_dir = '/app/public/uploads'
    
    # 生成唯一文件名以避免冲突
    import uuid
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4().hex}{file_extension}"
    video_path = os.path.join(upload_dir, unique_filename)
    
    try:
        # 再次检查目录权限
        if not os.access(upload_dir, os.W_OK):
            # 如果目录不可写，尝试修复权限
            subprocess.run(['chmod', '-R', '777', upload_dir], check=True)
            print(f"Re-applied permissions to {upload_dir}")
        
        print(f"Saving file to {video_path}")
        file.save(video_path)
        print(f"File saved successfully")
        
        # 创建帧输出目录
        video_name = os.path.splitext(unique_filename)[0]
        frames_dir = os.path.join(upload_dir, f"{video_name}-frames")
        os.makedirs(frames_dir, exist_ok=True)
        
        # 确保帧目录有正确的权限
        subprocess.run(['chmod', '777', frames_dir], check=True)
        
        # 使用 extract_frames 提取视频帧
        print(f"Extracting frames from {video_path} to {frames_dir}")
        frame_paths = extract_frames(video_path, frames_dir, count=7)
        print(f"Extracted {len(frame_paths)} frames")
        
        # 转换为相对路径，用于前端显示
        relative_frame_paths = [
            f"/uploads/{video_name}-frames/{os.path.basename(path)}"
            for path in frame_paths
        ]
        
        # 修改 analyze 函数中的分析逻辑
        import base64
        from PIL import Image
        import io
        import requests

        def analyze_frame(frame_path):
            # 读取图像并转换为 base64
            with open(frame_path, 'rb') as image_file:
                encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
            
            # 调用 OpenAI API 进行分析
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {os.environ.get("OPENAI_API_KEY")}'
            }
            
            payload = {
                "model": "gpt-4-vision-preview",
                "messages": [
                    {
                        "role": "system",
                        "content": "Analyze this video frame for signs of deception or truthfulness."
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Analyze this video frame for facial expressions, body language, and other visual cues that might indicate deception or truthfulness."
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{encoded_string}"
                                }
                            }
                        ]
                    }
                ],
                "max_tokens": 500
            }
            
            response = requests.post('https://api.openai.com/v1/chat/completions', headers=headers, json=payload)
            result = response.json()
            
            if 'choices' in result and len(result['choices']) > 0:
                return {"analysis": result['choices'][0]['message']['content']}
            else:
                return {"analysis": "Failed to analyze this frame."}

        # 然后在 analyze 函数中使用这个函数
        frame_analyses = []
        for i, frame_path in enumerate(frame_paths):
            frame_analysis = analyze_frame(frame_path)
            frame_analyses.append(frame_analysis)
        
        # 构建结果对象
        results = {
            "type": "video",
            "videoPath": f"/uploads/{unique_filename}",
            "frames": relative_frame_paths,
            "frameAnalyses": frame_analyses,
            "audioTranscript": "Sample audio transcript would appear here.",
            "audioAnalysis": "Sample audio analysis would appear here.",
            "overallAnalysis": "This is an overall analysis of the video content."
        }

        # 在处理完视频后添加以下代码
        import shutil

        # 确保前端可以访问的目录存在
        frontend_frames_dir = "/app/.next/server/public/uploads/{}-frames".format(video_name)
        os.makedirs(frontend_frames_dir, exist_ok=True)

        # 复制帧图像到前端可以访问的目录
        for frame_path in frame_paths:
            frame_name = os.path.basename(frame_path)
            shutil.copy(frame_path, os.path.join(frontend_frames_dir, frame_name))

        return jsonify(results)
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error processing video: {str(e)}")
        print(error_details)
        return jsonify({'error': str(e), 'details': error_details}), 500

def extract_frames(video_path, output_dir, count=7):
    """
    从视频中提取指定数量的帧
    
    Args:
        video_path: 视频文件路径
        output_dir: 输出目录
        count: 要提取的帧数量
        
    Returns:
        提取的帧的路径列表
    """
    import cv2
    
    # 确保输出目录存在
    os.makedirs(output_dir, exist_ok=True)
    
    # 打开视频文件
    video = cv2.VideoCapture(video_path)
    
    # 获取视频的总帧数
    total_frames = int(video.get(cv2.CAP_PROP_FRAME_COUNT))
    
    # 计算要提取的帧的索引
    if total_frames <= count:
        # 如果视频帧数少于请求的帧数，则提取所有帧
        frame_indices = list(range(total_frames))
    else:
        # 否则，均匀地选择帧
        frame_indices = [int(i * total_frames / count) for i in range(count)]
    
    # 提取帧
    frame_paths = []
    for i, frame_idx in enumerate(frame_indices):
        # 设置视频位置
        video.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        
        # 读取帧
        success, frame = video.read()
        if not success:
            continue
        
        # 保存帧
        frame_path = os.path.join(output_dir, f"frame_{i:03d}.jpg")
        cv2.imwrite(frame_path, frame)
        frame_paths.append(frame_path)
    
    # 释放视频对象
    video.release()
    
    return frame_paths

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)