
export interface Report {
  type: string;
  content?: string;
  analysis?: string;
  imagePath?: string;
  videoPath?: string;
  audioTranscript?: string;  // 添加音频转录字段
  audioAnalysis?: string;    // 添加音频分析字段
  frames?: string[];
  frameAnalyses?: {
    framePath: string;
    analysis: string;
  }[];
  overallAnalysis?: string;
}
export interface AnalysisReport {
  id: string;
  fileName?: string;
  fileType: string;
  createdAt: string;
  overallRisk: string;
  confidenceScore: number;
  summary: string;
  indicators: {
    type: string;
    description: string;
    severity: string;
    confidence: number;
    evidence: string[];
  }[];
  metadata: {
    processingTime: number;
    fileSize?: number;
    framesAnalyzed?: number;
  };
}
