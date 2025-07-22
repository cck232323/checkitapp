import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const { path: filePath } = req.query;
  
  // 构建完整的文件路径
  // 注意：如果路径中包含 'public'，我们需要移除它
  const pathWithoutPublic = Array.isArray(filePath) ? 
    filePath.filter(segment => segment !== 'public') : 
    filePath;
  
  const fullPath = path.join(process.cwd(), 'public', ...pathWithoutPublic);
  
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
  } catch (error) {
    console.error(`Error serving image: ${fullPath}`, error);
    res.status(500).end('Error serving image');
  }
}

export const config = {
  api: {
    responseLimit: false,
  },
};