/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  distDir: '.next',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // domains: ['localhost'],
    domains: ['localhost', '54.252.137.28'],
    unoptimized: true,
  },

  // ✅ 自动根据环境选择后端 URL
  // env: {
  //   BACKEND_API_URL:
  //     process.env.BACKEND_API_URL ||
  //     (process.env.NODE_ENV === 'production'
  //       ? 'http://localhost:5000'
  //       : 'http://backend:5000'),
  //   NEXT_PUBLIC_BACKEND_URL:
  //     process.env.BACKEND_API_URL ||
  //     (process.env.NODE_ENV === 'production'
  //       ? 'http://localhost:5000'
  //       : 'http://backend:5000'),
  // },
  env: {
  BACKEND_API_URL:
    process.env.BACKEND_API_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'http://backend:5000'
      : 'http://localhost:5000'),

  NEXT_PUBLIC_BACKEND_URL:
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'http://54.252.137.28/api'
      : 'http://localhost:5000'),
},

  serverRuntimeConfig: {
    PROJECT_ROOT: __dirname,
  },
  publicRuntimeConfig: {
    staticFolder: '/public',
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/public/uploads/:path*',
      },
    ];
  },
};

module.exports = nextConfig;

// // module.exports = nextConfig;
// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   output: 'standalone',
//   reactStrictMode: true,
//   distDir: '.next',
//   eslint: {
//     ignoreDuringBuilds: true,
//   },
//   typescript: {
//     ignoreBuildErrors: true,
//   },
//   images: {
//     domains: ['localhost'],
//     unoptimized: true,
//   },
//   env: {
//     BACKEND_API_URL: process.env.BACKEND_API_URL || 'http://backend:5000',
//     NEXT_PUBLIC_BACKEND_URL: process.env.BACKEND_API_URL || 'http://backend:5000',
//   },
//   serverRuntimeConfig: {
//     PROJECT_ROOT: __dirname,
//   },
//   publicRuntimeConfig: {
//     staticFolder: '/public',
//   },
//   async rewrites() {
//     return [
//       {
//         source: '/uploads/:path*',
//         destination: '/public/uploads/:path*',
//       },
//     ];
//   },
// };

// module.exports = nextConfig;