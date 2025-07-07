import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '../../../lib/ai-service';

export async function POST(request: NextRequest) {
  try {
    const { videos, removalQuery, analysisType } = await request.json();

    if (!videos || videos.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No videos provided for content removal analysis'
      }, { status: 400 });
    }

    if (!removalQuery) {
      return NextResponse.json({
        success: false,
        error: 'No removal query provided'
      }, { status: 400 });
    }

    console.log('🤖 Using AI Service provider:', aiService.getCurrentProvider());
    console.log('✂️ Analyzing content for removal:', removalQuery);

    // Create specialized prompt for content removal analysis
    const removalPrompt = `You are an expert video editor specialized in content cleanup and optimization. Analyze the provided videos to identify segments that should be removed based on the user's request.

USER REMOVAL REQUEST: "${removalQuery}"

VIDEO CONTENT TO ANALYZE (${videos.length} videos):
${videos.map((video: any, index: number) => `
📹 VIDEO ${index + 1}: "${video.videoName}"
📝 FULL TRANSCRIPT: ${video.transcript}
⏱️ WORD-LEVEL TIMESTAMPS: ${JSON.stringify(video.utterances || [], null, 2)}
🧠 LLM ANALYSIS: ${video.llmAnalysis ? JSON.stringify(video.llmAnalysis, null, 2) : 'No LLM analysis'}
🎬 VIDEO ANALYSIS: ${video.videoAnalysis ? JSON.stringify(video.videoAnalysis, null, 2) : 'No visual analysis'}
📹 VIDEO ID: ${video.videoId}
---
`).join('\n')}

TASK: Based on the removal request "${removalQuery}", identify ALL segments that should be cut out.

CRITICAL REQUIREMENTS:
1. **PRECISE TIMESTAMPS**: Use ONLY the word-level timestamps from the utterances array
2. **EXACT MATCHING**: Find the specific words/phrases in the utterances and use their exact start/end times
3. **NO ESTIMATION**: Never estimate or approximate timestamps - only use data from utterances
4. **COMPREHENSIVE**: Find ALL instances that match the removal criteria

REMOVAL CATEGORIES TO DETECT:
- **Silence**: Long pauses, dead air, awkward silences (>2 seconds typically)
- **Filler Words**: "um", "uh", "like", "you know", "basically", "actually", "so", "right"
- **Specific Content**: Exact words, phrases, or topics user wants removed
- **Quality Issues**: Stammers, false starts, repetitions, throat clearing, coughs
- **Off-Topic**: Content not related to main topic or purpose
- **Unwanted Content**: Inappropriate content, mistakes, technical difficulties

TIMESTAMP EXTRACTION PROCESS:
1. Read the removal request carefully
2. Scan the transcript for matching content
3. Locate the EXACT same words in the utterances array
4. Extract the "start" time from the first matching utterance
5. Extract the "end" time from the last matching utterance
6. Verify the transcript text matches the utterances text exactly

RESPONSE FORMAT - Return ONLY this JSON structure:
{
  "success": true,
  "cuts": [
    {
      "id": "cut_1",
      "startTime": 15.2,
      "endTime": 16.8,
      "type": "filler_word",
      "reason": "Filler word 'um' interrupts flow",
      "transcript": "um",
      "confidence": 0.95,
      "videoId": "video_id_here",
      "videoName": "Video Name Here"
    },
    {
      "id": "cut_2", 
      "startTime": 45.6,
      "endTime": 48.2,
      "type": "silence",
      "reason": "Long pause (2.6 seconds) breaks engagement",
      "transcript": "[silence]",
      "confidence": 0.90,
      "videoId": "video_id_here",
      "videoName": "Video Name Here"
    }
  ]
}

TYPES:
- "silence": Long pauses, dead air
- "filler_word": Um, uh, like, you know, etc.
- "specific_content": User-requested words/phrases/topics
- "unwanted_content": Mistakes, inappropriate content
- "quality_issue": Stammers, coughs, false starts
- "off_topic": Content not related to main purpose

CONFIDENCE LEVELS:
- 0.9-1.0: Definite removal (clear filler words, obvious mistakes)
- 0.7-0.89: Recommended removal (long pauses, repetitions)
- 0.5-0.69: Optional removal (marginal content, style preferences)

IMPORTANT:
- ONLY use timestamps from the utterances array
- Include transcript text that exactly matches the utterances
- Be thorough but accurate - better to miss a cut than use wrong timestamps
- Focus on cuts that genuinely improve the video quality
- Consider the user's specific request and intent

Analyze the content now and return ONLY the JSON response:`;

    // Use the configured AI service (OpenAI)
    const analysisText = await aiService.complete(
      removalPrompt,
      undefined, // no system prompt needed since it's in the user prompt
      {
        model: 'gpt-4o', // Use GPT-4o for best results
        max_tokens: 4000,
        temperature: 0.1 // Lower temperature for more consistent, accurate results
      }
    );

    // Parse the JSON response from OpenAI
    let parsedAnalysis;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedAnalysis = JSON.parse(jsonMatch[0]);
      } else {
        parsedAnalysis = JSON.parse(analysisText);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', analysisText);
      throw new Error('Failed to parse content removal analysis response');
    }

    // Validate and enhance the response
    if (parsedAnalysis.cuts) {
      parsedAnalysis.cuts = parsedAnalysis.cuts.map((cut: any, index: number) => ({
        ...cut,
        id: cut.id || `cut_${index + 1}`,
        // Ensure all required fields are present
        startTime: typeof cut.startTime === 'number' ? cut.startTime : 0,
        endTime: typeof cut.endTime === 'number' ? cut.endTime : 0,
        type: cut.type || 'unwanted_content',
        reason: cut.reason || 'Content flagged for removal',
        transcript: cut.transcript || '',
        confidence: typeof cut.confidence === 'number' ? cut.confidence : 0.5,
        videoId: cut.videoId || videos[0]?.videoId || 'unknown',
        videoName: cut.videoName || videos[0]?.videoName || 'Unknown Video'
      }));
    }

    console.log(`✂️ Found ${parsedAnalysis.cuts?.length || 0} segments for removal`);

    // Ensure consistent response format
    const response = {
      success: true,
      cuts: parsedAnalysis.cuts || [],
      message: parsedAnalysis.cuts && parsedAnalysis.cuts.length > 0 
        ? `Identified ${parsedAnalysis.cuts.length} segments for removal`
        : 'No segments identified for removal',
      ...parsedAnalysis
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Content removal analysis error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}