import type { NextApiRequest, NextApiResponse } from 'next';
import { getAnalysisResult } from 'server/services/dbService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ message: 'Invalid ID parameter' });
  }

  try {
    const result = await getAnalysisResult(id);
    console.log('Retrieved analysis result:', JSON.stringify(result, null, 2));
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error retrieving analysis result:', error);
    return res.status(500).json({ message: error.message || 'Failed to retrieve analysis result' });
  }
}