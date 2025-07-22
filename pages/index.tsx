// import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import { useState } from 'react';
import Head from 'next/head';
import UploadForm from '../components/UploadForm';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Home() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalysisStart = () => {
    setIsAnalyzing(true);
  };

  const handleAnalysisComplete = () => {
    setIsAnalyzing(false);
  };

  return (
    <div
      className={`${geistSans.className} ${geistMono.className} grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]`}
    >
      <Head>
        <title>LiedIn - Deception Analysis Tool</title>
        <meta name="description" content="Analyze text, images, and videos for signs of deception" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <h1 className="text-4xl font-bold mb-8">LiedIn</h1>
        <p className="text-xl mb-8 text-center max-w-2xl">
          Upload text, images, or videos to analyze for signs of deception and truthfulness
        </p>

        {isAnalyzing ? (
          <div className="text-center p-8">
            <p className="text-xl mb-4">Analyzing your uploading...</p>
            <p>This may take a few moments. Please wait.</p>
          </div>
        ) : (
          <div className="w-full max-w-md">
            <UploadForm 
              onAnalysisStart={handleAnalysisStart}
              onAnalysisComplete={handleAnalysisComplete}
            />
          </div>
        )
      }
      </main>
    </div>
  );
}