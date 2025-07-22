/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

// 添加视频帧的类型定义
interface VideoFrame {
  framePath: string;
  analysis?: string;
}

interface FrameAnalysisResponse {
  analysis: string;
}

interface VideoAnalysisResponse {
  type: 'video';
  frames: string[];
  frameAnalyses: FrameAnalysisResponse[];
  videoPath: string;
  audioTranscript?: string;
  audioAnalysis?: string;
  overallAnalysis?: string;
}

interface ImageAnalysisResponse {
  type: 'image';
  imagePath: string;
  analysis: string;
}

interface TextAnalysisResponse {
  type: 'text';
  content: string;
  analysis: string;
}

type AnalysisResponse = VideoAnalysisResponse | ImageAnalysisResponse | TextAnalysisResponse;

type UploadFormProps = {
  onAnalysisStart?: () => void;
  onAnalysisComplete?: (data: any) => void;
};

const UploadForm: React.FC<UploadFormProps> = ({ 
  onAnalysisStart, 
  onAnalysisComplete 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadType, setUploadType] = useState<'text' | 'image' | 'video'>('text');
  const [textContent, setTextContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  
  // 添加防止扩展干扰的效果
  useEffect(() => {
    // 创建一个防止事件冒泡的处理函数
    const preventPropagation = (e: Event) => {
      e.stopPropagation();
    };
    
    // 获取上传表单元素
    const formElement = document.querySelector('form');
    if (formElement) {
      // 添加事件监听器来阻止事件冒泡
      formElement.addEventListener('click', preventPropagation, true);
      
      // 清理函数
      return () => {
        formElement.removeEventListener('click', preventPropagation, true);
      };
    }
  }, []);

  // 修复类型切换函数
  const handleTypeChange = (type: 'text' | 'image' | 'video') => {
    // 使用setTimeout来避免可能的事件冲突
    setTimeout(() => {
      setUploadType(type);
      setError('');
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }, 0);
  };

  // 修复文件选择函数
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setError('');
    
    if (!selectedFile) return;
    
    // Validate file type
    if (uploadType === 'image' && !selectedFile.type.startsWith('image/')) {
      setError('Please upload a valid image file');
      return;
    }
    
    if (uploadType === 'video' && !selectedFile.type.startsWith('video/')) {
      setError('Please upload a valid video file');
      return;
    }
    
    // Validate video size (100MB max)
    if (uploadType === 'video' && selectedFile.size > 100 * 1024 * 1024) {
      setError('Video size must be less than 100MB');
      return;
    }
    
    setFile(selectedFile);
  };

  // 修复提交函数
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setError('');
    
    if (uploadType === 'text' && !textContent.trim()) {
      setError('Please enter some text');
      return;
    }
    
    if ((uploadType === 'image' || uploadType === 'video') && !file) {
      setError(`Please select a ${uploadType} file`);
      return;
    }
    
    try {
      setIsLoading(true);
      onAnalysisStart?.();
      
      const formData = new FormData();
      formData.append('type', uploadType);
      
      if (uploadType === 'text') {
        formData.append('content', textContent);
      } else {
        formData.append('file', file as File);
      }
      
      const response = await axios.post('/api/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log("API response received:", response.data);
      
      setIsLoading(false);

      if (response.data) {
        // 处理视频分析结果，确保数据结构正确
        const processedData = { ...response.data } as AnalysisResponse;
        
        // 如果是视频分析结果，确保帧分析数据结构正确
        if (processedData.type === 'video' && Array.isArray(processedData.frameAnalyses)) {
          const videoData = processedData as VideoAnalysisResponse;
          
          // 确保每个帧分析都有正确的结构
          videoData.frameAnalyses = videoData.frameAnalyses.map((analysis: FrameAnalysisResponse, index: number) => ({
            framePath: videoData.frames[index],
            analysis: analysis.analysis
          }));
        }
        
        onAnalysisComplete?.(processedData);
        
        // 使用 sessionStorage 而不是 localStorage，避免数据过大
        try {
          sessionStorage.setItem('analysisResult', JSON.stringify(processedData));
        } catch (storageErr) {
          console.error("Error storing result:", storageErr);
        }
        
        router.push({
          pathname: '/result',
          query: { id: new Date().getTime().toString() } // 添加一个唯一ID，确保页面刷新
        });
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err.response?.data?.message || 'An error occurred during analysis');
      console.error('Analysis error:', err);
    }
  };

  // 修改渲染部分，使用原生HTML元素而不是隐藏的input
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex justify-center mb-4">
        <button
          type="button"
          onClick={() => handleTypeChange('text')}
          className={`px-4 py-2 ${uploadType === 'text' ? 'bg-blue-500 text-black' : 'bg-gray-200'}`}
        >
          Text
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange('image')}
          className={`px-4 py-2 ${uploadType === 'image' ? 'bg-blue-500 text-black' : 'bg-gray-200'}`}
        >
          Image
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange('video')}
          className={`px-4 py-2 ${uploadType === 'video' ? 'bg-blue-500 text-black' : 'bg-gray-200'}`}
        >
          Video
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {uploadType === 'text' ? (
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="Enter text for analysis..."
            className="w-full h-40 p-2 border border-gray-300 rounded"
            disabled={isLoading}
          />
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded p-4 text-center">
            {/* 直接显示文件输入框，不再隐藏 */}
            <input
              type="file"
              onChange={handleFileChange}
              accept={uploadType === 'image' ? 'image/*' : 'video/*'}
              className="w-full p-2"
              disabled={isLoading}
            />
            {file && (
              <div className="mt-2">
                Selected: {file.name} ({Math.round(file.size / 1024)} KB)
              </div>
            )}
          </div>
        )}

        {error && <div className="text-red-500">{error}</div>}

        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded"
          disabled={isLoading}
        >
          {isLoading ? 'Analyzing...' : 'Analyze'}
        </button>
      </form>
    </div>
  );
};

export default UploadForm;