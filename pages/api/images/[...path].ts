import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path: pathSegments } = req.query;
  
  console.log("API 路由接收到图片请求:", req.url);
  console.log("路径段:", pathSegments);
  
  if (!pathSegments || !Array.isArray(pathSegments)) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  
  // 构建完整的文件路径
  const fullPath = path.join(process.cwd(), 'public', ...pathSegments);
  console.log("尝试加载文件:", fullPath);
  
  try {
    if (!fs.existsSync(fullPath)) {
      console.error(`File not found: ${fullPath}`);
      return res.status(404).end('File not found');
    }
    
    const imageBuffer = fs.readFileSync(fullPath);
    
    // 设置正确的 Content-Type
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 
                        ext === '.png' ? 'image/png' : 
                        ext === '.gif' ? 'image/gif' : 
                        'application/octet-stream';
    
    res.setHeader('Content-Type', contentType);
    res.send(imageBuffer);
  } catch (error: any) {
    console.error(`Error serving image: ${fullPath}`, error);
    res.status(500).end(`Error serving image: ${error.message}`);
  }
}

export const config = {
  api: {
    responseLimit: false,
  },
};