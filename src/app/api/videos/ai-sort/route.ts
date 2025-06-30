import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../lib/supabase/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.NEXT_OPENAI_API_KEY,
});

interface VideoWithAnalysis {
  id: string;
  original_name: string;
  file_path: string;
  duration: number;
  created_at: string;
  video_analysis: any;
}

interface SortOption {
  id: string;
  name: string;
  description: string;
  sortKey: string;
  dataType: 'string' | 'number' | 'date' | 'array';
}

interface AIVideoAnalysis {
  videoId: string;
  videoName: string;
  duration: number;
  quality: {
    overall: string;
    visual: string;
    audio: string;
  };
  content: {
    type: string;
    mood: string;
    topics: string[];
    complexity: string;
  };
  technical: {
    editingViability: number;
    scriptAlignment: number;
    speechQuality: string;
  };
  metadata: {
    uploadDate: string;
    processingDate: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError, supabase } = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is pro
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (userError || userData?.subscription_tier !== 'pro') {
      return NextResponse.json({ 
        error: 'AI sorting requires a Pro subscription',
        upgrade_required: true 
      }, { status: 403 });
    }

    const url = new URL(request.url);
    const projectId = url.searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Fetch videos with their analysis data
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select(`
        id,
        original_name,
        file_path,
        duration,
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
        sortOptions: [],
        videoData: [],
        message: 'No analyzed videos found in this project'
      });
    }

    // Extract analysis data for AI processing
    const analysisData = videos
      .filter(video => video.video_analysis && video.video_analysis.length > 0)
      .map(video => {
        const analysis = video.video_analysis[0];
        return {
          videoId: video.id,
          videoName: video.original_name,
          duration: video.duration || 0,
          analysisData: analysis.video_analysis || analysis.llm_response,
          transcription: analysis.transcription,
          processingDate: analysis.processing_completed_at,
          uploadDate: video.created_at
        };
      });

    if (analysisData.length === 0) {
      return NextResponse.json({ 
        sortOptions: [],
        videoData: [],
        message: 'No videos with completed analysis found'
      });
    }

    // Use OpenAI to analyze the video data and generate sort options
    const prompt = `
You are an AI video analysis assistant. I have a collection of videos with AI analysis data. Your task is to:

1. Analyze the video analysis data to identify the best sorting and filtering options
2. Generate meaningful sort categories based on the actual data patterns
3. Extract standardized values for each video that can be used for sorting

Here's the video analysis data:
${JSON.stringify(analysisData.slice(0, 5), null, 2)}

Based on this data, please respond with:
1. A list of intelligent sort options that would be most useful for video editors
2. Processed video data with standardized values for sorting

Response should be in this JSON format:
{
  "sortOptions": [
    {
      "id": "quality_overall",
      "name": "Video Quality",
      "description": "Sort by overall video quality assessment",
      "sortKey": "quality.overall",
      "dataType": "string"
    }
  ],
  "videoData": [
    {
      "videoId": "...",
      "videoName": "...",
      "duration": 120,
      "quality": {
        "overall": "high",
        "visual": "excellent",
        "audio": "good"
      },
      "content": {
        "type": "interview",
        "mood": "professional",
        "topics": ["business", "technology"],
        "complexity": "medium"
      },
      "technical": {
        "editingViability": 8.5,
        "scriptAlignment": 7.2,
        "speechQuality": "clear"
      },
      "metadata": {
        "uploadDate": "...",
        "processingDate": "..."
      }
    }
  ]
}

Focus on creating sort options that would be most valuable for video editors working with these types of videos.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert video analysis AI that helps video editors organize and sort their media efficiently. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4000
    });

    const aiResponse = completion.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    // Parse AI response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponse);
    } catch (parseError) {
      // If JSON parsing fails, create a fallback response
      parsedResponse = {
        sortOptions: [
          {
            id: "upload_date",
            name: "Upload Date",
            description: "Sort by when the video was uploaded",
            sortKey: "metadata.uploadDate",
            dataType: "date"
          },
          {
            id: "duration",
            name: "Duration",
            description: "Sort by video length",
            sortKey: "duration",
            dataType: "number"
          },
          {
            id: "video_name",
            name: "Video Name",
            description: "Sort alphabetically by video name",
            sortKey: "videoName",
            dataType: "string"
          }
        ],
        videoData: analysisData.map(video => ({
          videoId: video.videoId,
          videoName: video.videoName,
          duration: video.duration,
          quality: {
            overall: "unknown",
            visual: "unknown",
            audio: "unknown"
          },
          content: {
            type: "unknown",
            mood: "unknown",
            topics: [],
            complexity: "unknown"
          },
          technical: {
            editingViability: 0,
            scriptAlignment: 0,
            speechQuality: "unknown"
          },
          metadata: {
            uploadDate: video.uploadDate,
            processingDate: video.processingDate
          }
        }))
      };
    }

    // Ensure we have the required structure
    if (!parsedResponse.sortOptions || !parsedResponse.videoData) {
      throw new Error('Invalid AI response structure');
    }

    return NextResponse.json({
      success: true,
      sortOptions: parsedResponse.sortOptions,
      videoData: parsedResponse.videoData,
      totalVideos: videos.length,
      analyzedVideos: analysisData.length
    });

  } catch (error) {
    console.error('Error in AI sort endpoint:', error);
    return NextResponse.json({ 
      error: 'Failed to generate AI sort options',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError, supabase } = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is pro
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (userError || userData?.subscription_tier !== 'pro') {
      return NextResponse.json({ 
        error: 'AI sorting requires a Pro subscription',
        upgrade_required: true 
      }, { status: 403 });
    }

    const body = await request.json();
    const { projectId, sortBy, sortOrder = 'asc', searchQuery = '' } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // First get the AI sort data by reusing the GET logic directly
    // Instead of making an internal fetch call, we'll reuse the logic
    
    // Fetch videos with their analysis data (duplicated from GET method)
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select(`
        id,
        original_name,
        file_path,
        duration,
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
        success: true,
        videos: [],
        sortOptions: [],
        totalResults: 0,
        message: 'No analyzed videos found in this project'
      });
    }

    // Get sort data (simplified version of GET logic)
    const analysisData = videos
      .filter(video => video.video_analysis && video.video_analysis.length > 0)
      .map(video => {
        const analysis = video.video_analysis[0];
        return {
          videoId: video.id,
          videoName: video.original_name,
          duration: video.duration || 0,
          analysisData: analysis.video_analysis || analysis.llm_response,
          transcription: analysis.transcription,
          processingDate: analysis.processing_completed_at,
          uploadDate: video.created_at
        };
      });

    // For POST, we'll use a simplified sort data structure
    const sortData = {
      success: true,
      videoData: analysisData.map(video => ({
        videoId: video.videoId,
        videoName: video.videoName,
        duration: video.duration,
        quality: { overall: "unknown", visual: "unknown", audio: "unknown" },
        content: { type: "unknown", mood: "unknown", topics: [], complexity: "unknown" },
        technical: { editingViability: 0, scriptAlignment: 0, speechQuality: "unknown" },
        metadata: { uploadDate: video.uploadDate, processingDate: video.processingDate }
      })),
      sortOptions: []
    };

    let filteredVideos = sortData.videoData;

    // Apply search filter if provided
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredVideos = filteredVideos.filter((video: AIVideoAnalysis) => {
        return (
          video.videoName.toLowerCase().includes(query) ||
          video.content.topics.some((topic: string) => topic.toLowerCase().includes(query)) ||
          video.content.type.toLowerCase().includes(query) ||
          video.content.mood.toLowerCase().includes(query) ||
          video.quality.overall.toLowerCase().includes(query) ||
          video.technical.speechQuality.toLowerCase().includes(query)
        );
      });
    }

    // Apply sort if provided
    if (sortBy) {
      filteredVideos.sort((a: any, b: any) => {
        const getValue = (obj: any, path: string) => {
          return path.split('.').reduce((current, key) => current?.[key], obj);
        };

        const aValue = getValue(a, sortBy);
        const bValue = getValue(b, sortBy);

        if (aValue === bValue) return 0;
        
        let comparison = 0;
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        } else if (aValue instanceof Date && bValue instanceof Date) {
          comparison = aValue.getTime() - bValue.getTime();
        } else {
          comparison = String(aValue).localeCompare(String(bValue));
        }

        return sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    return NextResponse.json({
      success: true,
      videos: filteredVideos,
      sortOptions: sortData.sortOptions,
      totalResults: filteredVideos.length,
      searchQuery,
      sortBy,
      sortOrder
    });

  } catch (error) {
    console.error('Error in AI sort POST endpoint:', error);
    return NextResponse.json({ 
      error: 'Failed to sort videos',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}