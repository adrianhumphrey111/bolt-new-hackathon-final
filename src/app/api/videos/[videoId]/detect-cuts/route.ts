import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../../../lib/supabase/server'
import { aiService } from '@/lib/ai-service'

interface CutDetectionRequest {
  cutTypes: string[]
  customPrompt?: string
  confidenceThreshold: number
}

interface DetectedCut {
  id: string
  sourceStart: number
  sourceEnd: number
  type: string
  confidence: number
  reasoning: string
  affectedText: string
}

interface CutDetectionResponse {
  success: boolean
  cuts: DetectedCut[]
  totalCuts: number
  totalTimeSaved: string
  processingTime: number
  error?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const startTime = Date.now()
  
  try {
    const { videoId } = await params
    const body: CutDetectionRequest = await request.json()
    const { cutTypes, customPrompt, confidenceThreshold } = body

    // Get user session
    const { user, error: authError, supabase } = await getUserFromRequest(request)
    
    if (authError || !user || !supabase) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get video and its transcript data
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select(`
        id,
        original_name,
        file_path,
        project_id,
        projects!inner(user_id),
        video_analysis!inner(
          transcription,
          video_analysis,
          status
        )
      `)
      .eq('id', videoId)
      .eq('projects.user_id', user.id)
      .single()

    if (videoError || !video) {
      return NextResponse.json(
        { success: false, error: 'Video not found or not authorized' },
        { status: 404 }
      )
    }

    const analysis = Array.isArray(video.video_analysis) 
      ? video.video_analysis[0] 
      : video.video_analysis

    if (!analysis || analysis.status !== 'completed') {
      return NextResponse.json(
        { success: false, error: 'Video analysis not completed' },
        { status: 400 }
      )
    }

    // Get transcript data
    const transcriptData = analysis.transcription
    if (!transcriptData || !transcriptData.words) {
      return NextResponse.json(
        { success: false, error: 'No transcript data available' },
        { status: 400 }
      )
    }

    // Process cuts using LLM chunking service
    const cutDetectionService = new CutDetectionService()
    const detectedCuts = await cutDetectionService.detectCuts({
      transcriptData,
      cutTypes,
      customPrompt,
      confidenceThreshold,
      videoId
    })

    // Store cuts in database with final validation
    const cutService = new CutDetectionService();
    const cutsToStore = detectedCuts.map(cut => {
      // Final validation before database insert
      const validatedCut = cutService.validateCut(cut);
      if (!validatedCut) {
        console.warn('Cut failed final validation, skipping:', cut);
        return null;
      }

      return {
        video_id: videoId,
        source_start: validatedCut.sourceStart,
        source_end: validatedCut.sourceEnd,
        cut_type: validatedCut.type,
        confidence: validatedCut.confidence,
        reasoning: validatedCut.reasoning,
        affected_text: validatedCut.affectedText,
        is_active: false, // Default to inactive until user applies them
        created_by: user.id,
        created_at: new Date().toISOString()
      };
    }).filter(cut => cut !== null) // Remove any null cuts from failed validation

    console.log(`Validation results: ${detectedCuts.length} cuts detected, ${cutsToStore.length} cuts passed validation`)

    if (cutsToStore.length === 0) {
      console.warn('No valid cuts to store after validation');
      return NextResponse.json({
        success: true,
        cuts: [],
        totalCuts: 0,
        totalTimeSaved: '0:00',
        processingTime: Date.now() - startTime,
        message: 'No valid cuts detected after validation'
      });
    }

    const { error: insertError } = await supabase
      .from('video_cuts')
      .insert(cutsToStore)

    if (insertError) {
      console.error('Error storing cuts:', insertError)
      return NextResponse.json(
        { success: false, error: 'Failed to store cuts' },
        { status: 500 }
      )
    }

    // Calculate total time saved
    const totalTimeSaved = detectedCuts.reduce((acc, cut) => {
      return acc + (cut.sourceEnd - cut.sourceStart)
    }, 0)

    const processingTime = Date.now() - startTime

    const response: CutDetectionResponse = {
      success: true,
      cuts: detectedCuts,
      totalCuts: detectedCuts.length,
      totalTimeSaved: formatDuration(totalTimeSaved),
      processingTime
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Cut detection error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        processingTime: Date.now() - startTime
      },
      { status: 500 }
    )
  }
}

// Cut Detection Service Class
class CutDetectionService {
  private readonly CHUNK_SIZE_SECONDS = 180 // 3 minutes
  private readonly BATCH_SIZE = 2 // 2 chunks per API call
  
  // Map request cut types to valid database cut types
  private readonly CUT_TYPE_MAPPING: Record<string, string> = {
    'filler_words': 'filler_word',
    'filler_word': 'filler_word',
    'bad_takes': 'bad_take', 
    'bad_take': 'bad_take',
    'off_topic': 'off_topic',
    'silence': 'silence',
    'repetitive_content': 'repetitive_content',
    'repetitive': 'repetitive_content'
  }

  private mapCutType(inputType: string): string {
    return this.CUT_TYPE_MAPPING[inputType] || 'filler_word' // default fallback
  }

  private validateCut(cut: DetectedCut): DetectedCut | null {
    // Validate source_start >= 0
    if (cut.sourceStart < 0) {
      console.warn(`Invalid sourceStart: ${cut.sourceStart}, skipping cut`);
      return null;
    }

    // Validate source_end >= 0  
    if (cut.sourceEnd < 0) {
      console.warn(`Invalid sourceEnd: ${cut.sourceEnd}, skipping cut`);
      return null;
    }

    // Validate source_start < source_end
    if (cut.sourceStart >= cut.sourceEnd) {
      console.warn(`Invalid timing: sourceStart (${cut.sourceStart}) >= sourceEnd (${cut.sourceEnd}), skipping cut`);
      return null;
    }

    // Validate confidence range 0-1
    if (cut.confidence < 0 || cut.confidence > 1) {
      console.warn(`Invalid confidence: ${cut.confidence}, clamping to 0-1 range`);
      cut.confidence = Math.max(0, Math.min(1, cut.confidence));
    }

    // Ensure cut type is valid (this should already be handled by mapCutType, but double-check)
    const validTypes = ['filler_word', 'bad_take', 'off_topic', 'silence', 'repetitive_content'];
    if (!validTypes.includes(cut.type)) {
      console.warn(`Invalid cut type: ${cut.type}, defaulting to filler_word`);
      cut.type = 'filler_word';
    }

    // Ensure minimum cut duration (avoid very short cuts that might be parsing errors)
    const minDuration = 0.1; // 100ms minimum
    if (cut.sourceEnd - cut.sourceStart < minDuration) {
      console.warn(`Cut duration too short: ${cut.sourceEnd - cut.sourceStart}s, skipping cut`);
      return null;
    }

    return cut;
  }

  async detectCuts(params: {
    transcriptData: any
    cutTypes: string[]
    customPrompt?: string
    confidenceThreshold: number
    videoId: string
  }): Promise<DetectedCut[]> {
    const { transcriptData, cutTypes, customPrompt, confidenceThreshold } = params

    // Create chunks from transcript
    const chunks = this.createTranscriptChunks(transcriptData)
    
    // Process chunks in batches
    const allCuts: DetectedCut[] = []
    
    for (let i = 0; i < chunks.length; i += this.BATCH_SIZE) {
      const batch = chunks.slice(i, i + this.BATCH_SIZE)
      const batchCuts = await this.processBatch(batch, cutTypes, customPrompt)
      allCuts.push(...batchCuts)
    }

    // Filter by confidence threshold
    const filteredCuts = allCuts.filter(cut => cut.confidence >= confidenceThreshold)
    
    return filteredCuts
  }

  private createTranscriptChunks(transcriptData: any): any[] {
    const words = transcriptData.words || []
    const chunks: any[] = []
    
    let currentChunk: any[] = []
    let chunkStartTime = 0
    
    for (const word of words) {
      const wordTime = word.start / 1000 // Convert to seconds
      
      // Start new chunk if current chunk exceeds size limit
      if (wordTime - chunkStartTime >= this.CHUNK_SIZE_SECONDS && currentChunk.length > 0) {
        chunks.push({
          words: currentChunk,
          startTime: chunkStartTime,
          endTime: currentChunk[currentChunk.length - 1].end / 1000
        })
        
        currentChunk = []
        chunkStartTime = wordTime
      }
      
      currentChunk.push(word)
    }
    
    // Add final chunk
    if (currentChunk.length > 0) {
      chunks.push({
        words: currentChunk,
        startTime: chunkStartTime,
        endTime: currentChunk[currentChunk.length - 1].end / 1000
      })
    }
    
    return chunks
  }

  private async processBatch(
    chunks: any[], 
    cutTypes: string[], 
    customPrompt?: string
  ): Promise<DetectedCut[]> {
    const allCuts: DetectedCut[] = []
    
    // Process each cut type for all chunks in parallel
    for (const cutType of cutTypes) {
      const cutTypePromises = chunks.map(chunk => 
        this.processChunkForCutType(chunk, cutType, customPrompt)
      )
      
      const cutTypeBatches = await Promise.allSettled(cutTypePromises)
      
      for (const result of cutTypeBatches) {
        if (result.status === 'fulfilled') {
          allCuts.push(...result.value)
        } else {
          console.error('Chunk processing failed:', result.reason)
        }
      }
    }
    
    return allCuts
  }

  private async processChunkForCutType(
    chunk: any,
    cutType: string,
    customPrompt?: string
  ): Promise<DetectedCut[]> {
    try {
      // Create transcript text with timing for this chunk
      const transcriptWithTiming = chunk.words.map((word: any) => 
        `[${(word.start / 1000).toFixed(3)}s-${(word.end / 1000).toFixed(3)}s] ${word.text}`
      ).join(' ')

      // Build the LLM prompt
      const prompt = this.buildCutDetectionPrompt(
        transcriptWithTiming,
        cutType,
        customPrompt
      )

      // Call Claude API
      const response = await this.callClaude(prompt)
      
      // Parse the response
      const parsedResponse = this.parseClaudeResponse(response)
      
      // Convert to DetectedCut format with proper timing and validation
      const cuts = parsedResponse.removed_segments?.map((segment: any) => ({
        id: `cut_${Date.now()}_${Math.random()}`,
        sourceStart: chunk.startTime + segment.start_time, // AI returns times in seconds (already converted)
        sourceEnd: chunk.startTime + segment.end_time,     // No need to divide by 1000 again
        type: this.mapCutType(cutType), // Map to valid database type
        confidence: segment.confidence || 0.8,
        reasoning: segment.reason || `${cutType} detected`,
        affectedText: segment.text_removed || ''
      })) || []

      // Validate and filter cuts
      return cuts.map(cut => this.validateCut(cut)).filter(cut => cut !== null) as DetectedCut[]

    } catch (error) {
      console.error(`Error processing chunk for ${cutType}:`, error)
      return []
    }
  }

  private buildCutDetectionPrompt(
    transcriptWithTiming: string,
    cutType: string,
    customPrompt?: string
  ): string {
    const customInstruction = customPrompt ? `\n\nCUSTOM INSTRUCTIONS:\n${customPrompt}` : ''
    
    return `You are an expert video editor analyzing a transcript with timestamped words. Your task is to identify and remove ${cutType} from the transcript while maintaining natural flow and coherent storytelling.

TRANSCRIPT DATA:
${transcriptWithTiming}

REMOVAL TYPE: ${cutType}

REMOVAL DEFINITIONS:
- "filler_words": Remove ums, uhs, ahs, likes (when used as fillers), you knows (when used as fillers), basically (when overused), kind of/sort of (when used as hedging), repeated words/phrases, false starts, incomplete sentences
- "bad_takes": Remove stuttering, incomplete thoughts, self-corrections, moments where speaker says "take 1000", restarts, obvious mistakes, rambling without clear point, contradictory statements
- "off_topic": Remove tangential discussions, personal anecdotes unrelated to main topic, side conversations, interruptions, content that doesn't advance the core narrative
- "silence": Remove long pauses, dead air, moments with no speech (identify by large gaps in timestamps)
- "repetitive_content": Remove duplicate information, redundant explanations, unnecessary repetition of the same points

ANALYSIS CRITERIA:
1. Identify segments that match the ${cutType} definition
2. Ensure removed segments don't break the natural flow of conversation
3. Preserve complete thoughts and important context
4. Maintain narrative coherence and storytelling structure
5. Keep transitions smooth between remaining segments

RESPONSE FORMAT:
Return a JSON object with this exact structure:

{
  "removal_type": "${cutType}",
  "total_segments_removed": number,
  "total_time_removed": "MM:SS",
  "removed_segments": [
    {
      "segment_id": 1,
      "start_time": start_timestamp_ms,
      "end_time": end_timestamp_ms,
      "duration": "SS.sss",
      "text_removed": "exact text that will be removed",
      "reason": "specific reason for removal",
      "confidence": 0.85
    }
  ],
  "preserved_segments": [
    {
      "start_time": start_timestamp_ms,
      "end_time": end_timestamp_ms,
      "text": "text that remains in final edit"
    }
  ],
  "editing_notes": [
    "Any important notes about maintaining flow",
    "Suggestions for smooth transitions"
  ]
}

IMPORTANT GUIDELINES:
- Be conservative with removals - only remove content that clearly matches the removal type
- Prioritize maintaining the speaker's authentic voice and message
- Consider the impact on story flow and audience engagement
- For filler words, only remove if they don't serve a purpose
- For bad takes, focus on obvious mistakes rather than natural speech patterns
- Provide confidence scores (0.0-1.0) for each removal decision${customInstruction}`
  }

  private async callClaude(prompt: string): Promise<string> {
    try {
      // Call AI service directly instead of making HTTP request
      const response = await aiService.complete(
        prompt,
        undefined, // no system prompt needed
        {
          model: 'gpt-4o', // Use GPT-4o for best results
          max_tokens: 10000,
          temperature: 0.1 // Lower temperature for more consistent, accurate results
        }
      );
      
      return response;
    } catch (error) {
      console.error('AI service call failed:', error);
      throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseClaudeResponse(response: string): any {
    try {
      // Try to parse as JSON first
      return JSON.parse(response)
    } catch {
      // If not valid JSON, try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0])
        } catch {
          console.error('Failed to parse Claude response:', response)
          return { removed_segments: [] }
        }
      }
      return { removed_segments: [] }
    }
  }
}

// Helper function to format duration
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}