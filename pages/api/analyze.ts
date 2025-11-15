import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
import { parseForm, imageToBase64, ensureUploadDir, FormidableResult } from 'server/services/fileService';
import { analyzeWithGPT, generateOverallAnalysis } from 'server/services/aiService';
import { extractAudioFromVideo, transcribeAudio } from 'server/services/audioService';
import { extractFramesFromVideo } from 'server/services/videoService';
import { saveAnalysisResult, updateAnalysisResult } from 'server/services/dbService';
import { deriveConfidenceScore } from '@/lib/confidence';
import { Report } from '@/types/Report';

type AnalysisResult = Report;

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
      const { score: confidenceScore } = deriveConfidenceScore(analysis);
      analysisResults = {
        type: 'text',
        content,
        analysis,
        confidenceValue: confidenceScore,
        status: 'completed',
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
        const { score: confidenceScore } = deriveConfidenceScore(analysis);
        
        analysisResults = {
          type: 'image',
          imagePath: `/uploads/${path.basename(filePath)}`,
          analysis,
          confidenceValue: confidenceScore,
          status: 'completed',
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
      const relativeVideoPath = `/uploads/${path.basename(filePath)}`;
      console.log(`Video file path: ${filePath}`);
      console.log(`Video file details: name=${file.originalFilename}, size=${file.size}, type=${file.mimetype}`);

      try {
        if (!fs.existsSync(filePath)) {
          console.error(`Video file does not exist at path: ${filePath}`);
          return res.status(500).json({ message: 'Video file not found after upload' });
        }
        
        const stats = fs.statSync(filePath);
        console.log(`File size: ${stats.size} bytes`);

        console.log('Extracting and transcribing audio from video...');
        const audioPath = await extractAudioFromVideo(filePath);
        const audioTranscript = await transcribeAudio(audioPath);
        
        if (audioTranscript && audioTranscript.length > 0) {
          console.log(`Audio transcript received, length: ${audioTranscript.length}`);
          console.log(`Audio transcript (first 500 chars): ${audioTranscript.substring(0, 500)}...`);
        } else {
          console.log('No audio transcript received');
        }
        
        console.log('Analyzing audio transcript...');
        let audioAnalysis = '';
        if (audioTranscript && audioTranscript.length > 0) {
          audioAnalysis = await analyzeWithGPT(audioTranscript, 'text');
        } else {
          audioAnalysis = "No audio transcript available for analysis.";
        }

        let preliminaryOverall = audioAnalysis;
        try {
          preliminaryOverall = await generateOverallAnalysis(audioAnalysis, []);
        } catch (preliminaryError) {
          const err = preliminaryError as Error;
          console.error('Error generating preliminary overall analysis:', err);
        }
        const { score: initialConfidence } = deriveConfidenceScore(preliminaryOverall || audioAnalysis);

        const baseResult: AnalysisResult = {
          type: 'video',
          videoPath: relativeVideoPath,
          audioTranscript,
          audioAnalysis,
          overallAnalysis: preliminaryOverall,
          analysis: audioAnalysis,
          frames: [],
          frameAnalyses: [],
          confidenceValue: initialConfidence,
          status: 'processing',
        };

        const analysisId = await saveAnalysisResult(baseResult, 'processing');
        const initialPayload = { ...baseResult, id: analysisId };
        console.log('Initial video analysis saved, returning partial result');

        res.status(200).json(initialPayload);

        (async () => {
          try {
            console.log('Starting background frame extraction and analysis...');
            const frames = await extractFramesFromVideo(filePath);
            console.log(`Extracted ${frames.length} frames from video`);

            const frameAnalysisTasks = frames.map(async (framePath, index) => {
              console.log(`Starting analysis for frame ${index + 1}/${frames.length}: ${framePath}`);
              const fullFramePath = path.join(process.cwd(), 'public', framePath);
              
              try {
                const base64Frame = imageToBase64(fullFramePath);
                const frameAnalysis = await analyzeWithGPT(base64Frame, 'video-frame');
                return {
                  framePath,
                  analysis: frameAnalysis,
                };
              } catch (frameError: unknown) {
                const err = frameError as Error;
                console.error(`Error analyzing frame ${index + 1}: ${err.message}`);
                return {
                  framePath,
                  analysis: `Error analyzing this frame: ${err.message}`,
                };
              }
            });

            const frameAnalyses = await Promise.all(frameAnalysisTasks);
            console.log(`All ${frames.length} frames analyzed`);

            let overallAnalysis = '';
            try {
              overallAnalysis = await generateOverallAnalysis(audioAnalysis, frameAnalyses);
            } catch (overallError) {
              const err = overallError as Error;
              console.error('Error generating final overall analysis:', err);
              overallAnalysis =
                "Error generating overall analysis. Please see individual frame analyses and audio analysis.";
            }

            const { score: finalConfidence } = deriveConfidenceScore(overallAnalysis || audioAnalysis);

            await updateAnalysisResult(analysisId, {
              videoPath: relativeVideoPath,
              audioTranscript,
              audioAnalysis,
              frames,
              frameAnalyses,
              overallAnalysis,
              analysis: audioAnalysis,
              confidenceValue: finalConfidence,
              status: 'completed',
            });
            console.log(`Background processing completed for analysis ${analysisId}`);
          } catch (backgroundError) {
            const err = backgroundError as Error;
            console.error('Background processing failed:', err);
            await updateAnalysisResult(analysisId, {
              overallAnalysis: `Error generating overall analysis. Please see individual frame analyses and audio analysis. Details: ${err.message}`,
              status: 'failed',
            });
          }
        })();

        return;
      } catch (videoError: unknown) {
        const err = videoError as Error;
        console.error(`Error processing video: ${err.message}`);
        console.error(err.stack);
        return res.status(500).json({ message: `Failed to process video file: ${err.message}` });
      }
    }
    const recordId = await saveAnalysisResult(analysisResults);
    const payload = { ...analysisResults, id: recordId, status: analysisResults.status ?? 'completed' };
    console.log('Analysis completed successfully');
    return res.status(200).json(payload);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error processing upload:', err);
    return res.status(500).json({ 
      message: err.message || 'An error occurred during processing',
    });
  }
}
