import OpenAI from 'openai';

// 初始化 OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 分析内容
export async function analyzeWithGPT(content: string, type: string): Promise<string> {
  let prompt = '';
  
  console.log(`Analyzing ${type} content with GPT`);
  
  if (type === 'text') {
    prompt = `Analyze the following text for truthfulness and potential deception:\n\n${content}\n\nProvide a detailed analysis of the language patterns, potential inconsistencies, and indicators of truthfulness or deception.`;
    console.log(`Text prompt created, length: ${prompt.length}`);
    
    try {
      // Check if OpenAI API key is set
      if (!process.env.OPENAI_API_KEY) {
        console.error('OPENAI_API_KEY environment variable is not set');
        throw new Error('OpenAI API key is not configured');
      }
      
      console.log('Calling OpenAI API...');
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert in detecting deception and analyzing truthfulness in various media." },
          { role: "user", content: prompt }
        ],
        max_tokens: 1000,
      });
      
      console.log('OpenAI API response received successfully');
      return response.choices[0].message?.content || "No analysis available";
    } catch (error: any) {
      console.error('Error analyzing with GPT:', error.message);
      if (error.response) {
        console.error('OpenAI API error response:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      throw new Error(`Failed to analyze content with GPT: ${error.message}`);
    }
  } else if (type === 'image' || type === 'video-frame') {
    prompt = `Based on the images provided, analyze facial expressions, body language, and other visual cues to assess possible signs of deception or truthfulness. Consider overall demeanor, eye contact, posture, and any visible emotional expressions. Perform a qualitative analysis, focusing on possible biased conclusions rather than absolute final judgments.`;
    console.log(`Image prompt created`);
    
    try {
      // Check if OpenAI API key is set
      if (!process.env.OPENAI_API_KEY) {
        console.error('OPENAI_API_KEY environment variable is not set');
        throw new Error('OpenAI API key is not configured');
      }
      
      console.log('Calling OpenAI API for image analysis...');
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "After you have collected information about the person in the picture, such as facial expressions and body language, give a general description, such as the characteristics of the facial expressions, the characteristics of the body language and behavior, etc. then,Based on the images provided, analyze facial expressions, body language, and other visual cues to assess possible signs of deception or truthfulness. Consider overall demeanor, eye contact, posture, and any visible emotional expressions. Perform a qualitative analysis, focusing on possible biased conclusions rather than absolute final judgments" },
          { 
            role: "user", 
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: content } }
            ]
          }
        ],
        max_tokens: 1000,
      });
      
      console.log('OpenAI API response received successfully for image');
      return response.choices[0].message?.content || "No analysis available";
    } catch (error: any) {
      console.error('Error analyzing image with GPT:', error.message);
      if (error.response) {
        console.error('OpenAI API error response:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      throw new Error(`Failed to analyze image with GPT: ${error.message}`);
    }
  }
  
  return "Unsupported content type";
}

// 生成综合分析
export async function generateOverallAnalysis(audioAnalysis: string, frameAnalyses: Array<{framePath: string, analysis: string}>): Promise<string> {
  // 构建综合分析的提示
  let overallPrompt = "Based on the following analyses of video frames and audio content, provide a comprehensive assessment of potential deception or truthfulness:\n\n";
  
  // 添加音频分析
  overallPrompt += "AUDIO ANALYSIS:\n" + audioAnalysis + "\n\n";
  
  // 添加帧分析
  overallPrompt += "FRAME ANALYSES:\n";
  frameAnalyses.forEach((frame, index) => {
    overallPrompt += `Frame ${index + 1}:\n${frame.analysis}\n\n`;
  });
  
  overallPrompt += "Please provide a comprehensive analysis that integrates both the visual cues from the frames and the linguistic patterns from the audio. Focus on consistency between verbal and non-verbal communication, and highlight any potential indicators of deception or truthfulness.";
  
  try {
    console.log('Generating overall analysis with GPT...');
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an expert in detecting deception by analyzing both visual and verbal cues. Provide a comprehensive analysis that integrates multiple sources of information." },
        { role: "user", content: overallPrompt }
      ],
      max_tokens: 1500,
    });
    
    return response.choices[0].message?.content || "No overall analysis available.";
  } catch (error: any) {
    console.error('Error generating overall analysis:', error.message);
    if (error.response) {
      console.error('OpenAI API error response:', {
        status: error.response.status,
        data: error.response.data
      });
    }
    throw new Error(`Failed to generate overall analysis: ${error.message}`);
  }
}