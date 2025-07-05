import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { videos, query, topicFilter, userId } = await request.json();

    if (!videos || videos.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No videos provided for analysis'
      }, { status: 400 });
    }

    // Create comprehensive prompt for multi-video content analysis
    const analysisPrompt = `
You are a world-class video editor and content strategist. Analyze this user's entire video library to find the BEST moments based on their query.

USER QUERY: "${query}"
${topicFilter ? `TOPIC FILTER: "${topicFilter}"` : ''}

VIDEO LIBRARY (${videos.length} videos):
${videos.map((video: any, index: number) => `
VIDEO ${index + 1}: "${video.videoName}"
TRANSCRIPT: ${video.transcript}
DETAILED UTTERANCES: ${JSON.stringify(video.utterances?.slice(0, 20) || [], null, 2)}
VIDEO ANALYSIS: ${video.videoAnalysis || 'No visual analysis'}
LLM ANALYSIS: ${video.finalAnalysis || 'No LLM analysis'}
---
`).join('\n')}

TASK: Based on the user's query "${query}", analyze ALL videos and find the most compelling moments. Consider:

1. **Cross-Video Comparison**: Rank moments across ALL videos, not just within individual videos
2. **Query Matching**: Prioritize content that directly matches "${query}"
${topicFilter ? `3. **Topic Relevance**: Focus on content related to "${topicFilter}"` : ''}
3. **Content Quality**: Consider:
   - Engagement potential (hooks, surprises, valuable insights)
   - Audio clarity (minimal filler words, good pacing)
   - Content value (actionable advice, interesting stories)
   - Emotional impact (excitement, curiosity, inspiration)

4. **Diversity**: Include variety across different videos and content types
5. **Timestamp Precision**: Use exact timestamps from utterances data

CONTENT TYPES TO IDENTIFY:
- 🎣 **Hooks**: Attention-grabbing openings, questions, surprising statements
- 💡 **Key Insights**: Valuable advice, "aha moments", unique perspectives  
- ⭐ **Highlights**: Most engaging or memorable moments
- 🎬 **Intros**: Strong opening segments that set up topics well
- 🎯 **Conclusions**: Powerful endings, call-to-actions, summaries
- 🔄 **Transitions**: Smooth bridges between topics
- 📖 **Stories**: Personal anecdotes, case studies, examples
- 🎪 **Entertainment**: Funny moments, personality, relatability

Return your analysis as a JSON object with this exact structure:
{
  "clips": [
    {
      "id": "video1_clip1",
      "name": "Compelling Hook - Marketing Mistake",
      "type": "hook",
      "startTime": 15.2,
      "endTime": 23.8,
      "confidence": 0.95,
      "reason": "Opens with a relatable mistake that creates immediate curiosity",
      "transcript": "The biggest marketing mistake I see people make is...",
      "videoName": "Marketing Basics.mp4",
      "videoId": "video1_id"
    }
  ]
}

IMPORTANT REQUIREMENTS:
- Return 5-10 of the ABSOLUTE BEST moments (high confidence only: 0.75+)
- Rank by overall quality and relevance to query
- Include precise timestamps from utterances data
- Mix different content types and videos for variety
- "reason" should explain WHY this moment is exceptional
- "transcript" should be exact text from that time segment
- Only include moments that would genuinely improve someone's video

Analyze the content now and return ONLY the JSON response:`;

    // Call Claude API for comprehensive content analysis
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 3000,
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
      throw new Error('Failed to parse content library analysis response');
    }

    // Enhance clips with video URLs and metadata
    if (parsedAnalysis.clips) {
      parsedAnalysis.clips = parsedAnalysis.clips.map((clip: any) => {
        // Find the corresponding video data
        const videoData = videos.find((v: any) => v.videoId === clip.videoId || v.videoName === clip.videoName);
        
        return {
          ...clip,
          videoUrl: videoData?.videoUrl,
          videoName: videoData?.videoName || clip.videoName,
          videoId: videoData?.videoId || clip.videoId,
          createdAt: videoData?.createdAt
        };
      });
    }

    console.log(`✅ Found ${parsedAnalysis.clips?.length || 0} clips across ${videos.length} videos for query: "${query}"`);

    return NextResponse.json(parsedAnalysis);

  } catch (error) {
    console.error('Content library analysis error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}