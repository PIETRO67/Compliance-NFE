import type { NextConfig } from 'next';
const config: NextConfig = { output: process.env.NODE_ENV==='production'?'export':undefined, distDir:process.env.NODE_ENV==='production'?'.next':'.next-dev', devIndicators:false, outputFileTracingRoot: process.cwd(), images: { unoptimized: true } };
export default config;
