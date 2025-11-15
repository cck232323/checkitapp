import { PrismaClient } from '@prisma/client';
import { Report } from '../../types/Report';

const prisma = new PrismaClient();

type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

const mapReportToAnalysisData = (result: Report) => ({
  type: result.type,
  content: result.content ?? null,
  analysis: result.analysis ?? null,
  imagePath: result.imagePath ?? null,
  videoPath: result.videoPath ?? null,
  audioTranscript: result.audioTranscript ?? null,
  audioAnalysis: result.audioAnalysis ?? null,
  overallAnalysis: result.overallAnalysis ?? null,
});

const syncFrames = async (analysisId: string, result: Report) => {
  if (!result.frames || result.frames.length === 0) {
    return;
  }

  const frameAnalyses = result.frameAnalyses || [];

  await prisma.frame.deleteMany({ where: { analysisId } });

  for (let i = 0; i < result.frames.length; i += 1) {
    const framePath = result.frames[i];
    const frameAnalysis = i < frameAnalyses.length ? frameAnalyses[i].analysis : null;

    await prisma.frame.create({
      data: {
        framePath,
        frameAnalysis,
        analysisId,
      },
    });
  }
};

export async function saveAnalysisResult(
  result: Report,
  status: AnalysisStatus = 'completed'
): Promise<string> {
  try {
    const savedResult = await prisma.analysis.create({
      data: {
        ...mapReportToAnalysisData(result),
        status,
        createdAt: new Date(),
      },
    });

    if (result.frames && result.frames.length > 0) {
      await syncFrames(savedResult.id, result);
    }

    return savedResult.id;
  } catch (error: any) {
    console.error('Error saving to database:', error);
    throw new Error(`Failed to save analysis result: ${error.message}`);
  }
}

export async function updateAnalysisResult(
  id: string,
  data: Partial<Report> & { status?: AnalysisStatus }
): Promise<void> {
  try {
    await prisma.analysis.update({
      where: { id },
      data: {
        ...(data.type ? { type: data.type } : {}),
        ...(data.content !== undefined ? { content: data.content ?? null } : {}),
        ...(data.analysis !== undefined ? { analysis: data.analysis ?? null } : {}),
        ...(data.imagePath !== undefined ? { imagePath: data.imagePath ?? null } : {}),
        ...(data.videoPath !== undefined ? { videoPath: data.videoPath ?? null } : {}),
        ...(data.audioTranscript !== undefined
          ? { audioTranscript: data.audioTranscript ?? null }
          : {}),
        ...(data.audioAnalysis !== undefined ? { audioAnalysis: data.audioAnalysis ?? null } : {}),
        ...(data.overallAnalysis !== undefined
          ? { overallAnalysis: data.overallAnalysis ?? null }
          : {}),
        ...(data.status ? { status: data.status } : {}),
      },
    });

    if (data.frames && data.frames.length > 0) {
      await syncFrames(id, data as Report);
    }
  } catch (error: any) {
    console.error('Error updating analysis result:', error);
    throw new Error(`Failed to update analysis result: ${error.message}`);
  }
}

export async function getAnalysisResult(
  id: string
): Promise<Report & { id: string; createdAt: Date }> {
  try {
    const result = await prisma.analysis.findUnique({
      where: { id },
      include: {
        frames: true,
      },
    });

    if (!result) {
      throw new Error(`Analysis result with ID ${id} not found`);
    }

    const frames = result.frames.map((frame) => frame.framePath);
    const frameAnalyses = result.frames.map((frame) => ({
      framePath: frame.framePath,
      analysis: frame.frameAnalysis || '',
    }));

    return {
      id: result.id,
      type: result.type,
      content: result.content || undefined,
      analysis: result.analysis || undefined,
      imagePath: result.imagePath || undefined,
      videoPath: result.videoPath || undefined,
      audioTranscript: result.audioTranscript || undefined,
      audioAnalysis: result.audioAnalysis || undefined,
      frames,
      frameAnalyses,
      overallAnalysis: result.overallAnalysis || undefined,
      status: result.status || undefined,
      createdAt: result.createdAt,
    };
  } catch (error: any) {
    console.error('Error retrieving from database:', error);
    throw new Error(`Failed to retrieve analysis result: ${error.message}`);
  }
}
