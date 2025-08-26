import { useState, useEffect } from 'react';
import UploadForm from '../components/UploadForm';
import Head from 'next/head';
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

export default function Home() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    // Add fade-in effect on page load
    setFadeIn(true);
  }, []);

  const handleAnalysisStart = () => {
    setIsAnalyzing(true);
  };

  const handleAnalysisComplete = () => {
    setIsAnalyzing(false);
  };

  return (
    <div
      className={`${geistSans.className} ${geistMono.className} min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8 pb-20 sm:p-20 transition-opacity duration-700 ease-in-out ${fadeIn ? 'opacity-100' : 'opacity-0'}`}
    >
      <Head>
        <title>LiedIn - Deception Analysis Tool</title>
        <meta name="description" content="Analyze text, images, and videos for signs of deception" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="text-center mb-12 animate-fadeIn">
          <h1 className="text-5xl font-bold mb-4 text-white tracking-tight">LiedIn</h1>
          <p className="text-xl text-gray-300 max-w-lg mx-auto leading-relaxed">
            Upload text, images, or videos<br />
            to analyze signs of deception or truthfulness
          </p>
        </div>

        {isAnalyzing ? (
          <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl shadow-2xl text-center max-w-md w-full border border-gray-700/50 animate-fadeIn">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
              <p className="text-xl font-medium text-gray-200 mb-2">Analyzing your upload...</p>
              <p className="text-gray-400">This may take a few moments. Please wait.</p>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl shadow-2xl max-w-md w-full border border-gray-700/50 animate-fadeIn">
            <UploadForm 
              onAnalysisStart={handleAnalysisStart}
              onAnalysisComplete={handleAnalysisComplete}
            />
          </div>
        )}
      </main>
    </div>
  );
}