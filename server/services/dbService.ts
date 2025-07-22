import { PrismaClient } from '@prisma/client';
// import { Report } from '@types/Report';
import { Report } from '../../types/Report';
const prisma = new PrismaClient();

// 保存分析结果到数据库
export async function saveAnalysisResult(result: Report): Promise<string> {
  try {
    const savedResult = await prisma.analysis.create({
      data: {
        type: result.type,
        content: result.content || null,
        analysis: result.analysis || null,
        imagePath: result.imagePath || null,
        videoPath: result.videoPath || null,
        audioTranscript: result.audioTranscript || null,
        audioAnalysis: result.audioAnalysis || null,
        overallAnalysis: result.overallAnalysis || null,
        status: "completed",
        createdAt: new Date()
      }
    });
    
    // 如果有帧数据，需要单独创建 Frame 记录
    if (result.frames && result.frames.length > 0) {
      const frameAnalyses = result.frameAnalyses || [];
      
      for (let i = 0; i < result.frames.length; i++) {
        const framePath = result.frames[i];
        const frameAnalysis = i < frameAnalyses.length ? frameAnalyses[i].analysis : null;
        
        await prisma.frame.create({
          data: {
            framePath: framePath,
            frameAnalysis: frameAnalysis,
            analysisId: savedResult.id
          }
        });
      }
    }
    
    return savedResult.id;
  } catch (error: any) {
    console.error('Error saving to database:', error);
    throw new Error(`Failed to save analysis result: ${error.message}`);
  }
}

// 获取分析结果
export async function getAnalysisResult(id: string): Promise<Report & { id: string, createdAt: Date }> {
  try {
    const result = await prisma.analysis.findUnique({
      where: { id },
      include: {
        frames: true // 包含关联的帧数据
      }
    });
    
    if (!result) {
      throw new Error(`Analysis result with ID ${id} not found`);
    }
    
    // 将 frames 数据转换为 Report 接口需要的格式
    const frames = result.frames.map(frame => frame.framePath);
    const frameAnalyses = result.frames.map(frame => ({
      framePath: frame.framePath,
      analysis: frame.frameAnalysis || ''
    }));
    
    // 构建符合 Report 接口的返回对象
    const reportResult: Report & { id: string, createdAt: Date } = {
      id: result.id,
      type: result.type,
      content: result.content || undefined,
      analysis: result.analysis || undefined,
      imagePath: result.imagePath || undefined,
      videoPath: result.videoPath || undefined,
      audioTranscript: result.audioTranscript || undefined,
      audioAnalysis: result.audioAnalysis || undefined,
      frames: frames,
      frameAnalyses: frameAnalyses,
      overallAnalysis: result.overallAnalysis || undefined,
      createdAt: result.createdAt
    };
    
    return reportResult;
  } catch (error: any) {
    console.error('Error retrieving from database:', error);
    throw new Error(`Failed to retrieve analysis result: ${error.message}`);
  }
}
