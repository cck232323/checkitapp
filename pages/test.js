import React from 'react';
import Link from 'next/link';

export default function Test() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Test Page</h1>
      <p>If you can see this page, the basic Next.js setup is working.</p>
      <div>
        <Link href="/">
          <a style={{ color: 'blue', textDecoration: 'underline' }}>Go to Home</a>
        </Link>
      </div>
    </div>
  );
}