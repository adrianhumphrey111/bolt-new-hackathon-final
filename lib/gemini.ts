import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export async function analyzeVideoWithGemini(
  videoUrl: string,
  analysisType: 'full' | 'sample' = 'full'
) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  const prompt = `Analyze this video and provide:
1. Scene descriptions with timestamps
2. Key visual elements and transitions
3. Suggested cuts and editing points
4. Audio quality assessment
5. Overall content summary

${analysisType === 'sample' ? 'Focus on the first 30 seconds only for a quick analysis.' : 'Provide complete analysis of the entire video.'}`;

  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "video/mp4",
          data: videoUrl // You'll need to convert this to base64 or use file upload
        }
      },
      prompt
    ]);

    return {
      analysis: result.response.text(),
      analysisType,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Gemini analysis error:', error);
    throw error;
  }
}