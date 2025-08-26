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

interface UploadFormProps {
  onAnalysisStart?: () => void;
  onAnalysisComplete?: (data: any) => void;
}

// 在组件顶部添加检测函数
const isSafari = () => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.indexOf('safari') !== -1 && ua.indexOf('chrome') === -1;
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
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
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

  // 修改 handleSubmit 函数，使用 axios 而不是 fetch，并禁用流式处理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setError('');
    
    if (uploadType === 'text' && !textContent.trim()) {
      setError('Please enter some text to analyze');
      return;
    }
    
    if ((uploadType === 'image' || uploadType === 'video') && !file) {
      setError(`Please select a ${uploadType} file to analyze`);
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
      
      // 使用 axios 代替 fetch，更好地处理跨浏览器兼容性
      const response = await axios.post('/api/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        // 增加超时时间，视频处理可能需要更长时间
        timeout: 300000, // 5分钟
      });
      
      // 处理响应
      const result = response.data;
      console.log('Analysis result:', result);
      
      // 保存结果并跳转
      sessionStorage.setItem('analysisResult', JSON.stringify(result));
      window.location.href = `/result?id=${Date.now()}`;
    } catch (err: any) {
      console.error('Error during analysis:', err);
      
      // 提供更详细的错误信息
      let errorMessage = 'An error occurred during analysis';
      
      if (axios.isAxiosError(err)) {
        if (err.response) {
          // 服务器返回了错误状态码
          errorMessage = `Server error: ${err.response.status}`;
          console.error('Response data:', err.response.data);
        } else if (err.request) {
          // 请求已发送但没有收到响应
          errorMessage = 'No response received from server';
        } else {
          // 设置请求时发生了错误
          errorMessage = err.message;
        }
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  // 修改渲染部分，使用原生HTML元素而不是隐藏的input
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex rounded-lg overflow-hidden mb-4">
        <button
          type="button"
          onClick={() => handleTypeChange('text')}
          className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
            uploadType === 'text' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white hover:bg-gray-700'
          }`}
        >
          Text
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange('image')}
          className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
            uploadType === 'image' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Image
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange('video')}
          className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
            uploadType === 'video' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Video
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {uploadType === 'text' ? (
          <div className="relative">
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Enter text for analysis..."
              //className="w-full h-40 p-4 rounded-lg bg-gray-900/80 border border-gray-700/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              className="w-full h-40 p-4 rounded-lg bg-blue-200 text-black placeholder-gray-500 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              disabled={isLoading}
            />
            {textContent && (
              <div className="absolute top-2 left-4 text-xs text-blue-400 bg-gray-900/90 px-1 animate-pulse">
                Analyzing text...
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <label 
              htmlFor="file-upload" 
              className="block w-full p-4 text-center border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 transition-colors"
            >
              {file ? file.name : `Click to upload ${uploadType}`}
            </label>
            <input
              id="file-upload"
              type="file"
              accept={uploadType === 'image' ? 'image/*' : 'video/*'}
              onChange={handleFileChange}
              className="hidden"
              disabled={isLoading}
            />
            {file && (
              <p className="text-sm text-gray-400 text-center">
                {uploadType === 'image' ? 'Image' : 'Video'} selected: {file.name}
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-900/30 border border-red-800/50 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-lg hover:shadow-blue-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {progress > 0 ? `${progress}%` : 'Processing...'}
            </span>
          ) : (
            'Analyze'
          )}
        </button>
      </form>
    </div>
  );
};

export default UploadForm;
