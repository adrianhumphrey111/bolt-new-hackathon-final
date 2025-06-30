import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { AI_TOOLS } from '../../../../../lib/timeline-ai-tools';
import { withCreditsCheck, useCredits } from '../../../../../lib/credits';

// Initialize OpenAI client
function getOpenAI() {
  if (!process.env.NEXT_OPENAI_API_KEY) {
    throw new Error('NEXT_OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({
    apiKey: process.env.NEXT_OPENAI_API_KEY,
  });
}

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
    const systemPrompt = `You are an AI assistant that helps users edit video timelines through natural language commands. 

Current timeline status: ${timelineSummary}

You have access to tools that can modify the timeline. When a user asks you to perform an action, use the appropriate tool. If the request is unclear or not actionable, provide helpful guidance.

Guidelines:
- Clip indices are 0-based (first clip = 0, second clip = 1, etc.)
- Durations are in seconds
- Be helpful and confirm actions clearly
- If you can't perform an action, explain why and suggest alternatives
- Always be concise but friendly`;

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      tools: AI_TOOLS,
      tool_choice: 'auto',
      temperature: 0.1,
    });

    const responseMessage = completion.choices[0].message;

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