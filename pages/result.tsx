
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Geist, Geist_Mono } from "next/font/google";
import api from '../lib/api';
import { ResultReport } from '@/components/ResultReport';
import { AnalysisReport } from '@/types/Report';

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

interface FrameAnalysis {
  framePath: string;
  analysis: string;
}

interface AnalysisResult {
  id?: string;
  type: 'text' | 'image' | 'video';
  content?: string;
  analysis?: string;
  imagePath?: string;
  videoPath?: string;
  audioTranscript?: string;
  audioAnalysis?: string;
  frames?: string[];
  frameAnalyses?: FrameAnalysis[] | Array<{ analysis: string }>;
  overallAnalysis?: string;
  confidenceValue?: number;
  confidenceInterval?: {
    lower?: number;
    upper?: number;
  };
  createdAt?: string;
  fileName?: string;
  metadata?: {
    processingTime?: number;
    fileSize?: number;
    framesAnalyzed?: number;
    sourceName?: string;
  };
  fileSize?: number;
  status?: string;
}

// 在文件顶部（ResultPage 组件上方）新增一个通用可折叠组件
const CollapsibleSection: React.FC<{
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-xl animate-fadeIn overflow-hidden">
      {/* Header */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-800/70 transition"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={title.replace(/\s+/g, "-").toLowerCase()}
      >
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        <span
          className={`inline-block transform transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
          aria-hidden="true"
        >
          {/* 下拉箭头 */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" />
          </svg>
        </span>
      </button>

      {/* Body */}
      <div
        id={title.replace(/\s+/g, "-").toLowerCase()}
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-6 pt-2">{children}</div>
        </div>
      </div>
    </div>
  );
};

// 在 CollapsibleSection 组件后添加一个新的 TruthIndicator 组件
const TruthIndicator: React.FC<{
  confidenceValue: number;
}> = ({ confidenceValue }) => {
  const isTruthful = confidenceValue >= 65;
  
  return (
    <div className={`mb-8 p-6 rounded-xl shadow-xl border-2 animate-fadeIn ${
      isTruthful 
        ? 'bg-green-900/30 border-green-500' 
        : 'bg-red-900/30 border-red-500'
    }`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-center sm:text-left">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">
            {isTruthful ? 'TRUE' : 'FALSE'}
          </h2>
          {/* <p className="text-gray-300">
            Confidence: {confidenceValue}%
          </p> */}
        </div>
        <div className={`text-5xl ${isTruthful ? 'text-green-500' : 'text-red-500'}`}>
          {isTruthful 
            ? '✓' // Checkmark for true
            : '✗' // X mark for false
          }
        </div>
      </div>
    </div>
  );
};

const ResultPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fadeIn, setFadeIn] = useState(false);
  const [confidenceValue, setConfidenceValue] = useState<number>(0);
  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState<boolean>(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  
  useEffect(() => {
    // Add fade-in effect on page load
    setFadeIn(true);
    
    // Try to get results from sessionStorage
    try {
      const storedResult = sessionStorage.getItem('analysisResult');
      if (storedResult) {
        let parsedResult;
        
        try {
          // 尝试正常解析JSON
          parsedResult = JSON.parse(storedResult);
          console.log("Parsed sessionStorage data:", parsedResult);
        } catch (parseError) {
          // 如果解析失败，检查是否为字符数组
          if (typeof storedResult === 'object' && storedResult !== null) {
            // 将字符数组转换为字符串
            const resultString = Object.values(storedResult).join('');
            try {
              parsedResult = JSON.parse(resultString);
              console.log("Converted array to JSON object:", parsedResult);
            } catch (e) {
              console.error("Failed to parse sessionStorage data:", e);
              setError("Invalid analysis data format");
              setLoading(false);
              return;
            }
          } else {
            console.error("Invalid sessionStorage data format:", storedResult);
            setError("Invalid analysis data format");
            setLoading(false);
            return;
          }
        }


        console.log("Results retrieved from sessionStorage:", parsedResult.overallAnalysis);
        
        // Process the result to ensure it has the required fields
        if (!parsedResult.overallAnalysis) {
          console.log("No overallAnalysis found, using fallbacks");
          
          if (parsedResult.audioAnalysis) {
            console.log("Using audioAnalysis as fallback");
            parsedResult.overallAnalysis = parsedResult.audioAnalysis;
          } else if (parsedResult.analysis) {
            console.log("Using analysis as fallback");
            parsedResult.overallAnalysis = parsedResult.analysis;
          } else if (parsedResult.frameAnalyses && parsedResult.frameAnalyses.length > 0) {
            console.log("Using first frame analysis as fallback");
            parsedResult.overallAnalysis = "Based on frame analysis: " + 
              parsedResult.frameAnalyses[0].analysis;
          }
        }
        
        setResult(parsedResult);
        setLoading(false);
        
        if (parsedResult) {
          const confidence =
            typeof parsedResult.confidenceValue === 'number'
              ? parsedResult.confidenceValue
              : api.extractConfidenceScore(parsedResult);
          setConfidenceValue(confidence);
        }
      }
    } catch (err) {
      console.error("Failed to read from sessionStorage:", err);
    }

    // If sessionStorage has no data, try to get from API
    if (!id) return;

    // 修改fetchResult函数，使用新的API
    async function fetchResult() {
      try {
        const response = await api.getResult(id as string);
        console.log("Results retrieved from API:", response);
        setResult(response);
        
        const confidence =
          typeof response.confidenceValue === 'number'
            ? response.confidenceValue
            : api.extractConfidenceScore(response);
        setConfidenceValue(confidence);
      } catch (err: any) {
        console.error('Error fetching result:', err);
        setError(err.message || 'Failed to load analysis result');
      } finally {
        setLoading(false);
      }
    }

    fetchResult();
  }, [id]);

  useEffect(() => {
    if (!result?.id) return;
    if (result.status === 'completed' || result.status === 'failed') return;

    const interval = setInterval(async () => {
      try {
        const latest = await api.getResult(result.id as string);
        setResult(latest);
        const confidence =
          typeof latest.confidenceValue === 'number'
            ? latest.confidenceValue
            : api.extractConfidenceScore(latest);
        setConfidenceValue(confidence);

        if (latest.status === 'completed' || latest.status === 'failed') {
          clearInterval(interval);
        }
      } catch (pollError) {
        console.error('Error polling analysis result:', pollError);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [result?.id, result?.status]);

  // Process frame analysis data to ensure correct format
  const processedFrameAnalyses = result?.frames && result?.frameAnalyses ? 
    result.frames.map((framePath, index) => {
      const analysis = Array.isArray(result.frameAnalyses) && result.frameAnalyses[index] 
        ? 'analysis' in result.frameAnalyses[index] 
          ? result.frameAnalyses[index].analysis 
          : typeof result.frameAnalyses[index] === 'string' 
            ? result.frameAnalyses[index] 
            : 'No analysis available'
        : 'No analysis available';
      
      return { framePath, analysis };
    }) : [];

  // Function to process image paths
  const getImagePath = (framePath: string) => {
    console.log("Original path:", framePath);
    
    // Remove leading slash as API routes will add it automatically
    let processedPath;
    if (framePath.startsWith('/public/')) {
      processedPath = `/api/images${framePath.substring(7)}`; // Remove '/public'
    } else if (framePath.startsWith('/')) {
      processedPath = `/api/images${framePath}`; // Keep leading slash
    } else {
      processedPath = `/api/images/${framePath}`;
    }
    
    console.log("Processed path:", processedPath);
    return processedPath;
  };

  // 构建报告数据结构
  const buildReportData = useCallback((analysisResult: AnalysisResult): AnalysisReport => {
    const rawMetadata = analysisResult.metadata || {};

    const derivedCreatedAt = (() => {
      const createdAt = analysisResult.createdAt;
      if (createdAt) {
        const date = new Date(createdAt);
        if (!Number.isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
      return new Date().toISOString();
    })();

    const framesAnalyzed = rawMetadata.framesAnalyzed ?? (Array.isArray(analysisResult.frames) ? analysisResult.frames.length : undefined);

    const fileSizeFromResult = typeof rawMetadata.fileSize === 'number'
      ? rawMetadata.fileSize
      : typeof analysisResult.fileSize === 'number'
        ? analysisResult.fileSize
        : undefined;

    const resolvedFileName = (() => {
      if (analysisResult.fileName) return analysisResult.fileName;
      if (typeof rawMetadata.sourceName === 'string') return rawMetadata.sourceName;
      switch (analysisResult.type) {
        case 'image':
          return 'Image Upload';
        case 'video':
          return 'Video Upload';
        case 'text':
          return 'Text Submission';
        default:
          return 'Analysis';
      }
    })();

    const evidence: string[] = [];
    if (analysisResult.overallAnalysis) {
      evidence.push('Overall analysis generated');
    }
    if (analysisResult.audioAnalysis) {
      evidence.push('Includes audio transcript insights');
    }
    if (Array.isArray(analysisResult.frameAnalyses) && analysisResult.frameAnalyses.length > 0) {
      evidence.push(`${analysisResult.frameAnalyses.length} frame analyses available`);
    }
    if (evidence.length === 0) {
      evidence.push('Analysis completed without detailed indicators');
    }

    return {
      id: (analysisResult.id ?? (id as string) ?? 'N/A').toString(),
      fileName: resolvedFileName,
      fileType: analysisResult.type ?? 'unknown',
      createdAt: derivedCreatedAt,
      overallRisk: confidenceValue >= 65 ? 'low' : 'high',
      confidenceScore: confidenceValue,
      summary: analysisResult.overallAnalysis || analysisResult.analysis || 'No summary available',
      indicators: [
        {
          description: analysisResult.overallAnalysis
            ? 'Overall assessment ready for review'
            : 'Potential deception indicators detected',
          severity: confidenceValue >= 65 ? 'low' : 'high',
          type: analysisResult.type === 'video' ? 'multimedia' : 'behavioral',
          confidence: confidenceValue,
          evidence,
        },
      ],
      metadata: {
        processingTime:
          typeof rawMetadata.processingTime === 'number'
            ? rawMetadata.processingTime
            : 0,
        fileSize: fileSizeFromResult,
        framesAnalyzed,
      },
      status: analysisResult.status || undefined,
      confidenceInterval: analysisResult.confidenceInterval,
    };
  }, [confidenceValue, id]);

  const report = useMemo(() => (result ? buildReportData(result) : null), [result, buildReportData]);

  if (loading) {
    return (
      <div className={`${geistSans.className} ${geistMono.className} min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-16 h-16 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-xl text-gray-200">Loading analysis results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${geistSans.className} ${geistMono.className} min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col items-center justify-center p-8`}>
        <div className="bg-red-900/30 border border-red-800/50 rounded-lg p-6 max-w-md w-full text-center mb-6">
          <p className="text-xl text-red-200 mb-4">Error: {error}</p>
          <Link href="/" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all transform hover:scale-105">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className={`${geistSans.className} ${geistMono.className} min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col items-center justify-center p-8`}>
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6 max-w-md w-full text-center mb-6">
          <p className="text-xl text-gray-200 mb-4">No analysis results found.</p>
          <Link href="/" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all transform hover:scale-105">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  // 添加处理支付的函数
  const handleUnlockPremiumContent = async () => {
    setIsProcessingPayment(true);
    
    try {
      // 这里应该集成实际的支付处理逻辑
      // 例如调用 Stripe, PayPal 或其他支付 API
      
      // 模拟支付处理延迟
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 支付成功后解锁内容
      setIsPremiumUnlocked(true);
    } catch (error) {
      console.error('Payment processing error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className={`${geistSans.className} ${geistMono.className} min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 px-4 py-8 sm:px-8 sm:py-10 transition-opacity duration-700 ease-in-out ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
      <Head>
        <title>Analysis Results - LiedIn</title>
        <meta name="description" content="Deception analysis results" />
      </Head>

      <div className="max-w-6xl mx-auto space-y-8">
        {report && (
          <ResultReport
            report={report}
            onNewAnalysis={() => {
              router.push('/');
            }}
          />
        )}

        <main className="space-y-8">
          <div className="animate-fadeIn text-gray-300">
            Content Type: {result.type === 'text' ? 'Text' : result.type === 'image' ? 'Image' : 'Video'}
          </div>

          {/* 真假指示器 */}
          <TruthIndicator confidenceValue={confidenceValue} />

          {result.status === 'processing' && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
              Frame analyses are still running in the background. This page will update automatically when they are ready.
            </div>
          )}
          {result.status === 'failed' && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              We were unable to finish analyzing all frames. The current report reflects the latest available data.
            </div>
          )}
          
          {/* 总览 */}
          {/* <CollapsibleSection title="Analysis Summary" defaultOpen>
            <div className="whitespace-pre-line text-gray-200 prose prose-invert max-w-none">
              {result.overallAnalysis ||
                result.analysis ||
                (result.audioAnalysis
                  ? `Audio Analysis Summary:\n${result.audioAnalysis}\n\n${
                      result.frameAnalyses && result.frameAnalyses.length > 0
                        ? `Frame Analysis Summary:\n${result.frameAnalyses[0].analysis}`
                        : ""
                    }`
                  : "No overall analysis available")}
            </div>
          </CollapsibleSection> */}

          {/* 音频转写与分析（仅视频且有转写时显示） */}
          {/* {result.type === "video" && result.audioTranscript && (
            <CollapsibleSection title="Audio Transcription & Analysis" defaultOpen={false}>
              <h3 className="text-xl font-medium text-white mb-3 border-b border-gray-700 pb-2">
                Audio Transcription
              </h3>
              <div className="mb-6 p-4 bg-gray-900/70 rounded-lg border border-gray-700">
                <p className="whitespace-pre-line text-gray-300 font-mono text-sm">
                  {result.audioTranscript}
                </p>
              </div>

              {result.audioAnalysis && (
                <>
                  <h3 className="text-xl font-medium text-white mb-3 border-b border-gray-700 pb-2">
                    Audio Content Analysis
                  </h3>
                  <div className="whitespace-pre-line text-gray-200 prose prose-invert max-w-none">
                    {result.audioAnalysis}
                  </div>
                </>
              )}
            </CollapsibleSection>
          )} */}

          {result.type === "video" && (!result.frames || result.frames.length === 0) && result.status === 'processing' && (
            <div className="rounded-xl border border-dashed border-gray-600/70 bg-gray-800/40 px-6 py-4 text-sm text-gray-300">
              Frame-by-frame insights are being generated. Stay on this page and they will appear automatically once completed.
            </div>
          )}

          {/* 视频帧分析（仅视频且有帧时显示） - 付费内容 */}
          {result.type === "video" && result.frames && result.frames.length > 0 && (
            <CollapsibleSection title={`Video Frame Analysis (${result.frames.length} Frames)`} defaultOpen={false}>
              {!isPremiumUnlocked ? (
                <div className="text-center py-10">
                  <div className="bg-gray-800/80 rounded-xl p-6 mb-6 max-w-md mx-auto">
                    <h3 className="text-xl font-semibold text-white mb-3">
                      Premium Content
                    </h3>
                    <p className="text-gray-300 mb-6">
                      Unlock detailed frame-by-frame analysis to get deeper insights into deception indicators.
                    </p>
                    <button
                      onClick={handleUnlockPremiumContent}
                      disabled={isProcessingPayment}
                      className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isProcessingPayment ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing Payment...
                        </span>
                      ) : (
                        "Unlock Premium Analysis ($9.99)"
                      )}
                    </button>
                    <div className="flex items-center justify-center mt-4 space-x-2">
                      <img src="/visa.svg" alt="Visa" className="h-6" />
                      <img src="/mastercard.svg" alt="Mastercard" className="h-6" />
                      <img src="/amex.svg" alt="American Express" className="h-6" />
                      <img src="/applepay.svg" alt="Apple Pay" className="h-6" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {processedFrameAnalyses.map((frame, index) => (
                    <div
                      key={index}
                      className="border border-gray-700 rounded-lg overflow-hidden bg-gray-900/70 transition-all hover:shadow-lg hover:shadow-blue-900/20"
                    >
                      <div className="p-2 bg-gray-800 text-center font-medium text-gray-200 border-b border-gray-700">
                        Frame {index + 1}
                      </div>

                      <div className="p-4">
                        <div className="relative bg-black/30 rounded-lg overflow-hidden">
                          <img
                            src={getImagePath(frame.framePath)}
                            alt={`Video frame ${index + 1}`}
                            className="w-full h-auto object-contain max-h-64 mb-4"
                            onError={(e) => {
                              console.error(`Failed to load image: ${frame.framePath}`);
                              (e.currentTarget as HTMLImageElement).src = "/placeholder.jpg";
                            }}
                          />
                        </div>

                        <div className="mt-4">
                          <h4 className="font-medium mb-2 text-gray-300">Frame Analysis:</h4>
                          <div className="text-sm whitespace-pre-line text-gray-300 bg-gray-800/70 p-4 rounded-lg border border-gray-700">
                            {frame.analysis}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleSection>
          )}

          <div className="mt-10 text-center animate-fadeIn">
            <Link
              href="/"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg shadow-lg hover:shadow-blue-500/20 transition-all transform hover:scale-105"
            >
              Analyze New Content
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ResultPage;
