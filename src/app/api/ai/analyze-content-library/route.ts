import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/lib/ai-service';

export async function POST(request: NextRequest) {
  try {
    const { videos, query, topicFilter, userId, analysisType } = await request.json();

    if (!videos || videos.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No videos provided for analysis'
      }, { status: 400 });
    }

    // Create appropriate prompt based on analysis type
    const isCachedSearch = analysisType === 'cached_content_search';
    
    const basePrompt = isCachedSearch ? `
You are an expert video editor helping find specific clips from analyzed videos. The user has a CACHED LIBRARY of analyzed videos and wants precise clips with exact timestamps.

USER REQUEST: "${query}"
${topicFilter ? `TOPIC FILTER: "${topicFilter}"` : ''}

ANALYZED VIDEO LIBRARY (${videos.length} videos):
${videos.map((video: any, index: number) => `
📹 VIDEO ${index + 1}: "${video.videoName}"
📝 FULL TRANSCRIPT: ${video.transcript}
🧠 LLM ANALYSIS: ${video.llmAnalysis ? JSON.stringify(video.llmAnalysis, null, 2) : 'No LLM analysis'}
🎬 VIDEO ANALYSIS: ${video.videoAnalysis ? JSON.stringify(video.videoAnalysis, null, 2) : 'No visual analysis'}
⏰ CREATED: ${video.createdAt}
---
`).join('\n')}` : `
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
`).join('\n')}`;

    const taskPrompt = isCachedSearch ? `
TASK: Find the EXACT clips the user requested: "${query}"

SPECIAL INSTRUCTIONS FOR CACHED SEARCH:
1. **Be VERY SPECIFIC** to the user's request - if they ask for "2 best hooks about 4 to 7 seconds", find exactly that
2. **Use transcript text** to identify the best segments that match the request
3. **Duration Precision**: If they specify duration (like "4 to 7 seconds"), find clips in that range
4. **Quality over Quantity**: Return only the BEST matches, not filler content
5. **Exact Timestamps**: Estimate timestamps based on transcript analysis (assume average speaking pace of ~150 words/minute)

For the request "${query}":
- Identify the TYPE of content requested (hook, intro, conclusion, etc.)
- Find segments that match the specified duration if mentioned
- Look for high-energy, engaging moments that would work well for the requested purpose
- Prioritize content with strong opening lines, questions, surprising statements, or valuable insights

RESPONSE FORMAT - Return ONLY this JSON structure:
{
  "success": true,
  "clips": [
    {
      "id": "video_id_timestamp",
      "name": "Descriptive clip name",
      "type": "hook|intro|main_point|conclusion|transition|highlight",
      "startTime": 0.0,
      "endTime": 6.5,
      "confidence": 0.95,
      "reason": "Why this clip is perfect for the user's request",
      "transcript": "Exact words from this time segment",
      "videoName": "Original video name",
      "videoId": "video_id_here"
    }
  ]
}

Find the clips now:` : `
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

    const analysisPrompt = basePrompt + '\n\n' + taskPrompt;

    console.log('🤖 Using AI Service provider:', aiService.getCurrentProvider());
    console.log('📝 Analyzing content with prompt length:', analysisPrompt.length);

    // Use the configured AI service (OpenAI)
    const analysisText = await aiService.complete(
      analysisPrompt,
      undefined, // no system prompt needed since it's in the user prompt
      {
        model: 'gpt-4o', // Use GPT-4o for best results
        max_tokens: 4000,
        temperature: 0.3
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

    // Ensure consistent response format
    const response = {
      success: true,
      clips: parsedAnalysis.clips || [],
      ...parsedAnalysis
    };

    return NextResponse.json(response);

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