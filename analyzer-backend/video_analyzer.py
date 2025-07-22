#!/usr/bin/env python3
import argparse
import os
import cv2
import numpy as np

def extract_frames(video_path, output_dir, count=7):
    """Extract key frames from a video file."""
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # 使用 OpenCV 打开视频，它支持多种格式
    video = cv2.VideoCapture(video_path)
    if not video.isOpened():
        raise Exception(f"Could not open video file: {video_path}")
    
    # 获取视频的总帧数
    total_frames = int(video.get(cv2.CAP_PROP_FRAME_COUNT))
    if total_frames <= 0:
        raise Exception(f"Invalid frame count: {total_frames}")
    
    # 计算要提取的帧的间隔
    interval = max(1, total_frames // count)
    
    frames = []
    for i in range(count):
        frame_pos = min(i * interval, total_frames - 1)
        video.set(cv2.CAP_PROP_POS_FRAMES, frame_pos)
        ret, frame = video.read()
        if not ret:
            continue
        
        # 保存帧
        frame_path = os.path.join(output_dir, f"frame_{i:03d}.jpg")
        cv2.imwrite(frame_path, frame)
        frames.append(frame_path)
    
    video.release()
    return frames

def main():
    parser = argparse.ArgumentParser(description="Video analysis tools")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Extract frames command
    extract_parser = subparsers.add_parser("extract-frames", help="Extract key frames from a video")
    extract_parser.add_argument("video_path", help="Path to the video file")
    extract_parser.add_argument("output_dir", help="Directory to save extracted frames")
    extract_parser.add_argument("--count", type=int, default=7, help="Number of frames to extract")
    
    args = parser.parse_args()
    
    if args.command == "extract-frames":
        frames = extract_frames(args.video_path, args.output_dir, args.count)
        print(f"Extracted {len(frames)} frames to {args.output_dir}")
    else:
        parser.print_help()

if __name__ == "__main__":
    main()