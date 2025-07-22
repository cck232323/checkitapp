import "@/styles/globals.css";
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import type { AppProps } from "next/app";

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  
  useEffect(() => {
    // 确保静态文件路径正确
    if (typeof window !== 'undefined') {
      window.__NEXT_DATA__.assetPrefix = '';
    }
  }, []);
  
  return <Component {...pageProps} />;
}

export default MyApp;