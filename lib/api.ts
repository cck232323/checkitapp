
import axios from 'axios';

// 定义API响应类型
export interface VideoAnalysisResponse {
  type: 'video';
  frames: string[];
  frameAnalyses: { analysis: string }[];
  videoPath: string;
  audioTranscript?: string;
  audioAnalysis?: string;
  overallAnalysis?: string;
}

export interface ImageAnalysisResponse {
  type: 'image';
  imagePath: string;
  analysis: string;
}

export interface TextAnalysisResponse {
  type: 'text';
  content: string;
  analysis: string;
}

export type AnalysisResponse = VideoAnalysisResponse | ImageAnalysisResponse | TextAnalysisResponse;

// 定义分析选项
export interface AnalysisOptions {
  onProgress?: (progress: number) => void;
  onStatusUpdate?: (status: string) => void;
  timeout?: number;
}

// 主API类
export class LiedInAPI {
  private baseUrl: string;
  
  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * 分析文本内容
   * @param text 要分析的文本
   * @param options 分析选项
   */
  async analyzeText(text: string, options?: AnalysisOptions): Promise<TextAnalysisResponse> {
    const formData = new FormData();
    formData.append('type', 'text');
    formData.append('content', text);
    
    return this.sendAnalysisRequest(formData, options);
  }

  /**
   * 分析图像文件
   * @param imageFile 图像文件
   * @param options 分析选项
   */
  async analyzeImage(imageFile: File, options?: AnalysisOptions): Promise<ImageAnalysisResponse> {
    // 验证文件类型
    if (!imageFile.type.startsWith('image/')) {
      throw new Error('Invalid file type. Please provide an image file.');
    }
    
    const formData = new FormData();
    formData.append('type', 'image');
    formData.append('file', imageFile);
    
    return this.sendAnalysisRequest(formData, options);
  }

  /**
   * 分析视频文件
   * @param videoFile 视频文件
   * @param options 分析选项
   */
  async analyzeVideo(videoFile: File, options?: AnalysisOptions): Promise<VideoAnalysisResponse> {
    // 验证文件类型
    if (!videoFile.type.startsWith('video/')) {
      throw new Error('Invalid file type. Please provide a video file.');
    }
    
    // 验证文件大小
    if (videoFile.size > 100 * 1024 * 1024) { // 100MB
      throw new Error('Video size must be less than 100MB');
    }
    
    const formData = new FormData();
    formData.append('type', 'video');
    formData.append('file', videoFile);
    
    return this.sendAnalysisRequest(formData, options);
  }

  /**
   * 获取分析结果
   * @param id 分析结果ID
   */
  async getResult(id: string): Promise<AnalysisResponse> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/result?id=${id}`);
      return response.data;
    } catch (error) {
      this.handleApiError(error);
      throw error;
    }
  }

  /**
   * 获取图像文件
   * @param path 图像路径
   */
  getImageUrl(path: string): string {
    // 处理图像路径
    let processedPath;
    if (path.startsWith('/public/')) {
      processedPath = `/api/images${path.substring(7)}`; // Remove '/public'
    } else if (path.startsWith('/')) {
      processedPath = `/api/images${path}`; // Keep leading slash
    } else {
      processedPath = `/api/images/${path}`;
    }
    
    return `${this.baseUrl}${processedPath}`;
  }

  /**
   * 发送分析请求
   * @param formData 表单数据
   * @param options 分析选项
   */
  private async sendAnalysisRequest(formData: FormData, options?: AnalysisOptions): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: options?.timeout || 300000, // 默认5分钟超时
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && options?.onProgress) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            options.onProgress(percentCompleted);
          }
        }
      });
      
      return response.data;
    } catch (error) {
      this.handleApiError(error);
      throw error;
    }
  }

  /**
   * 处理API错误
   * @param error 错误对象
   */
  private handleApiError(error: any): string {
    let errorMessage = 'An error occurred during analysis';
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // 服务器返回了错误状态码
        errorMessage = `Server error: ${error.response.status}`;
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        // 请求已发送但没有收到响应
        errorMessage = 'No response received from server';
      } else {
        // 设置请求时发生了错误
        errorMessage = error.message;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return errorMessage;
  }

  /**
   * 从分析结果中提取置信度分数
   * @param result 分析结果
   */
  extractConfidenceScore(result: any): number {
    if (!result || !result.overallAnalysis) {
      return 50; // 默认值
    }
    
    // 尝试从overallAnalysis文本中提取置信区间
    // 使用正则表达式匹配 "Confidence Interval: XX–YY%" 格式
    const confidenceMatch = result.overallAnalysis.match(/\*\*Confidence Interval\*\*:\s*(\d+)[\–\-](\d+)%?/);
    
    if (confidenceMatch && confidenceMatch.length >= 3) {
      // 提取区间的两个数值并计算平均值
      const lowerBound = parseInt(confidenceMatch[1], 10);
      const upperBound = parseInt(confidenceMatch[2], 10);
      return Math.round((lowerBound + upperBound) / 2);
    }
    
    // 如果没有找到匹配，尝试其他可能的格式
    const altMatch = result.overallAnalysis.match(/confidence\s*(?:interval|level|rating|score)?:?\s*(\d+)\s*[-\u2013]\s*(\d+)\s*[%％]?/i);
    
    if (altMatch && altMatch.length >= 3) {
      const lowerBound = parseInt(altMatch[1], 10);
      const upperBound = parseInt(altMatch[2], 10);
      return Math.round((lowerBound + upperBound) / 2);
    }
    
    // 如果仍然没有找到，返回默认值
    return 50;
  }
}

// 创建默认API实例
const api = new LiedInAPI();
export default api;
