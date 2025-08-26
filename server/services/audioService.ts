import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import FormData from 'form-data';
import axios from 'axios';
// import { uploadDir } from './fileService';

const execPromise = promisify(exec);

// 从视频中提取音频
export async function extractAudioFromVideo(videoPath: string): Promise<string> {
  console.log(`Extracting audio from video: ${videoPath}`);
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  const videoName = path.basename(videoPath, path.extname(videoPath));
  const audioPath = path.join(uploadDir, `${videoName}.mp3`);
  
  try {
    // 使用 ffmpeg 提取音频
    console.log(`Extracting audio to: ${audioPath}`);
    await execPromise(`ffmpeg -i "${videoPath}" -q:a 0 -map a "${audioPath}" -y`);
    
    // 检查音频文件是否成功创建
    if (!fs.existsSync(audioPath)) {
      console.error(`Audio extraction failed, file not created: ${audioPath}`);
      return "";
    }
    
    console.log(`Audio extracted successfully: ${audioPath}`);
    return audioPath;
  } catch (error: any) {
    console.error('Error extracting audio:', error);
    throw new Error(`Failed to extract audio: ${error.message}`);
  }
}

// 将音频转换为文本
export async function transcribeAudio(audioPath: string): Promise<string> {
  console.log('Transcribing audio with Whisper API...');
  const audioName = path.basename(audioPath, path.extname(audioPath));
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  
  try {
    // 读取音频文件
    const audioBuffer = fs.readFileSync(audioPath);
    
    // 创建 FormData 对象
    const formData = new FormData();
    
    // 添加文件到 FormData
    formData.append('file', audioBuffer, {
      filename: `${audioName}.mp3`,
      contentType: 'audio/mp3',
    });
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');
    
    // 使用 axios 发送请求
    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        timeout: 600000
      }
    );
    
    // 将完整转录结果写入文件，方便查看
    const transcriptPath = path.join(uploadDir, `${audioName}-transcript.txt`);
    fs.writeFileSync(transcriptPath, response.data.text);
    
    console.log(`Transcription saved to: ${transcriptPath}`);
    return response.data.text;
  } catch (error: any) {
    console.error('Error transcribing audio:', error);
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
}