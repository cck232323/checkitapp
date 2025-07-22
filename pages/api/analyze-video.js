import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function handler(req, res) {
  try {
    const { videoPath } = req.body;
    
    // 调用 Python 脚本
    const { stdout } = await execAsync(`python analyzer-backend/video_analyzer.py "${videoPath}"`);
    
    // 解析结果
    const result = JSON.parse(stdout);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze video' });
  }
}