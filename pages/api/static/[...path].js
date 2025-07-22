import { createReadStream } from 'fs';
import { join } from 'path';
import { stat } from 'fs/promises';

export default async function handler(req, res) {
  const { path } = req.query;
  const filePath = join(process.cwd(), 'public', ...path);
  
  try {
    await stat(filePath);
    const stream = createReadStream(filePath);
    stream.pipe(res);
  } catch (error) {
    res.status(404).end('File not found');
  }
}

export const config = {
  api: {
    responseLimit: false,
  },
};