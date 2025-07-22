/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import axios from 'axios';

interface FrameAnalysis {
  framePath: string;
  analysis: string;
}

interface AnalysisResult {
  type: 'text' | 'image' | 'video';
  content?: string;
  analysis?: string;
  imagePath?: string;
  videoPath?: string;
  audioTranscript?: string;
  audioAnalysis?: string;
  frames?: string[];
  frameAnalyses?: FrameAnalysis[] | Array<{analysis: string}>;
  overallAnalysis?: string;
}

const ResultPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 尝试从 sessionStorage 获取结果
    try {
      const storedResult = sessionStorage.getItem('analysisResult');
      if (storedResult) {
        const parsedResult = JSON.parse(storedResult);
        console.log("从 sessionStorage 读取的结果:", parsedResult);
        setResult(parsedResult);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error("读取 sessionStorage 失败:", err);
    }

    // 如果 sessionStorage 没有数据，尝试从 API 获取
    if (!id) return;

    async function fetchResult() {
      try {
        const response = await axios.get(`/api/result?id=${id}`);
        console.log("从 API 获取的结果:", response.data);
        setResult(response.data);
      } catch (err: any) {
        console.error('Error fetching result:', err);
        setError(err.message || 'Failed to load analysis result');
      } finally {
        setLoading(false);
      }
    }

    fetchResult();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">加载分析结果中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-xl mb-4">错误: {error}</p>
        <Link href="/" className="text-blue-500 hover:underline">
          返回首页
        </Link>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-xl mb-4">未找到分析结果。</p>
        <Link href="/" className="text-blue-500 hover:underline">
          返回首页
        </Link>
      </div>
    );
  }

  // 处理帧分析数据，确保格式正确
  const processedFrameAnalyses = result.frames && result.frameAnalyses ? 
    result.frames.map((framePath, index) => {
      const analysis = Array.isArray(result.frameAnalyses) && result.frameAnalyses[index] 
        ? 'analysis' in result.frameAnalyses[index] 
          ? result.frameAnalyses[index].analysis 
          : typeof result.frameAnalyses[index] === 'string' 
            ? result.frameAnalyses[index] 
            : '无分析结果'
        : '无分析结果';
      
      return { framePath, analysis };
    }) : [];

  // 添加一个函数来处理图片路径
  const getImagePath = (framePath: string) => {
    console.log("原始路径:", framePath);
    
    // 移除开头的斜杠，因为 API 路由会自动添加
    let processedPath;
    if (framePath.startsWith('/public/')) {
      processedPath = `/api/images${framePath.substring(7)}`; // 移除 '/public'
    } else if (framePath.startsWith('/')) {
      processedPath = `/api/images${framePath}`; // 保留开头的斜杠
    } else {
      processedPath = `/api/images/${framePath}`;
    }
    
    console.log("处理后的路径:", processedPath);
    return processedPath;
  };

  return (
    <div className="min-h-screen p-8">
      <Head>
        <title>分析结果 - LiedIn</title>
        <meta name="description" content="欺骗分析结果" />
      </Head>

      <header className="mb-8">
        <h1 className="text-3xl font-bold">分析结果</h1>
        <p className="text-gray-600">
          内容类型: {result.type === 'text' ? '文本' : result.type === 'image' ? '图片' : '视频'}
        </p>
      </header>

      <main className="max-w-4xl mx-auto">
        {/* 总体分析摘要 */}
        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-black">分析摘要</h2>
          <div className="whitespace-pre-line text-black">
            {result.overallAnalysis || result.analysis || '无总体分析结果'}
          </div>
        </div>
        
        {/* 音频转录和分析部分 */}
        {result.type === 'video' && result.audioTranscript && (
          <div className="bg-white shadow-md rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-black">音频转录</h2>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="whitespace-pre-line text-gray-700">
                {result.audioTranscript}
              </p>
            </div>
            
            {result.audioAnalysis && (
              <>
                <h3 className="text-lg font-medium text-black mb-2">音频内容分析</h3>
                <div className="whitespace-pre-line text-black">
                  {result.audioAnalysis}
                </div>
              </>
            )}
          </div>
        )}

        {/* 视频帧分析部分 */}
        {result.type === 'video' && result.frames && result.frames.length > 0 && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold text-black mb-4">视频帧分析 (共 {result.frames.length} 帧)</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {processedFrameAnalyses.map((frame, index) => (
                <div key={index} className="border rounded-lg overflow-hidden bg-gray-50">
                  <div className="p-2 bg-gray-200 text-center font-medium">
                    帧 {index + 1}
                  </div>
                  
                  <div className="p-4">
                    <img 
                      src={getImagePath(frame.framePath)} 
                      alt={`视频帧 ${index + 1}`} 
                      className="w-full h-auto object-contain max-h-64 mb-4"
                      onError={(e) => {
                        console.error(`无法加载图片: ${frame.framePath}`);
                        e.currentTarget.src = '/placeholder.jpg'; // 使用占位图
                      }}
                    />
                    
                    <div className="mt-4">
                      <h3 className="font-medium mb-2 text-gray-800">帧分析:</h3>
                      <p className="text-sm whitespace-pre-line text-black bg-white p-3 rounded border">
                        {frame.analysis}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/" className="inline-block bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600">
            分析新内容
          </Link>
        </div>
      </main>
    </div>
  );
};

export default ResultPage;