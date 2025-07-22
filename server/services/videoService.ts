import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
// import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

export async function extractFramesFromVideo(videoPath: string, frameCount: number = 7): Promise<string[]> {
  console.log(`Extracting ${frameCount} frames from video: ${videoPath}`);
  
  // 创建唯一的输出目录名
  const videoName = path.basename(videoPath, path.extname(videoPath));
  const framesDir = path.join(process.cwd(), 'public', 'uploads', `${videoName}-frames`);
  
  // 确保输出目录存在
  if (!fs.existsSync(framesDir)) {
    fs.mkdirSync(framesDir, { recursive: true });
    console.log(`Created frames directory: ${framesDir}`);
  }
  
  try {
    // 获取视频时长
    const { stdout: durationOutput } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
    );
    const duration = parseFloat(durationOutput.trim());
    console.log(`Video duration: ${duration} seconds`);
    
    // 计算帧间隔
    const interval = duration / (frameCount + 1);
    console.log(`Frame interval: ${interval} seconds`);
    
    // 提取帧
    const framePaths: string[] = [];
    
    for (let i = 1; i <= frameCount; i++) {
      const timestamp = interval * i;
      const outputPath = path.join(framesDir, `frame-${i}.jpg`);
      const relativeOutputPath = `/uploads/${videoName}-frames/frame-${i}.jpg`;
      
      console.log(`Extracting frame at ${timestamp}s to ${outputPath}`);
      
      await execAsync(
        `ffmpeg -ss ${timestamp} -i "${videoPath}" -vframes 1 -q:v 2 "${outputPath}" -y`
      );
      
      framePaths.push(relativeOutputPath);
      console.log(`Frame ${i}/${frameCount} extracted successfully`);
    }
    
    console.log(`Successfully extracted ${framePaths.length} frames`);
    return framePaths;
  } catch (error: any) {
    console.error(`Error extracting frames: ${error.message}`);
    throw new Error(`Failed to extract frames from video: ${error.message}`);
  }
}

export async function extractAudioFromVideo(videoPath: string): Promise<string> {
  console.log(`Extracting audio from video: ${videoPath}`);
  
  // 创建唯一的输出文件名
  const videoName = path.basename(videoPath, path.extname(videoPath));
  const audioPath = path.join(process.cwd(), 'public', 'uploads', `${videoName}-audio.mp3`);
  
  try {
    // 提取音频
    await execAsync(
      `ffmpeg -i "${videoPath}" -q:a 0 -map a "${audioPath}" -y`
    );
    
    console.log(`Audio extracted successfully to: ${audioPath}`);
    return audioPath;
  } catch (error: any) {
    console.error(`Error extracting audio: ${error.message}`);
    throw new Error(`Failed to extract audio from video: ${error.message}`);
  }
}