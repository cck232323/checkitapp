import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { parseForm, imageToBase64, ensureUploadDir, FormidableResult } from 'server/services/fileService';
import { analyzeWithGPT, generateOverallAnalysis } from 'server/services/aiService';
import { extractAudioFromVideo, transcribeAudio } from 'server/services/audioService';
import { extractFramesFromVideo } from 'server/services/videoService';
import { saveAnalysisResult } from 'server/services/dbService';

// 获取后端 API URL
// const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://backend:5000';
const BACKEND_API_URL =
  process.env.BACKEND_API_URL ||
  // (process.env.NODE_ENV === 'production'
  //   ? 'http://localhost:5000'    // Railway 单容器部署场景
  //   : 'http://backend:5000');    // 本地 Docker Compose 场景
  (process.env.NODE_ENV === 'production'
  ? 'http://backend:5000'
  : 'http://localhost:5000');
// 类型定义
type AnalysisResult = {
  type: string;
  content?: string;
  analysis?: string;
  imagePath?: string;
  videoPath?: string;
  audioTranscript?: string;
  audioAnalysis?: string;
  frames?: string[];
  frameAnalyses?: Array<{
    framePath: string;
    analysis: string;
  }>;
  overallAnalysis?: string;
};

// 禁用默认的 body 解析
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log(`API request received: ${req.method}`);
  
  if (req.method !== 'POST') {
    console.log('Method not allowed, returning 405');
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  // 设置为普通 JSON 响应，不使用分块传输
  res.setHeader('Content-Type', 'application/json');
  
  // 移除这些可能导致问题的头
  // res.setHeader('Transfer-Encoding', 'chunked');
  // res.setHeader('Cache-Control', 'no-cache');
  
  // 移除保活机制，不再需要
  // const keepAlive = setInterval(() => {
  //   res.write(' ');
  // }, 30000);
  
  try {
    console.log('Starting to process upload request');
    
    // 确保上传目录存在
    try {
      ensureUploadDir();
    } catch (err: any) {
      console.error('Error ensuring upload directory:', err);
      return res.status(500).json({ message: err.message });
    }
    
    // 解析表单数据
    const { fields, files }: FormidableResult = await parseForm(req);
    console.log('Form data parsed successfully');
    
    const type = fields.type?.[0] || '';
    console.log(`Content type: ${type}`);
    
    // 验证内容类型
    if (!['text', 'image', 'video'].includes(type)) {
      console.error(`Invalid content type: ${type}`);
      return res.status(400).json({ message: `Invalid content type: ${type}` });
    }
    
    let analysisResults: AnalysisResult = {
      type: ''
    };
    
    if (type === 'text') {
      console.log('Processing text content');
      const content = fields.content?.[0] || '';
      
      if (!content) {
        console.error('No text content provided');
        return res.status(400).json({ message: 'No text content provided' });
      }
      
      console.log(`Text content length: ${content.length}`);
      const analysis = await analyzeWithGPT(content, 'text');
      analysisResults = {
        type: 'text',
        content,
        analysis,
      };
    } 
    else if (type === 'image') {
      console.log('Processing image content');
      const file = files.file?.[0];
      
      if (!file) {
        console.error('No image file provided');
        return res.status(400).json({ message: 'No image file provided' });
      }
      
      const filePath = file.filepath;
      console.log(`Image file path: ${filePath}`);
      console.log(`Image file details: name=${file.originalFilename}, size=${file.size}, type=${file.mimetype}`);
      
      try {
        // 检查文件是否存在
        if (!fs.existsSync(filePath)) {
          console.error(`Image file does not exist at path: ${filePath}`);
          return res.status(500).json({ message: 'Image file not found after upload' });
        }
        
        // 检查文件大小
        const stats = fs.statSync(filePath);
        console.log(`File size: ${stats.size} bytes`);
        
        if (stats.size === 0) {
          console.error('Image file is empty');
          return res.status(400).json({ message: 'Uploaded image file is empty' });
        }
        
        // 使用真实的OpenAI分析
        const base64Image = imageToBase64(filePath);
        const analysis = await analyzeWithGPT(base64Image, 'image');
        
        analysisResults = {
          type: 'image',
          imagePath: `/uploads/${path.basename(filePath)}`,
          analysis,
        };
      } catch (imgError: unknown) {
        const err = imgError as Error;
        console.error(`Error processing image: ${err.message}`);
        console.error(err.stack);
        return res.status(500).json({ message: `Failed to process image file: ${err.message}` });
      }
    } 
    else if (type === 'video') {
      console.log('Processing video content');
      const file = files.file?.[0];
      
      if (!file) {
        console.error('No video file provided');
        return res.status(400).json({ message: 'No video file provided' });
      }
      
      const filePath = file.filepath;
      console.log(`Video file path: ${filePath}`);
      console.log(`Video file details: name=${file.originalFilename}, size=${file.size}, type=${file.mimetype}`);

      try {
        // 检查文件是否存在
        if (!fs.existsSync(filePath)) {
          console.error(`Video file does not exist at path: ${filePath}`);
          return res.status(500).json({ message: 'Video file not found after upload' });
        }
        
        // 检查文件大小
        const stats = fs.statSync(filePath);
        console.log(`File size: ${stats.size} bytes`);

        // 提取音频并转换为文本
        console.log('Extracting and transcribing audio from video...');
        const audioPath = await extractAudioFromVideo(filePath);
        const audioTranscript = await transcribeAudio(audioPath);
        
        // 输出音频转录结果
        if (audioTranscript && audioTranscript.length > 0) {
          console.log(`Audio transcript received, length: ${audioTranscript.length}`);
          console.log(`Audio transcript (first 500 chars): ${audioTranscript.substring(0, 500)}...`);
        } else {
          console.log('No audio transcript received');
        }
        
        // 分析音频转录文本
        console.log('Analyzing audio transcript...');
        let audioAnalysis = '';
        if (audioTranscript && audioTranscript.length > 0) {
          audioAnalysis = await analyzeWithGPT(audioTranscript, 'text');
          console.log('Audio analysis completed');
          console.log(`Audio analysis (first 500 chars): ${audioAnalysis.substring(0, 500)}...`);
        } else {
          console.log('No audio transcript available for analysis');
          audioAnalysis = "No audio transcript available for analysis.";
        }

        // 提取视频帧
        console.log('Extracting frames from video...');
        const frames = await extractFramesFromVideo(filePath);
        console.log(`Extracted ${frames.length} frames from video`);

        // Analyzing all video frames in parallel...

        // 创建分析任务数组
        const frameAnalysisTasks = frames.map(async (framePath, index) => {
          console.log(`Starting analysis for frame ${index + 1}/${frames.length}: ${framePath}`);
          
          // 获取帧的完整文件路径
          const fullFramePath = path.join(process.cwd(), 'public', framePath);
          
          try {
            // 将图片转换为base64
            const base64Frame = imageToBase64(fullFramePath);
            
            // 使用GPT分析帧
            const frameAnalysis = await analyzeWithGPT(base64Frame, 'video-frame');
            
            console.log(`Frame ${index + 1} analysis completed`);
            
            // 返回分析结果
            return {
              framePath: framePath,
              analysis: frameAnalysis
            };
          } catch (frameError: unknown) {
            const err = frameError as Error;
            console.error(`Error analyzing frame ${index + 1}: ${err.message}`);
            
            // 返回错误信息
            return {
              framePath: framePath,
              analysis: `Error analyzing this frame: ${err.message}`
            };
          }
        });

        // 并行执行所有分析任务
        const frameAnalyses = await Promise.all(frameAnalysisTasks);
        console.log(`All ${frames.length} frames analyzed in parallel`);
        // 综合所有分析结果
        console.log('Generating overall analysis from frame analyses and audio analysis...');
        
        // Make sure this function is being called and its result is being used
        try {
          const overallAnalysis = await generateOverallAnalysis(audioAnalysis, frameAnalyses);
          console.log('Overall analysis generated successfully:', overallAnalysis.substring(0, 100) + '...');
          // Ensure the overall analysis is included in the results object
          analysisResults = {
            type: 'video',
            videoPath: `/uploads/${path.basename(filePath)}`,
            audioTranscript,
            audioAnalysis,
            frames,
            frameAnalyses,
            overallAnalysis: overallAnalysis, // Make sure this is set correctly
            analysis: audioAnalysis // Set analysis as a fallback
          };
        } catch (analysisError) {
          console.error('Error generating overall analysis:', analysisError);
          
          // Provide a fallback if overall analysis generation fails
          analysisResults = {
            type: 'video',
            videoPath: `/uploads/${path.basename(filePath)}`,
            audioTranscript,
            audioAnalysis,
            frames,
            frameAnalyses,
            overallAnalysis: "Error generating overall analysis. Please see individual frame analyses and audio analysis.",
            analysis: audioAnalysis // Use audio analysis as a fallback
          };
        }
        
        console.log('Video analysis completed successfully');
      } catch (videoError: unknown) {
        const err = videoError as Error;
        console.error(`Error processing video: ${err.message}`);
        console.error(err.stack);
        return res.status(500).json({ message: `Failed to process video file: ${err.message}` });
      }
    }
    await saveAnalysisResult(analysisResults);
    console.log('Analysis completed successfully');
    return res.status(200).json(analysisResults);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error processing upload:', err);
    return res.status(500).json({ 
      message: err.message || 'An error occurred during processing',
    });
  }
}