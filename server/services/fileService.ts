import fs from 'fs';
import path from 'path';
import { IncomingForm } from 'formidable';
import type { NextApiRequest } from 'next';

// 添加类型定义
export interface FormidableResult {
  fields: {
    [key: string]: string[];
  };
  files: {
    [key: string]: {
      filepath: string;
      originalFilename?: string;
      size: number;
      mimetype?: string;
    }[];
  };
}

// 确保上传目录存在
export function ensureUploadDir() {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  
  if (!fs.existsSync(uploadDir)) {
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`Created upload directory: ${uploadDir}`);
    } catch (err) {
      console.error(`Failed to create upload directory: ${err}`);
      throw new Error(`Failed to create upload directory: ${err}`);
    }
  }
  
  // 检查目录权限
  try {
    const testFile = path.join(uploadDir, '.test-write-permission');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log('Upload directory has write permission');
  } catch (err) {
    console.error(`Upload directory permission error: ${err}`);
    throw new Error(`Upload directory permission error: ${err}`);
  }
  
  return uploadDir;
}

// 解析表单数据，添加返回类型
export async function parseForm(req: NextApiRequest): Promise<FormidableResult> {
  const uploadDir = ensureUploadDir();
  
  const form = new IncomingForm({
    uploadDir,
    keepExtensions: true,
    maxFileSize: 200 * 1024 * 1024, // 200MB
  });
  
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error('Form parsing error:', err);
        return reject(err);
      }
      
      console.log('Form fields:', fields);
      console.log('Form files:', files);
      
      // 转换为我们定义的类型格式
      const result: FormidableResult = {
        fields: fields as { [key: string]: string[] },
        files: files as any
      };
      
      resolve(result);
    });
  });
}

// 将图片转换为 Base64
export function imageToBase64(filePath: string): string {
  try {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }
    
    // 读取文件
    const data = fs.readFileSync(filePath);
    
    // 转换为 Base64
    return `data:image/jpeg;base64,${data.toString('base64')}`;
  } catch (err) {
    console.error(`Error converting image to Base64: ${err}`);
    throw err;
  }
}