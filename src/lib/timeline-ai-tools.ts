import { TimelineState, MediaType } from '../../types/timeline';
import { createClient } from '@supabase/supabase-js';

// AI Tool result type
export interface AIToolResult {
  success: boolean;
  message: string;
  action?: {
    type: string;
    payload: Record<string, unknown>;
  };
}

// Add a text layer to the timeline
export function addTextLayer(
  state: TimelineState,
  text: string,
  duration: number = 3,
  startTime?: number
): AIToolResult {
  try {
    // Find first track or create one
    const targetTrack = state.tracks[0];
    if (!targetTrack) {
      return {
        success: false,
        message: "No tracks available. Please add a track first.",
      };
    }

    // Auto-position at end of timeline or specified time
    const finalStartTime = startTime ?? Math.max(
      ...targetTrack.items.map(item => item.startTime + item.duration),
      0
    );

    return {
      success: true,
      message: `Added text "${text}" at ${finalStartTime / 30}s for ${duration}s`,
      action: {
        type: 'ADD_ITEM',
        payload: {
          type: MediaType.TEXT,
          name: `Text: ${text}`,
          startTime: finalStartTime,
          duration: duration * 30, // Convert to frames
          trackId: targetTrack.id,
          content: text,
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to add text: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// Add a transition between clips
export function addTransition(
  state: TimelineState,
  fromClipIndex: number,
  toClipIndex: number,
  transitionType: string = 'fade'
): AIToolResult {
  try {
    // Find clips across all tracks
    const allItems = state.tracks.flatMap(track => 
      track.items.map(item => ({ ...item, trackId: track.id }))
    ).sort((a, b) => a.startTime - b.startTime);

    if (fromClipIndex >= allItems.length || toClipIndex >= allItems.length) {
      return {
        success: false,
        message: `Clip indices out of range. Found ${allItems.length} clips.`,
      };
    }

    const fromItem = allItems[fromClipIndex];
    const toItem = allItems[toClipIndex];

    // Validate clips are adjacent
    if (Math.abs(toClipIndex - fromClipIndex) !== 1) {
      return {
        success: false,
        message: "Clips must be adjacent to add a transition.",
      };
    }

    return {
      success: true,
      message: `Added ${transitionType} transition between "${fromItem.name}" and "${toItem.name}"`,
      action: {
        type: 'ADD_TRANSITION',
        payload: {
          type: transitionType,
          name: `${transitionType} transition`,
          duration: 30, // 1 second default
          fromItemId: fromItem.id,
          toItemId: toItem.id,
          trackId: fromItem.trackId,
          effect: transitionType,
          position: fromItem.startTime + fromItem.duration,
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to add transition: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// Change duration of a clip
export function changeClipDuration(
  state: TimelineState,
  clipIndex: number,
  newDurationSeconds: number
): AIToolResult {
  try {
    const allItems = state.tracks.flatMap(track => track.items)
      .sort((a, b) => a.startTime - b.startTime);

    if (clipIndex >= allItems.length) {
      return {
        success: false,
        message: `Clip index out of range. Found ${allItems.length} clips.`,
      };
    }

    const targetItem = allItems[clipIndex];
    const newDurationFrames = newDurationSeconds * 30;

    return {
      success: true,
      message: `Changed "${targetItem.name}" duration to ${newDurationSeconds}s`,
      action: {
        type: 'UPDATE_ITEM',
        payload: {
          itemId: targetItem.id,
          updates: { duration: newDurationFrames }
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to change duration: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// Remove a clip
export function removeClip(
  state: TimelineState,
  clipIndex: number
): AIToolResult {
  try {
    const allItems = state.tracks.flatMap(track => track.items)
      .sort((a, b) => a.startTime - b.startTime);

    if (clipIndex >= allItems.length) {
      return {
        success: false,
        message: `Clip index out of range. Found ${allItems.length} clips.`,
      };
    }

    const targetItem = allItems[clipIndex];

    return {
      success: true,
      message: `Removed "${targetItem.name}"`,
      action: {
        type: 'REMOVE_ITEM',
        payload: {
          itemId: targetItem.id
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to remove clip: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// Add a new track
export function addTrack(state: TimelineState): AIToolResult {
  try {
    return {
      success: true,
      message: `Added new track (Track ${state.tracks.length + 1})`,
      action: {
        type: 'ADD_TRACK',
        payload: {}
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to add track: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// Helper functions for silence detection
function findSilenceGaps(utterances: any[], threshold: number = 1.0) {
  const cuts = [];
  for (let i = 0; i < utterances.length - 1; i++) {
    const currentEnd = utterances[i].end;
    const nextStart = utterances[i + 1].start;
    const gapDuration = nextStart - currentEnd;
    
    if (gapDuration >= threshold) {
      cuts.push({
        start: currentEnd,
        end: nextStart,
        type: 'silence',
        reason: `${gapDuration.toFixed(1)}s gap`
      });
    }
  }
  return cuts;
}

function findFillerWords(utterances: any[]) {
  const fillers = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'so', 'right', 'okay'];
  const cuts = [];
  
  utterances.forEach((utterance: any) => {
    utterance.words?.forEach((word: any) => {
      const wordText = word.text.toLowerCase().replace(/[.,!?]/g, '');
      if (fillers.includes(wordText)) {
        cuts.push({
          start: word.start,
          end: word.end,
          type: 'filler',
          reason: `Filler word: "${word.text}"`
        });
      }
    });
  });
  return cuts;
}

function findSpecificWords(utterances: any[], targetWords: string[]) {
  const cuts = [];
  
  utterances.forEach((utterance: any) => {
    utterance.words?.forEach((word: any) => {
      const wordText = word.text.toLowerCase().replace(/[.,!?]/g, '');
      if (targetWords.some(target => wordText.includes(target.toLowerCase()))) {
        cuts.push({
          start: word.start,
          end: word.end,
          type: 'specific_word',
          reason: `Removed word: "${word.text}"`
        });
      }
    });
  });
  return cuts;
}

function findStammers(utterances: any[]) {
  const cuts = [];
  
  utterances.forEach((utterance: any) => {
    const words = utterance.words || [];
    for (let i = 0; i < words.length - 1; i++) {
      const current = words[i].text.toLowerCase().replace(/[.,!?]/g, '');
      const next = words[i + 1].text.toLowerCase().replace(/[.,!?]/g, '');
      
      // Check for repeated words or false starts
      if (current === next || (current.length > 2 && next.startsWith(current.substring(0, 2)))) {
        cuts.push({
          start: words[i].start,
          end: words[i].end,
          type: 'stammer',
          reason: `Stammer/repeat: "${words[i].text}"`
        });
      }
    }
  });
  return cuts;
}

// Remove silences and unwanted audio from video clips
export async function removeSilences(
  state: TimelineState,
  clipIndex: number,
  silenceType: 'gaps' | 'filler_words' | 'specific_words' | 'long_pauses' | 'stammers' = 'gaps',
  threshold: number = 1.0,
  specificWords: string[] = []
): Promise<AIToolResult> {
  try {
    // Get all video items from timeline
    const allItems = state.tracks.flatMap(track => track.items)
      .filter(item => item.type === MediaType.VIDEO)
      .sort((a, b) => a.startTime - b.startTime);

    if (clipIndex >= allItems.length) {
      return {
        success: false,
        message: `Video clip index out of range. Found ${allItems.length} video clips.`,
      };
    }

    const targetItem = allItems[clipIndex];

    // Get video analysis data from Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: analysis, error } = await supabase
      .from('video_analysis')
      .select('transcription')
      .eq('video_id', targetItem.id)
      .single();

    if (error || !analysis?.transcription?.utterances) {
      return {
        success: false,
        message: `No transcript available for "${targetItem.name}". Please wait for video analysis to complete.`,
      };
    }

    const utterances = analysis.transcription.utterances;
    let cuts: Array<{ start: number; end: number; type: string; reason: string }> = [];

    // Detect cuts based on silence type
    switch (silenceType) {
      case 'gaps':
        cuts = findSilenceGaps(utterances, threshold);
        break;
      case 'filler_words':
        cuts = findFillerWords(utterances);
        break;
      case 'specific_words':
        cuts = findSpecificWords(utterances, specificWords);
        break;
      case 'long_pauses':
        cuts = findSilenceGaps(utterances, 3.0); // 3+ second pauses
        break;
      case 'stammers':
        cuts = findStammers(utterances);
        break;
    }

    if (cuts.length === 0) {
      return {
        success: true,
        message: `No ${silenceType.replace('_', ' ')} found in "${targetItem.name}".`,
      };
    }

    // Convert cuts to timeline actions
    const cutsMessage = cuts.length === 1 
      ? `1 ${silenceType.replace('_', ' ')} segment`
      : `${cuts.length} ${silenceType.replace('_', ' ')} segments`;

    return {
      success: true,
      message: `Found ${cutsMessage} in "${targetItem.name}". Cuts will be applied.`,
      action: {
        type: 'REMOVE_SILENCES',
        payload: {
          itemId: targetItem.id,
          cuts: cuts.map(cut => ({
            ...cut,
            start: cut.start * 30, // Convert to frames (30fps)
            end: cut.end * 30
          }))
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to remove silences: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// Get timeline summary for AI context
export function getTimelineSummary(state: TimelineState): string {
  const totalClips = state.tracks.reduce((sum, track) => sum + track.items.length, 0);
  const totalDuration = Math.round(state.totalDuration / state.fps);
  
  const clipsByType = state.tracks.flatMap(track => track.items).reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return `Timeline: ${state.tracks.length} tracks, ${totalClips} clips (${Object.entries(clipsByType).map(([type, count]) => `${count} ${type}`).join(', ')}), ${totalDuration}s duration`;
}

// Tool definitions for OpenAI function calling
export const AI_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "addTextLayer",
      description: "Add a text layer to the timeline",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "The text content to display" },
          duration: { type: "number", description: "Duration in seconds (default: 3)" },
          startTime: { type: "number", description: "Start time in seconds (optional, auto-positioned if not provided)" }
        },
        required: ["text"]
      }
    }
  },
  {
    type: "function" as const, 
    function: {
      name: "addTransition",
      description: "Add a transition between two adjacent clips",
      parameters: {
        type: "object",
        properties: {
          fromClipIndex: { type: "number", description: "Index of the first clip (0-based)" },
          toClipIndex: { type: "number", description: "Index of the second clip (0-based)" },
          transitionType: { type: "string", enum: ["fade", "wipe", "slide"], description: "Type of transition" }
        },
        required: ["fromClipIndex", "toClipIndex"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "changeClipDuration", 
      description: "Change the duration of a specific clip",
      parameters: {
        type: "object",
        properties: {
          clipIndex: { type: "number", description: "Index of the clip to modify (0-based)" },
          newDurationSeconds: { type: "number", description: "New duration in seconds" }
        },
        required: ["clipIndex", "newDurationSeconds"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "removeClip",
      description: "Remove a clip from the timeline",
      parameters: {
        type: "object", 
        properties: {
          clipIndex: { type: "number", description: "Index of the clip to remove (0-based)" }
        },
        required: ["clipIndex"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "addTrack",
      description: "Add a new track to the timeline", 
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "removeSilences",
      description: "Remove silences, filler words, or specific audio segments from video clips",
      parameters: {
        type: "object",
        properties: {
          clipIndex: { 
            type: "number", 
            description: "Index of the video clip to process (0-based)" 
          },
          silenceType: {
            type: "string",
            enum: ["gaps", "filler_words", "specific_words", "long_pauses", "stammers"],
            description: "Type of audio to remove: gaps (silent pauses), filler_words (um, uh, like), specific_words (custom words), long_pauses (3+ seconds), stammers (repeated words)"
          },
          threshold: {
            type: "number",
            description: "Minimum duration in seconds for gaps to be removed (default: 1.0, only used for 'gaps' type)"
          },
          specificWords: {
            type: "array",
            items: { type: "string" },
            description: "Array of specific words or phrases to remove (only used when silenceType is 'specific_words')"
          }
        },
        required: ["clipIndex", "silenceType"]
      }
    }
  }
];

// Execute a tool based on its name and arguments
export async function executeAITool(
  toolName: string,
  args: Record<string, unknown>,
  state: TimelineState
): Promise<AIToolResult> {
  switch (toolName) {
    case 'addTextLayer':
      return addTextLayer(state, args.text as string, args.duration as number, args.startTime as number);
    case 'addTransition':
      return addTransition(state, args.fromClipIndex as number, args.toClipIndex as number, args.transitionType as string);
    case 'changeClipDuration':
      return changeClipDuration(state, args.clipIndex as number, args.newDurationSeconds as number);
    case 'removeClip':
      return removeClip(state, args.clipIndex as number);
    case 'addTrack':
      return addTrack(state);
    case 'removeSilences':
      return await removeSilences(
        state, 
        args.clipIndex as number, 
        args.silenceType as 'gaps' | 'filler_words' | 'specific_words' | 'long_pauses' | 'stammers',
        args.threshold as number,
        args.specificWords as string[]
      );
    default:
      return {
        success: false,
        message: `Unknown tool: ${toolName}`,
      };
  }
}