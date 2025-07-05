import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { transcript, utterances, videoAnalysis, finalAnalysis, query, videoId } = await request.json();

    // Get video metadata for URL generation
    const { data: videoData } = await supabase
      .from('videos')
      .select('file_path, original_name')
      .eq('id', videoId)
      .single();

    // Create a comprehensive prompt for content structure analysis
    const analysisPrompt = `
You are a world-class video editor and content strategist. Analyze this video content to identify the BEST moments for hooks, highlights, and key segments.

TRANSCRIPT:
${transcript}

DETAILED UTTERANCES WITH TIMESTAMPS:
${JSON.stringify(utterances, null, 2)}

VIDEO ANALYSIS:
${videoAnalysis || 'No visual analysis available'}

LLM ANALYSIS:
${finalAnalysis || 'No final analysis available'}

USER QUERY: "${query}"

Based on the query, identify the most compelling moments in this video. Consider:

1. **Hook Analysis**: What moments would grab viewers' attention immediately?
   - Surprising statements or revelations
   - Emotional peaks or compelling questions
   - Action-packed or visually interesting moments
   - Strong opening statements

2. **Content Structure**: Identify key sections:
   - Introduction/setup
   - Main points or key arguments
   - Climax or most engaging moments
   - Conclusions or calls to action
   - Transition points

3. **Engagement Factors**: Look for:
   - Emotional resonance (excitement, surprise, concern)
   - Valuable insights or "aha" moments
   - Storytelling elements (conflict, resolution)
   - Clear, impactful statements

4. **Technical Quality**: Consider:
   - Clear speech without excessive filler words
   - Good pacing and energy
   - Moments without background noise or interruptions

Return your analysis as a JSON object with this exact structure:
{
  "clips": [
    {
      "id": "clip_1",
      "name": "Compelling Hook - Opening Statement",
      "type": "hook",
      "startTime": 15.2,
      "endTime": 23.8,
      "confidence": 0.95,
      "reason": "Strong opening question that creates immediate curiosity",
      "transcript": "Have you ever wondered why most people fail at this one thing?"
    }
  ]
}

IMPORTANT REQUIREMENTS:
- Include precise timestamps (startTime/endTime) based on the utterances data
- Confidence should be 0.7-1.0 (only include high-confidence recommendations)
- "reason" should explain WHY this moment is compelling
- "transcript" should be the exact text from that time segment
- Types: "hook", "intro", "main_point", "conclusion", "transition", "highlight"
- Find 3-5 of the BEST moments, not every possible moment
- Focus on moments that would make someone want to keep watching

Analyze the content now and return ONLY the JSON response:`;

    // Call Claude API for content analysis
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: analysisPrompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.statusText}`);
    }

    const result = await response.json();
    const analysisText = result.content[0].text;

    // Parse the JSON response from Claude
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
      console.error('Failed to parse Claude response:', analysisText);
      throw new Error('Failed to parse content analysis response');
    }

    // Enhance clips with video URLs if available
    if (parsedAnalysis.clips && videoData?.file_path) {
      parsedAnalysis.clips = parsedAnalysis.clips.map((clip: any) => ({
        ...clip,
        videoUrl: videoData.file_path,
        videoName: videoData.original_name || 'Video'
      }));
    }

    return NextResponse.json(parsedAnalysis);

  } catch (error) {
    console.error('Content structure analysis error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}