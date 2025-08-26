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
    prompt = `You are assessing authenticity vs. possible deception in a text. 
Do NOT make definitive claims; reason in terms of likelihoods grounded in linguistic evidence only.

If the TEXT below is empty or <10 characters, return exactly: INSUFFICIENT TEXT

Analyze the TEXT (delimited by triple dashes) and return a Markdown report with EXACTLY these sections and headings:

- Key Information Extraction
- Linguistic Cues
- Consistency and Logic
- Required External Evidence
- Alternative Explanations
- Judgment and Confidence

Calibrated confidence rule (MANDATORY):
- Start from 50 (neutral baseline).
- For EACH well-supported truthful/benign cue (with a short quote), +5.
- For EACH well-supported deceptive cue (with a short quote), -5.
- If a cue is weak/ambiguous, ±0 (do not count it).
- Cap total adjustments in [-20, +20].
- The final confidence RANGE must be width ≤ 10 (e.g., 62–70).
- Map final score S to label:
  * S < 45 → "leans deceptive"
  * 45 ≤ S ≤ 55 → "neutral"
  * S > 55 → "leans truthful"
- Include a one-line "Computation" showing counted cues (e.g., "Base 50, +15 (3 truthful cues), -5 (1 deceptive cue) → 60").
- Objective contradiction rule (HARD): If the TEXT contains any objectively verifiable factual or mathematical contradiction 
  (e.g., '1+1=3', or violating a definition such as 'a triangle has four sides'), then set S ≤ 35 and the confidence interval entirely within [20, 40],
  regardless of other cues, unless the text explicitly marks it as a joke, fiction, or self-correction.

- Before scoring, perform 'Objective Checks': list strictly checkable claims (arithmetic, definitions) and mark each VALID/INVALID.
  Use these results to apply the HARD rule above.

- Output anchors (MANDATORY at the end):
  "Score S: <0-100>"
  "Confidence Interval: <L>–<U>"
  "Counted Cues: +<t> truthful, -<d> deceptive"
  If the HARD rule is triggered, also print: "Hard Rule Triggered: Objective Contradiction".

Constraints:
- Use ENGLISH only.
- Be specific and evidence-based; every counted cue must include a brief quotation.
- Keep the whole report around 300–500 words.
- Avoid emotive language or personal attacks.

TEXT:
---
${content}
---`;
//     prompt = `Please analyze the following text for authenticity and potential deception. Please note: You cannot draw a definitive conclusion; you can only assess its likelihood and relevance based on the linguistic evidence and explain your reasons.

// Analysis Steps

// 1) Key Information Extraction: List the claims and facts in the text one by one (key points list).

// 2) Linguistic Clues: Identify linguistic features that may indicate deception or authenticity (such as ambiguity, evasion, over-embellishment, changes in tense or person, logical jumps, etc.), providing a short quote from the original text for each clue.

// 3) Consistency and Logic: Identify inconsistencies, timeline issues, and the completeness of the causal chain.

// 4) External Evidence Required: If verification is required, what objective evidence should be obtained (list).

// 5) Alternative Explanations: Provide at least one "non-deception" explanation for any suspected clues to avoid over-inference.

// 6) Conclusion and Confidence: Provide a calibrated judgment of "more likely to be true/neutral/more likely to be deceptive" and provide a confidence interval from 0–100 (e.g., 55–65).

// Output Format (Markdown)
// - Key Information Extraction
// - Linguistic Clues
// - Consistency and Logic
// - Required External Evidence
// - Alternative Explanations
// - Conclusion and Confidence

// Analyzed Text:
// ---
// ${content}
// ---
// (Please limit your output to approximately 400–600 characters, express yourself in bulleted terms, and avoid emotionally charged language. If the text is less than 10 characters, please limit it to 100 characters.)`;
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
    // prompt = `Based on the images provided, analyze facial expressions, body language, and other visual cues to assess possible signs of deception or truthfulness. Consider overall demeanor, eye contact, posture, and any visible emotional expressions. Perform a qualitative analysis, focusing on possible biased conclusions rather than absolute final judgments.`;
    prompt = `Based on the provided image, please conduct a qualitative analysis of the "possible emotional and communication cues" to help determine the likelihood of truthfulness/deception. 
Note: Images can only provide limited context; avoid definitive conclusions or identity inferences.

Analysis Steps

1) Visible Clues: Facial expressions (AU/basic emotion potential), gaze direction, blink rate trends, mouth and brow tension, head posture, open/closed body posture, gestures (e.g., self-soothing), and overall tension cues.

2) Clue Meaning and Uncertainty: Explain each clue's possible and reasonable non-deceptive interpretations (e.g., fatigue, lighting, angle, cultural differences, etc.).

3) Scene and Shooting Factors: Resolution, lighting, occlusion, camera angle, and potential for misinterpretation.

4) Overall Judgment and Confidence: Assign ONLY a weak-signal judgment of "more likely truthful / neutral / more likely deceptive" and set a 0–100 confidence interval (e.g., 65–75). 
**Calibration rule**:  
- Start from 50 baseline.  
- Add +5 for each visual cue suggesting truthfulness.  
- Subtract −5 for each visual cue suggesting deception.  
- Cap total adjustments in [-20, +20].  
- Interpretation: Higher score = more likely truthful; Lower score = more likely deceptive.
- Objective contradiction rule (HARD): If the TEXT contains any objectively verifiable factual or mathematical contradiction 
  (e.g., '1+1=3', or violating a definition such as 'a triangle has four sides'), then set S ≤ 35 and the confidence interval entirely within [20, 40],
  regardless of other cues, unless the text explicitly marks it as a joke, fiction, or self-correction.

- Before scoring, perform 'Objective Checks': list strictly checkable claims (arithmetic, definitions) and mark each VALID/INVALID.
  Use these results to apply the HARD rule above.

- Output anchors (MANDATORY at the end):
  "Score S: <0-100>"
  "Confidence Interval: <L>–<U>"
  "Counted Cues: +<t> truthful, -<d> deceptive"
  If the HARD rule is triggered, also print: "Hard Rule Triggered: Objective Contradiction".

Output Format (Markdown)
- Visible Clues
- Clue Meaning and Uncertainty
- Scene and Shooting Factors
- Overall Judgment and Confidence

(Strictly avoid identifying individuals or making appearance judgments; limit to 300-500 words, bullet points style.)`;
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
  // Check if we have valid inputs
  if (!audioAnalysis && (!frameAnalyses || frameAnalyses.length === 0)) {
    console.log('No audio or frame analyses to generate overall analysis from');
    return "Insufficient data to generate a comprehensive analysis.";
  }
  
  // Construct a prompt with available data
  // let overallPrompt = "Based on the following analyses, provide a comprehensive assessment of potential deception or truthfulness:\n\n";
  let overallPrompt = `Please generate a final synthesis report (Markdown, approximately 500–700 words)

1) List of key claims (from text/audio/image)

2) Intramodal conclusions: Summarize the main evidence and limitations for "text," "audio," and "images/frames" respectively

3) Cross-modal consistency: Identify areas of mutual support and contradiction (with examples)

4) Required external evidence: What verification is required to significantly reduce uncertainty

5) Final judgment and confidence level: Provide a **calibrated conclusion** of "more likely truthful / neutral / more likely deceptive" + a 0–100 confidence interval (e.g., 65–75).  
**Calibration rule**:  
- Start from 50 baseline.  
- Add +5 for each well-supported truthful/benign cue (with a short example).  
- Subtract −5 for each well-supported deceptive cue (with a short example).  
- If cue is weak or ambiguous, ±0.  
- Cap total adjustments in [-20, +20].  
- Interpretation: Higher score = more likely truthful; Lower score = more likely deceptive.
- Objective contradiction rule (HARD): If the TEXT contains any objectively verifiable factual or mathematical contradiction 
  (e.g., '1+1=3', or violating a definition such as 'a triangle has four sides'), then set S ≤ 35 and the confidence interval entirely within [20, 40],
  regardless of other cues, unless the text explicitly marks it as a joke, fiction, or self-correction.

- Before scoring, perform 'Objective Checks': list strictly checkable claims (arithmetic, definitions) and mark each VALID/INVALID.
  Use these results to apply the HARD rule above.

- Output anchors (MANDATORY at the end):
  "Score S: <0-100>"
  "Confidence Interval: <L>–<U>"
  "Counted Cues: +<t> truthful, -<d> deceptive"
  If the HARD rule is triggered, also print: "Hard Rule Triggered: Objective Contradiction".

6) Risk warning: List factors that may lead to misjudgment (sampling bias, image quality, editing, lack of context)

(Please exercise restraint and professionalism, avoid interpreting correlation as causation; do not make legal or medical conclusions.)`;
  // Add audio analysis if available
  if (audioAnalysis) {
    overallPrompt += "AUDIO ANALYSIS:\n" + audioAnalysis + "\n\n";
  }
  
  // Add frame analyses if available
  if (frameAnalyses && frameAnalyses.length > 0) {
    overallPrompt += "FRAME ANALYSES:\n";
    // Limit to first 3 frames to avoid token limits
    const framesToInclude = frameAnalyses.slice(0, 3);
    framesToInclude.forEach((frame, index) => {
      overallPrompt += `Frame ${index + 1}:\n${frame.analysis}\n\n`;
    });
    
    if (frameAnalyses.length > 3) {
      overallPrompt += `(${frameAnalyses.length - 3} additional frames were analyzed but not included in this prompt)\n\n`;
    }
  }
  
  overallPrompt += "Please provide a comprehensive analysis that integrates both the visual cues from the frames and the linguistic patterns from the audio. Focus on consistency between verbal and non-verbal communication, and highlight any potential indicators of deception or truthfulness.";
  
  try {
    console.log('Generating overall analysis with GPT...');
    console.log('Prompt length:', overallPrompt.length);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an expert in detecting deception by analyzing both visual and verbal cues. Provide a comprehensive analysis that integrates multiple sources of information." },
        { role: "user", content: overallPrompt }
      ],
      max_tokens: 1500,
    });
    
    const analysisText = response.choices[0].message?.content || "No overall analysis available.";
    console.log('Generated overall analysis:', analysisText.substring(0, 100) + '...');
    return analysisText;
  } catch (error: any) {
    console.error('Error generating overall analysis:', error.message);
    if (error.response) {
      console.error('OpenAI API error response:', {
        status: error.response.status,
        data: error.response.data
      });
    }
    return `Failed to generate overall analysis: ${error.message}. Please refer to individual analyses for details.`;
  }
}
