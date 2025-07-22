
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
