import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../lib/supabase/server';
import OpenAI from 'openai';

function getOpenAI() {
  if (!process.env.NEXT_OPENAI_API_KEY) {
    throw new Error('NEXT_OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({
    apiKey: process.env.NEXT_OPENAI_API_KEY,
  });
}

interface VideoSearchResult {
  videoId: string;
  videoName: string;
  relevanceScore: number;
  matchingSegments: {
    type: 'transcript' | 'analysis' | 'metadata';
    content: string;
    timestamp?: number;
    confidence: number;
  }[];
  summary: string;
  thumbnailUrl?: string;
  duration: number;
}

export async function POST(request: NextRequest) {
  try {
    const openai = getOpenAI();
    const { user, supabase } = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Pro check removed for demo - AI search available to all users

    const body = await request.json();
    const { projectId, query, searchType = 'semantic' } = body;

    if (!projectId || !query) {
      return NextResponse.json({ 
        error: 'Project ID and search query are required' 
      }, { status: 400 });
    }

    // Fetch videos with their analysis data and transcriptions
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select(`
        id,
        original_name,
        file_path,
        duration,
        thumbnail_url,
        created_at,
        video_analysis (
          id,
          status,
          video_analysis,
          transcription,
          llm_response,
          processing_completed_at
        )
      `)
      .eq('project_id', projectId)
      .eq('video_analysis.status', 'completed');

    if (videosError) {
      return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
    }

    if (!videos || videos.length === 0) {
      return NextResponse.json({ 
        results: [],
        message: 'No analyzed videos found in this project'
      });
    }

    // Prepare data for AI analysis
    const videosWithAnalysis = videos
      .filter(video => video.video_analysis && video.video_analysis.length > 0)
      .map(video => {
        const analysis = video.video_analysis[0];
        return {
          videoId: video.id,
          videoName: video.original_name,
          duration: video.duration || 0,
          thumbnailUrl: video.thumbnail_url,
          transcription: analysis.transcription,
          analysisData: analysis.video_analysis || analysis.llm_response,
          uploadDate: video.created_at
        };
      });

    if (videosWithAnalysis.length === 0) {
      return NextResponse.json({ 
        results: [],
        message: 'No videos with completed analysis found'
      });
    }

    // Use AI for semantic search
    if (searchType === 'semantic') {
      const searchPrompt = `
You are an AI video search assistant. The user is searching for: "${query}"

I have a collection of videos with transcriptions and AI analysis data. Your task is to:
1. Find videos that are semantically relevant to the search query
2. Identify specific segments or content that matches
3. Rank results by relevance
4. Provide explanations for why each video matches

Here's the video data (limited to first 3 for brevity):
${JSON.stringify(videosWithAnalysis.slice(0, 3), null, 2)}

Please respond with a JSON object containing search results ranked by relevance:
{
  "results": [
    {
      "videoId": "video-id",
      "videoName": "video name",
      "relevanceScore": 0.95,
      "matchingSegments": [
        {
          "type": "transcript",
          "content": "relevant text snippet",
          "timestamp": 45.2,
          "confidence": 0.9
        },
        {
          "type": "analysis",
          "content": "relevant analysis insight",
          "confidence": 0.8
        }
      ],
      "summary": "Brief explanation of why this video matches the search",
      "thumbnailUrl": "url-if-available",
      "duration": 120
    }
  ],
  "searchInsights": {
    "totalMatches": 5,
    "searchTerms": ["extracted", "key", "terms"],
    "suggestedFilters": ["content type", "quality level"]
  }
}

Only include videos with relevance scores above 0.3. Focus on finding the most relevant content.
`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert video search AI that helps users find relevant content in their video libraries. Always respond with valid JSON."
          },
          {
            role: "user",
            content: searchPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: 3000
      });

      const aiResponse = completion.choices[0]?.message?.content;
      
      if (!aiResponse) {
        throw new Error('No response from AI search');
      }

      let searchResults;
      try {
        searchResults = JSON.parse(aiResponse);
      } catch (parseError) {
        // Fallback to basic text search if AI parsing fails
        return performBasicSearch(videosWithAnalysis, query);
      }

      return NextResponse.json({
        success: true,
        searchType: 'semantic',
        query,
        ...searchResults
      });

    } else {
      // Basic text search fallback
      return performBasicSearch(videosWithAnalysis, query);
    }

  } catch (error) {
    console.error('Error in AI search endpoint:', error);
    return NextResponse.json({ 
      error: 'Failed to perform search',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function performBasicSearch(videos: any[], query: string): NextResponse {
  const queryLower = query.toLowerCase();
  const results: VideoSearchResult[] = [];

  videos.forEach(video => {
    const matchingSegments: VideoSearchResult['matchingSegments'] = [];
    let relevanceScore = 0;

    // Search in video name
    if (video.videoName.toLowerCase().includes(queryLower)) {
      matchingSegments.push({
        type: 'metadata',
        content: `Video title: ${video.videoName}`,
        confidence: 1.0
      });
      relevanceScore += 0.3;
    }

    // Search in transcription
    if (video.transcription) {
      const transcriptText = typeof video.transcription === 'string' 
        ? video.transcription 
        : JSON.stringify(video.transcription);
      
      if (transcriptText.toLowerCase().includes(queryLower)) {
        const snippetStart = transcriptText.toLowerCase().indexOf(queryLower);
        const snippet = transcriptText.substring(
          Math.max(0, snippetStart - 50), 
          snippetStart + query.length + 50
        );
        
        matchingSegments.push({
          type: 'transcript',
          content: `...${snippet}...`,
          confidence: 0.8
        });
        relevanceScore += 0.5;
      }
    }

    // Search in analysis data
    if (video.analysisData) {
      const analysisText = JSON.stringify(video.analysisData).toLowerCase();
      if (analysisText.includes(queryLower)) {
        matchingSegments.push({
          type: 'analysis',
          content: 'Found in video analysis data',
          confidence: 0.6
        });
        relevanceScore += 0.2;
      }
    }

    // If we found matches, add to results
    if (matchingSegments.length > 0) {
      results.push({
        videoId: video.videoId,
        videoName: video.videoName,
        relevanceScore,
        matchingSegments,
        summary: `Found ${matchingSegments.length} matching segment(s)`,
        thumbnailUrl: video.thumbnailUrl,
        duration: video.duration
      });
    }
  });

  // Sort by relevance score
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return NextResponse.json({
    success: true,
    searchType: 'basic',
    query,
    results,
    searchInsights: {
      totalMatches: results.length,
      searchTerms: [query],
      suggestedFilters: []
    }
  });
}