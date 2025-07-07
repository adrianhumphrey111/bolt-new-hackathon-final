import { NextRequest, NextResponse } from 'next/server';
import { AI_TOOLS } from '../../../../../lib/timeline-ai-tools';
import { withCreditsCheck, useCredits } from '../../../../../lib/credits';
import { aiService } from '../../../../../lib/ai-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  return withCreditsCheck(request, 'ai_chat', async (userId, supabase) => {
    // Await params since they're now a Promise in Next.js 15
    const resolvedParams = await params;
    // ProjectId is available in resolvedParams.projectId if needed for validation
    // For now, we don't need to validate against projectId
    console.log('Processing chat request for project:', resolvedParams.projectId);
    try {
    const { message, timelineSummary } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Create system prompt with context
    const systemPrompt = `You are an AI assistant that helps users edit video timelines and discover content from their video library.

Current timeline status: ${timelineSummary}

You have access to powerful tools including:

🎬 CONTENT DISCOVERY TOOLS:
- findContentHooks: Search through analyzed videos in the current project to find hooks, highlights, key moments
- This searches the project's video library, not just timeline clips
- Perfect for: "Show me my best hooks", "Find content about marketing", "What's my most engaging content?"

✂️ SMART CONTENT REMOVAL TOOLS:
- analyzeContentForRemoval: LLM-powered analysis to identify segments for removal with precise timestamps
- Intelligently detects: silences, filler words, specific content, quality issues, off-topic segments
- Perfect for: "Remove all ums and uhs", "Cut out silences longer than 2 seconds", "Remove filler words"

🎥 TIMELINE EDITING TOOLS:
- Adding text layers and transitions
- Changing clip durations and removing clips  
- Adding tracks
- Legacy silence removal for timeline clips

CONTENT DISCOVERY EXAMPLES:
- "Show me my best hooks" → searches all videos for compelling openings
- "Find content about [topic]" → searches transcripts for topic-specific content
- "What's my most engaging content?" → finds highest-quality moments
- "I need a good intro" → finds strong introduction segments
- "Show me funny moments" → finds entertaining/humorous content

SMART CONTENT REMOVAL EXAMPLES:
- "Remove all ums and uhs" → LLM identifies all filler words with precise timestamps
- "Cut out silences longer than 2 seconds" → finds and marks long pauses for removal
- "Remove filler words" → detects um, uh, like, you know, basically, etc.
- "Clean up this content" → general cleanup for better flow
- "Remove mentions of competitor X" → finds and removes specific content

TIMELINE EDITING EXAMPLES:
- "add text that says Hello" = adds text overlay
- "add transition between clips" = creates smooth transitions

CONTENT DISCOVERY WORKFLOW:
1. User asks for content discovery (hooks, topics, etc.)
2. Use findContentHooks to search their entire video library
3. AI returns clips with timestamps, previews, and "Add to Timeline" options
4. User can preview specific moments and add them to their project

Guidelines:
- Content discovery searches project videos that have been analyzed, not just timeline
- Clip indices for timeline editing are 0-based (first clip = 0)
- Durations are in seconds
- Video analysis must be complete for content search to work
- Be helpful and suggest specific content discovery queries
- Always be concise but enthusiastic about helping them find great content`;

    const completion = await aiService.createCompletion({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      tools: AI_TOOLS,
      tool_choice: 'auto',
      temperature: 0.1,
    });

    const responseMessage = completion;

    // Use credits after successful AI call
    const creditsUsed = await useCredits(userId, 'ai_chat', {
      projectId: resolvedParams.projectId,
      message: message.substring(0, 100) // Log first 100 chars
    }, supabase);

    if (!creditsUsed) {
      console.error('Failed to deduct credits for chat');
    }

    // Check if the AI wants to use a tool
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCall = responseMessage.tool_calls[0];
      
      return NextResponse.json({
        action: 'executeTool',
        tool: toolCall.function.name,
        args: JSON.parse(toolCall.function.arguments),
        message: `Executing: ${toolCall.function.name}`,
      });
    } else {
      // Regular text response
      return NextResponse.json({
        action: 'textResponse',
        message: responseMessage.content || 'I didn\'t understand that. Could you please rephrase?',
      });
    }

  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // Handle specific OpenAI errors
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'OpenAI API key not configured' },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: `AI service error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
  });
}