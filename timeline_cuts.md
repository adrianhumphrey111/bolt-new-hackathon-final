# Timeline Cuts System: Technical Analysis & Proposal

## Current System Analysis

### What We Have Now
- **AI Analysis**: Gemini API identifies recommended cuts, filler words, highlight moments
- **One Shot Generate**: Creates timeline segments by excluding cut regions
- **Basic Timeline**: Linear track-based editing with drag/drop
- **Media Library**: Simple list of videos without intelligent organization

### Current Problems

#### 1. **No Granular Cut Management**
- Cuts are applied wholesale (all or nothing)
- No individual cut review/approval
- No visual feedback on what's being removed
- Can't selectively apply/reject specific cuts

#### 2. **Poor Timeline Feedback**
- No visual indicators showing where cuts were made
- No way to see original vs edited timeline
- Can't easily undo specific cuts
- No preview of cut content before applying

#### 3. **Inadequate Media Organization**
- No intelligent clip grouping
- Similar content not identified/grouped
- Perfect takes buried in analysis data
- No "clean clips" extraction system

#### 4. **Limited User Control**
- Binary choice: accept all cuts or reject all
- No fine-tuning capabilities
- Can't modify cut boundaries
- No iterative editing workflow

#### 5. **Missing Export-Ready Workflow**
- Goal is 80% completion in our app
- Currently forces users to external tools
- No systematic approach to "good parts" curation
- Missing final polish capabilities

---

## Primary User Flow: One-Take Video Cleanup

### User Story: 12-Minute One-Take Video Processing

**Scenario**: User uploads a 12-minute single-take video containing filler words, off-topic sections, bad takes, and wants automated cleanup with selective restore capability.

### Step-by-Step User Flow

#### 1. **Upload & Analysis** (Existing System)
- 12-minute video uploads to S3
- Assembly AI transcribes with disfluencies detection enabled
- Gemini analyzes visual content and scene breaks
- System creates baseline analysis with potential cut candidates

#### 2. **Smart Cut Detection Interface** (New Feature)
- User clicks **"Clean Up Video"** button in timeline interface
- Modal appears with cut configuration options:

```
┌─────────────────────────────────────────────────────────┐
│ Clean Up Your Video                                      │
├─────────────────────────────────────────────────────────┤
│ What should I remove?                                   │
│                                                         │
│ ☑️ Filler words (um, uh, like, you know)              │
│ ☑️ Off-topic sections                                  │
│ ☑️ Bad takes/mistakes                                  │
│ ☑️ Long pauses (>3 seconds)                           │
│                                                         │
│ Custom Instructions:                                    │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Remove sections where I talk about [specific topic] │ │
│ │ or mention competitor names                         │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Sensitivity: ●━━━━━━━━━━ Conservative  Aggressive        │
│                                                         │
│ [Preview Cuts] [Apply & Generate Timeline]             │
└─────────────────────────────────────────────────────────┘
```

#### 3. **LLM-Powered Cut Analysis** (New Feature)
- System creates enhanced prompt combining:
  - User's custom instructions
  - Selected cut categories
  - Full transcript with timing data
  - Visual scene analysis
  - Confidence sensitivity settings

**Sample LLM Prompt:**
```
Analyze this 12-minute video transcript for content removal. User wants to remove:
- Filler words (um, uh, like, you know)
- Off-topic sections about competitor products
- Bad takes where speaker makes mistakes
- Pauses longer than 3 seconds

Sensitivity: Conservative (high confidence only)

Return precise cut recommendations with:
- Source video timestamps (decimal seconds)
- Cut confidence scores (0.0-1.0)
- Cut type classification
- Reasoning for each cut

TRANSCRIPT WITH TIMING: [full transcript data]
VISUAL ANALYSIS: [scene breakdown]
```

#### 4. **Cut Processing & Confidence Scoring** (New Feature)
- LLM returns cut recommendations with metadata:
```json
{
  "cuts": [
    {
      "sourceStart": 45.2,
      "sourceEnd": 46.8, 
      "type": "filler_word",
      "confidence": 0.95,
      "reasoning": "Multiple 'um' and 'uh' fillers",
      "affectedText": "So, um, what I want to, uh, show you is..."
    },
    {
      "sourceStart": 234.5,
      "sourceEnd": 267.3,
      "type": "off_topic", 
      "confidence": 0.87,
      "reasoning": "Discussion about competitor pricing unrelated to main topic",
      "affectedText": "Speaking of competitors, Adobe's pricing..."
    }
  ]
}
```

#### 5. **One-Click Timeline Generation** (New Feature)
- System automatically creates clean timeline
- Applies all cuts above confidence threshold
- Creates continuous segments between cuts
- Timeline shows production-ready sequence

#### 6. **Cut Review & Selective Restore** (New Feature)

**Preview Mode:**
- Video preview shows Descript-style grey lines through removed content
- Timeline remains clean (shows final edit)
- Cut review panel shows "What was removed"

**Cut Review Panel:**
```
┌─────────────────────────────────────────────────────────┐
│ Removed Content (47 cuts, 3m 24s saved)                │
├─────────────────────────────────────────────────────────┤
│ Filler Words (23 cuts) ─ 47s removed      [Restore All]│
│ Off-Topic (12 cuts) ─ 2m 15s removed      [Restore All]│  
│ Bad Takes (8 cuts) ─ 18s removed          [Restore All]│
│ Long Pauses (4 cuts) ─ 4s removed         [Restore All]│
│                                                         │
│ Individual Cuts:                                        │
│ 🗑️ 0:45 "um, uh, so..." (1.6s) 95% ●    [Restore]    │
│ 🗑️ 3:54 "competitor talk" (32.8s) 87% ●  [Restore]    │
│ 🗑️ 7:22 "that was wrong" (4.2s) 92% ●   [Restore]    │
│                                                         │
│ [Undo Last Operation] [Reset All Cuts]                 │
└─────────────────────────────────────────────────────────┘
```

### Technical Implementation Requirements

#### Design Decisions Confirmed:
1. **Cache cut positions** - Video content immutable after upload
2. **Source-relative positioning** - All cuts stored as original video timestamps  
3. **Multi-item handling** - Cuts ignored if outside trim bounds
4. **Visual feedback** - Preview shows cuts, timeline stays clean
5. **Frame precision** - Convert decimal seconds to 30fps frames
6. **Bulk undo/redo** - Track operations for selective restoration
7. **Customizable prompts** - User can specify removal criteria
8. **Confidence scoring** - Adjustable sensitivity thresholds
9. **Text-based bad takes** - Audio analysis only for v1

#### LLM Chunking Strategy for Long Videos

**Problem**: 12-minute transcript exceeds LLM token limits
**Solution**: Chunk into 3-minute segments with parallel processing

```json
{
  "chunkingStrategy": {
    "chunkSize": "3 minutes (180 seconds)",
    "processing": "parallel with batching", 
    "batchSize": "2 chunks per API call",
    "overlap": "none - clean boundaries",
    "boundaryHandling": "cut all detected segments regardless of chunk boundaries",
    "errorHandling": "retry individual failed chunks"
  },
  
  "implementation": {
    "1. Video splitting": "Divide 12-minute video into 4x 3-minute chunks",
    "2. Batch processing": "Send 2 chunks per LLM call (2 API calls total)", 
    "3. Response aggregation": "Combine all chunk responses into single cut list",
    "4. Boundary cuts": "Apply all cuts regardless of chunk boundaries",
    "5. Timeline generation": "Create final timeline from all aggregated cuts",
    "6. Error recovery": "Retry individual chunks on failure"
  }
}
```

#### LLM Prompt Template for Cut Detection

```
You are an expert video editor analyzing a transcript with timestamped words. Your task is to identify and remove {REMOVAL_TYPE} from the transcript while maintaining natural flow and coherent storytelling.

TRANSCRIPT DATA:
{TRANSCRIPT_WITH_TIMESTAMPS}

REMOVAL TYPE: {REMOVAL_TYPE}

REMOVAL DEFINITIONS:
- "filler words": Remove ums, uhs, ahs, likes (when used as fillers), you knows (when used as fillers), basically (when overused), kind of/sort of (when used as hedging), repeated words/phrases, false starts, incomplete sentences
- "bad takes": Remove stuttering, incomplete thoughts, self-corrections, moments where speaker says "take 1000", restarts, obvious mistakes, rambling without clear point, contradictory statements
- "off topic": Remove tangential discussions, personal anecdotes unrelated to main topic, side conversations, interruptions, content that doesn't advance the core narrative
- "silences": Remove long pauses, dead air, moments with no speech (identify by large gaps in timestamps)
- "repetitive content": Remove duplicate information, redundant explanations, unnecessary repetition of the same points

ANALYSIS CRITERIA:
1. Identify segments that match the {REMOVAL_TYPE} definition
2. Ensure removed segments don't break the natural flow of conversation
3. Preserve complete thoughts and important context
4. Maintain narrative coherence and storytelling structure
5. Keep transitions smooth between remaining segments

RESPONSE FORMAT:
Return a JSON object with this exact structure:

{
  "removal_type": "{REMOVAL_TYPE}",
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
- Provide confidence scores (0.0-1.0) for each removal decision
```

#### Cut Storage Format:
```json
{
  "videoId": "video_123",
  "cuts": [
    {
      "id": "cut_1",
      "sourceStart": 45.2,
      "sourceEnd": 46.8,
      "type": "filler_word",
      "confidence": 0.95,
      "isActive": true,
      "bulkOperationId": "cleanup_op_1",
      "reasoning": "Multiple filler words detected",
      "affectedText": "So, um, what I want to, uh, show you is..."
    }
  ],
  "operations": [
    {
      "id": "cleanup_op_1", 
      "timestamp": "2024-01-15T10:30:00Z",
      "type": "smart_cleanup",
      "userPrompt": "Remove filler words and off-topic sections",
      "cutsCreated": 47,
      "timeSaved": "3m 24s"
    }
  ]
}
```

---

## Implementation Evaluation & Phased Rollout

### Pre-Implementation Evaluation

#### Technical Feasibility Assessment ✅
- **Assembly AI Integration**: Already have disfluencies detection enabled
- **LLM Processing**: Chunking strategy addresses token limits
- **Timeline System**: Existing reducer pattern supports new cut operations
- **Data Storage**: Supabase can handle cut metadata and operations
- **UI Components**: Can build on existing modal and timeline patterns

#### Resource Requirements Assessment
- **Backend**: New API endpoints for cut processing and storage
- **Frontend**: New modal, cut review panel, timeline integration
- **LLM Costs**: ~$0.50-2.00 per 12-minute video (Claude calls)
- **Storage**: Minimal - cut metadata is lightweight JSON
- **Development Time**: 2-3 weeks across 4 phases

#### Risk Analysis
- **LLM Reliability**: Chunking reduces single points of failure
- **User Experience**: Phased rollout allows testing at each step
- **Performance**: Parallel processing optimizes speed
- **Data Integrity**: Source-relative positioning prevents corruption

### 4-Phase Implementation Plan

#### **Phase 1: Core Cut Detection (Week 1)**
**Goal**: Basic LLM cut detection without UI

**Deliverables**:
- New API endpoint: `POST /api/videos/{id}/detect-cuts`
- LLM chunking service with parallel processing
- Cut storage in database
- Basic cut confidence filtering

**Testing**:
- Upload 12-minute test video
- API returns JSON with detected cuts
- Verify cuts are stored with source timestamps
- Test chunking with different video lengths

**Success Criteria**:
- API successfully processes video and returns cuts
- Cuts have confidence scores and are stored in database
- All cuts stored with correct source timestamps

---

#### **Phase 2: Cut Management Backend (Week 1-2)**
**Goal**: Cut operations and timeline integration

**Deliverables**:
- Cut activation/deactivation API
- Bulk operation tracking
- Timeline generation with cuts applied
- Cut restoration functionality

**Testing**:
- Toggle individual cuts on/off
- Apply bulk operations (all filler words)
- Generate timeline excluding active cuts
- Test undo/restore operations

**Success Criteria**:
- Timeline correctly excludes active cuts
- Bulk operations create proper operation records
- Restore functionality works correctly

---

#### **Phase 3: Cut Detection UI (Week 2)**
**Goal**: User interface for cut configuration

**Deliverables**:
- "Clean Up Video" modal with options
- Cut type selection (filler words, bad takes, etc.)
- Custom prompt input
- Confidence threshold slider
- Progress tracking during processing

**Testing**:
- Modal opens from timeline interface
- All cut types can be selected/deselected
- Custom prompts are passed to LLM
- Progress updates show processing status

**Success Criteria**:
- User can configure cut detection successfully
- Modal provides clear feedback during processing
- All user preferences are respected in LLM calls

---

#### **Phase 4: Cut Review & Timeline Integration (Week 3)**
**Goal**: Complete user experience with preview and restore

**Deliverables**:
- Cut review panel showing removed content
- Descript-style preview with grey line indicators
- Individual and bulk restore functionality
- Timeline integration with clean display
- Operation history and undo system

**Testing**:
- Preview shows cuts with visual indicators
- Cut review panel categorizes removed content
- Restore functions work for individual and bulk operations
- Timeline maintains clean appearance
- Undo system works across sessions

**Success Criteria**:
- User can review all cuts before final approval
- Selective restore works for any cut combination
- Timeline provides production-ready output
- Complete workflow functions end-to-end

### Phase Testing Strategy

#### Phase 1-2: Backend Testing
- Postman/API testing for all endpoints
- Database integrity verification
- Performance testing with long videos
- Error handling validation

#### Phase 3-4: User Testing
- Internal team testing with real content
- User flow validation
- Performance testing in production environment
- Edge case testing (very short/long videos)

### Success Metrics by Phase

| Phase | Key Metrics | Target |
|-------|-------------|--------|
| Phase 1 | API endpoint functions | ✅ Works correctly |
| Phase 1 | Cut detection returns results | ✅ Returns cuts with confidence |
| Phase 2 | Timeline generation works | ✅ Excludes active cuts |
| Phase 2 | Cut operations function | ✅ Toggle/restore works |
| Phase 3 | Modal UI functions | ✅ User can configure cuts |
| Phase 3 | Progress tracking works | ✅ Shows processing status |
| Phase 4 | Preview shows cuts | ✅ Visual indicators display |
| Phase 4 | Complete workflow | ✅ End-to-end functionality |

---

## Current Lambda Analysis Pipeline Review

### Current Strengths
Your existing system has excellent foundations:

**Assembly AI Integration:**
- Advanced SLAM-1 speech model
- Speaker labels, entity detection, IAB categories
- Sentiment analysis & auto highlights
- Content safety & summarization
- Word-level timing data

**Multi-Agent Claude Analysis:**
- Script-aware 3-agent system for single clips
- 5-agent system for multi-clip analysis
- High-quality content assessment
- Script alignment scoring

**Gemini Video Analysis:**
- Visual content analysis with timestamps
- Scene breakdown capabilities
- Structured JSON responses

### Current Gaps for Enhanced Timeline Cuts

**Missing Assembly AI Features:**
```python
# Current Assembly AI request (good but incomplete)
data = {
    "audio_url": presigned_url,
    "speech_model": "slam-1",
    "speaker_labels": True,
    # Missing key features for cut detection:
    # "disfluencies": True,  # Detects "um", "uh", stutters
    # "word_boost": ["um", "uh", "like", "you know"],  # Boost filler detection
    # "speech_threshold": 0.5,  # Lower threshold for hesitations
}
```

**Limited Similarity Detection:**
- No content deduplication across clips
- No topic clustering
- No quality comparison between similar segments

**Basic Quality Scoring:**
- Script alignment focused, not editing-focused
- No visual quality assessment integration
- Missing speech fluency metrics

## Proposed Solution: Enhanced Smart Cut Management System

### Enhanced Multi-Stage Pipeline

#### Stage 1: Enhanced Assembly AI Analysis
```python
# Upgraded Assembly AI request for cut detection
def get_enhanced_transcript(presigned_url):
    data = {
        "audio_url": presigned_url,
        "speech_model": "slam-1",
        
        # Existing features (keep these)
        "speaker_labels": True,
        "entity_detection": True,
        "iab_categories": True,
        "sentiment_analysis": True,
        "auto_highlights": True,
        "content_safety": True,
        "format_text": True,
        "punctuate": True,
        "summarization": True,
        "summary_model": "conversational",
        "summary_type": "bullets",
        
        # NEW: Cut detection features
        "disfluencies": True,  # Detects "um", "uh", false starts
        "word_boost": ["um", "uh", "like", "you know", "so", "actually", "basically"],
        "speech_threshold": 0.3,  # Lower threshold for hesitations
        "redact_pii": False,  # Keep all content for editing
        "dual_channel": False,  # Single channel processing
        
        # NEW: Advanced timing
        "speech_segments": True,  # Get speech vs silence segments  
        "word_confidence": True,  # Per-word confidence scores
    }
```

#### Stage 2: Multi-Agent Enhanced Analysis

**Agent 1: Content Segmentation & Classification**
```python
def agent_1_content_segmentation(self, assembly_data, gemini_data):
    prompt = f"""
    You are a Content Segmentation Specialist. Analyze this video for timeline editing optimization.
    
    ASSEMBLY AI DATA (includes disfluencies):
    - Transcript with word-level timing: {assembly_data['words']}
    - Disfluencies detected: {assembly_data.get('disfluencies', [])}
    - Speech segments: {assembly_data.get('speech_segments', [])}
    - Confidence scores: {assembly_data.get('confidence_scores', [])}
    
    GEMINI VISUAL DATA:
    {gemini_data}
    
    CREATE PRECISE CONTENT SEGMENTS:
    
    1. SPEECH QUALITY SEGMENTS:
       - Fluent speech (no hesitations, clear delivery)
       - Disfluent speech (um, uh, false starts, stutters)
       - Retakes/corrections ("let me try that again")
       - Unclear/mumbled speech (low confidence scores)
    
    2. CONTENT TYPE SEGMENTS:
       - Key messages (main points, important information)
       - Supporting details (examples, elaborations)
       - Transitions (verbal bridges between topics)
       - Filler content (irrelevant tangents, dead air)
    
    3. EDITING POTENTIAL:
       - Perfect standalone clips (complete thoughts, good quality)
       - Fixable segments (good content, minor audio issues)
       - Problematic segments (require heavy editing)
       - Unusable segments (technical issues, off-topic)
    
    OUTPUT: Precise segments with start/end times, type, quality score (0-100), and editing recommendations.
    """
```

**Agent 2: Cross-Video Similarity Detection**
```python
def agent_2_similarity_detection(self, current_video_data, all_project_videos):
    prompt = f"""
    You are a Similarity Detection Specialist. Find duplicate and similar content across ALL videos in this project.
    
    CURRENT VIDEO: {current_video_data['transcript']}
    
    ALL PROJECT VIDEOS:
    {[video['transcript'] for video in all_project_videos]}
    
    DETECT:
    
    1. EXACT DUPLICATES:
       - Same sentences/phrases spoken multiple times
       - Repeated explanations or demonstrations
       - Multiple takes of same content
    
    2. SEMANTIC SIMILARITIES:
       - Same concept explained differently
       - Similar examples or analogies
       - Related but distinct explanations
    
    3. TOPIC CLUSTERS:
       - Group content by main topic/theme
       - Identify best version of each topic
       - Flag redundant explanations
    
    4. QUALITY RANKING:
       - Rank similar content by delivery quality
       - Consider speech clarity, confidence, completeness
       - Identify "golden" versions vs alternatives
    
    OUTPUT: Similarity groups with quality rankings and recommended primary versions.
    """
```

**Agent 3: Comprehensive Quality Assessment**
```python
def agent_3_quality_assessment(self, assembly_data, gemini_data, segments):
    prompt = f"""
    You are a Quality Assessment Specialist. Score each segment for editing decisions.
    
    SEGMENTS TO ASSESS: {segments}
    
    QUALITY FACTORS:
    
    1. SPEECH QUALITY (40% weight):
       - Clarity and pronunciation
       - Confidence and energy level
       - Absence of disfluencies
       - Appropriate pacing
    
    2. CONTENT QUALITY (30% weight):
       - Completeness of thoughts
       - Logical flow and structure
       - Information value and relevance
       - Engaging delivery
    
    3. TECHNICAL QUALITY (20% weight):
       - Audio level consistency
       - Background noise
       - Visual stability (if video)
       - Lighting and framing
    
    4. EDITING VIABILITY (10% weight):
       - Clean entry/exit points
       - Ability to stand alone
       - Transition potential
       - Cut-around-ability
    
    SCORING SCALE:
    - 90-100: Perfect, export-ready
    - 80-89: Excellent, minor polish needed
    - 70-79: Good, some editing required
    - 60-69: Fair, significant work needed
    - 0-59: Poor, consider discarding
    
    OUTPUT: Each segment scored with detailed quality breakdown and editing recommendations.
    """
```

**Agent 4: Intelligent Cut Optimization**
```python
def agent_4_cut_optimization(self, segments, quality_scores, user_preferences):
    prompt = f"""
    You are a Cut Optimization Specialist. Generate precise, actionable cut recommendations.
    
    ANALYZED SEGMENTS: {segments}
    QUALITY SCORES: {quality_scores}
    USER PREFERENCES: {user_preferences}  # e.g., "aggressive filler removal", "preserve personality"
    
    GENERATE CUT RECOMMENDATIONS:
    
    1. FILLER WORD CUTS:
       - Precise timestamps for each "um", "uh", etc.
       - Impact assessment (does removal affect meaning?)
       - Batch grouping for efficient review
       - Alternative: keep some for natural feel
    
    2. BAD TAKE ELIMINATION:
       - False starts and restarts
       - Technical difficulties mentions
       - Off-camera interactions
       - Poor delivery attempts
    
    3. CONTENT OPTIMIZATION:
       - Remove redundant explanations
       - Eliminate tangential content
       - Trim overlong pauses
       - Cut dead air and technical gaps
    
    4. SMART ALTERNATIVES:
       - For each cut, provide rationale
       - Suggest boundary adjustments
       - Offer "light" vs "aggressive" options
       - Maintain meaning and flow
    
    OUTPUT: Structured cut list with:
    - Exact timestamps (frame-accurate)
    - Cut type and reason
    - Impact preview (before/after context)
    - User choice options (apply/skip/modify)
    - Timeline flow assessment
    """
```

#### Stage 3: Smart Library Generation
- **Perfect Clip Extraction**: Best standalone segments
- **Topic Clustering**: Group similar content across all videos
- **Quality Ranking**: Automatic best-version identification
- **Cut Impact Analysis**: Preview timeline after cuts applied

---

## Technical Implementation Proposal

### 1. Enhanced AI Analysis Pipeline

```typescript
interface EnhancedAnalysis {
  segments: ContentSegment[];
  fillerWords: FillerWordInstance[];
  badTakes: BadTakeInstance[];
  duplicateContent: DuplicateGroup[];
  qualityScores: QualityScore[];
  bestClips: ExtractedClip[];
}

interface ContentSegment {
  id: string;
  startTime: number;
  endTime: number;
  type: 'speech' | 'filler' | 'pause' | 'bad_take' | 'good_content';
  confidence: number;
  qualityScore: number; // 0-100
  transcription: string;
  similarTo?: string[]; // IDs of similar segments
  tags: string[];
}

interface DuplicateGroup {
  id: string;
  segments: ContentSegment[];
  bestVersion: string; // ID of highest quality version
  topic: string;
  averageQuality: number;
}

interface ExtractedClip {
  id: string;
  startTime: number;
  endTime: number;
  quality: number;
  description: string;
  type: 'perfect_take' | 'clean_speech' | 'highlight_moment';
  originalSegments: string[]; // Source segment IDs
}
```

### 2. Interactive Cut Management Interface

#### Cut Review Panel
```typescript
interface CutReviewState {
  cuts: ReviewableCut[];
  currentCut: number;
  previewMode: 'before' | 'after' | 'split';
  batchFilters: CutFilter[];
}

interface ReviewableCut {
  id: string;
  type: 'filler_word' | 'bad_take' | 'irrelevant_content' | 'repetition';
  startTime: number;
  endTime: number;
  reason: string;
  confidence: number;
  status: 'pending' | 'approved' | 'rejected' | 'modified';
  originalContent: string; // What's being cut
  impactPreview: string; // How timeline flows after cut
}
```

#### Visual Timeline Enhancement
- **Color-coded overlays**: Different colors for different cut types
- **Hover previews**: Quick preview of cut content
- **Before/after toggle**: Switch between original and edited view
- **Cut boundaries**: Draggable handles to adjust cut points
- **Undo/redo stack**: Full edit history

### 3. Smart Media Library Architecture

#### Organized Clip System
```typescript
interface SmartMediaLibrary {
  perfectClips: ExtractedClip[];
  topicGroups: TopicGroup[];
  qualityRankings: QualityRanking[];
  exportReadySegments: ExportSegment[];
}

interface TopicGroup {
  id: string;
  topic: string;
  clips: ExtractedClip[];
  bestVersion: string;
  alternatives: AlternativeVersion[];
}

interface AlternativeVersion {
  clipId: string;
  qualityScore: number;
  differenceReasons: string[];
  recommendedUse: string;
}

interface ExportSegment {
  id: string;
  title: string;
  duration: number;
  segments: ContentSegment[];
  qualityScore: number;
  readinessLevel: number; // Percentage ready for export
}
```

### 4. User Flow Implementation

#### Step 1: Upload & Analysis
1. **Video uploaded** → Enhanced AI analysis
2. **Progress indicator** showing analysis phases:
   - Transcription & speech detection
   - Quality assessment
   - Similarity analysis
   - Content classification
   - Clip extraction

#### Step 2: Cut Review Interface
1. **Cut Dashboard**: Overview of all detected issues
   - X filler words detected
   - Y bad takes identified
   - Z repetitions found
2. **Interactive Review**:
   - Navigate cut-by-cut
   - Preview removed content
   - Adjust cut boundaries
   - Batch approve by type
3. **Real-time Timeline Update**: See changes as you approve cuts

#### Step 3: Smart Library Population
1. **Auto-generated Perfect Clips**: Extracted during review process
2. **Topic-based Organization**: Group similar content
3. **Quality Rankings**: Best versions prominently displayed
4. **Export Readiness Indicator**: Show completion percentage

#### Step 4: Final Timeline Assembly
1. **Drag approved segments** to timeline
2. **Auto-connection**: Intelligent gap handling
3. **Polish tools**: Basic transitions, fade in/out
4. **Export preview**: Final quality check before render

---

## Database Schema Changes

### New Tables

```sql
-- Enhanced content analysis
CREATE TABLE content_segments (
  id UUID PRIMARY KEY,
  video_id UUID REFERENCES videos(id),
  start_time DECIMAL NOT NULL,
  end_time DECIMAL NOT NULL,
  segment_type TEXT NOT NULL,
  quality_score INTEGER DEFAULT 0,
  confidence DECIMAL DEFAULT 0,
  transcription TEXT,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Cut management
CREATE TABLE timeline_cuts (
  id UUID PRIMARY KEY,
  video_id UUID REFERENCES videos(id),
  segment_id UUID REFERENCES content_segments(id),
  cut_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  reason TEXT,
  user_modified BOOLEAN DEFAULT FALSE,
  original_start DECIMAL,
  original_end DECIMAL,
  modified_start DECIMAL,
  modified_end DECIMAL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Extracted clips
CREATE TABLE extracted_clips (
  id UUID PRIMARY KEY,
  video_id UUID REFERENCES videos(id),
  start_time DECIMAL NOT NULL,
  end_time DECIMAL NOT NULL,
  clip_type TEXT NOT NULL,
  quality_score INTEGER DEFAULT 0,
  title TEXT,
  description TEXT,
  source_segments UUID[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Content similarity groups
CREATE TABLE content_groups (
  id UUID PRIMARY KEY,
  video_id UUID REFERENCES videos(id),
  topic TEXT,
  best_clip_id UUID REFERENCES extracted_clips(id),
  segment_ids UUID[],
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## User Experience Flow

### Main Editing Workflow

#### 1. **Analysis Complete → Review Dashboard**
```
┌─────────────────────────────────────┐
│ Video Analysis Complete ✓           │
├─────────────────────────────────────┤
│ 📊 Found Issues:                    │
│   • 47 filler words (2.3 min)      │
│   • 12 bad takes (4.1 min)         │
│   • 8 repetitions (3.2 min)        │
│   • 5 irrelevant sections (1.8 min)│
│                                     │
│ 🎯 Extracted 6 perfect clips        │
│ 📈 Potential 80% edit ready         │
│                                     │
│ [Review Cuts] [Skip to Library]     │
└─────────────────────────────────────┘
```

#### 2. **Cut-by-Cut Review Interface**
```
┌─────────────────────────────────────┐
│ Reviewing Cut 1 of 72               │
├─────────────────────────────────────┤
│ Type: Filler Word "um"              │
│ Time: 0:23-0:24                     │
│ Confidence: 95%                     │
│                                     │
│ 🔊 [Preview] [Before] [After]       │
│                                     │
│ "So today we're, um, going to..."   │
│ "So today we're going to..."        │
│                                     │
│ [✓ Approve] [✗ Reject] [✏ Modify]   │
│ [Skip Similar] [Approve All Type]   │
└─────────────────────────────────────┘
```

#### 3. **Smart Library Organization**
```
┌─────────────────────────────────────┐
│ Perfect Clips (6 found)             │
├─────────────────────────────────────┤
│ 🏆 "Product Demo" (2:34) - 98%     │
│ 🏆 "Key Benefits" (1:45) - 96%     │
│ 🏆 "Call to Action" (0:43) - 94%   │
│                                     │
│ Similar Content Groups              │
├─────────────────────────────────────┤
│ 📁 Introduction (3 versions)        │
│   ⭐ Version B (0:45) - Best        │
│   • Version A (0:52) - Good        │
│   • Version C (0:38) - Rushed      │
│                                     │
│ 📁 Pricing Discussion (2 versions)  │
│   ⭐ Version A (1:23) - Best        │
│   • Version B (1:45) - Too long    │
└─────────────────────────────────────┘
```

#### 4. **Export-Ready Assembly**
```
┌─────────────────────────────────────┐
│ Timeline Assembly                   │
├─────────────────────────────────────┤
│ Completion: 78% (Ready for Export)  │
│                                     │
│ Timeline: [Intro][Demo][Benefits]   │
│          [    ][CTA ][    ]         │
│                                     │
│ Missing:                            │
│ • Transition between Demo & Benefits│
│ • Background music                  │
│ • End screen                        │
│                                     │
│ [Add Transitions] [Export Now]      │
│ [Continue in DaVinci] [Polish More] │
└─────────────────────────────────────┘
```

---

## Success Metrics & Goals

### User Success Criteria
- **80% Edit Completion**: User can export without external tools
- **Time Reduction**: 5x faster than manual editing
- **Quality Maintenance**: No important content accidentally removed
- **Confidence**: User knows exactly what was changed and why

### Technical Success Metrics
- **Cut Accuracy**: >95% relevant cuts suggested
- **False Positives**: <5% incorrect cut suggestions
- **Performance**: Analysis complete in <2 minutes for 30-min video
- **User Adoption**: >70% of cuts approved without modification

---

## Lambda Integration Plan

### Current Lambda Modification Strategy

**1. Upgrade Assembly AI Request (Quick Win - 1 day)**
```python
# In lambda_function_single_clip_analysis.py, line ~401
# Add these parameters to existing data dict:

data.update({
    # Enhanced cut detection
    "disfluencies": True,
    "word_boost": ["um", "uh", "like", "you know", "so", "actually", "basically", "literally"],
    "speech_threshold": 0.3,
    "word_confidence": True,
    
    # Advanced segmentation  
    "speech_segments": True,
    "auto_chapters": True,  # Topic-based chapters
    "boost_param": {
        "words": ["let me try that again", "sorry", "hang on", "wait"],
        "boost": 3.0
    }
})
```

**2. Add New Agent to Existing System (3 days)**
```python
# Add as Agent 4 in SingleClipAnalyzer class
def agent_4_timeline_cut_analysis(self):
    """NEW: Comprehensive cut analysis for timeline editing"""
    
    # Use enhanced Assembly data with disfluencies
    disfluencies = self.raw_transcript_data.get('disfluencies', [])
    word_confidence = self.raw_transcript_data.get('word_confidence', [])
    speech_segments = self.raw_transcript_data.get('speech_segments', [])
    
    prompt = f"""
    You are a Timeline Cut Specialist working with this enhanced transcript data:
    
    DISFLUENCIES DETECTED: {disfluencies}
    WORD CONFIDENCE SCORES: {word_confidence}  
    SPEECH SEGMENTS: {speech_segments}
    FULL TRANSCRIPT: {self.raw_transcript_data.get('text', '')}
    
    Generate precise cut recommendations for timeline editing:
    [Insert Agent 4 prompt from above]
    """
    
    return self.call_claude(prompt, temperature=0.1)
```

**3. Cross-Video Similarity Analysis (5 days)**
```python
# New lambda function: similarity_analyzer.py
class ProjectSimilarityAnalyzer:
    """Analyzes similarity across ALL videos in a project"""
    
    def analyze_project_similarities(self, project_id):
        # Get all videos in project
        videos = self.get_project_videos(project_id)
        
        # Run cross-video similarity analysis
        similarity_results = self.find_content_similarities(videos)
        
        # Generate smart library organization
        smart_library = self.create_smart_library(similarity_results)
        
        return smart_library
```

**4. Database Schema Updates (2 days)**
```sql
-- Add new tables (from earlier in doc)
CREATE TABLE enhanced_video_analysis (
    id UUID PRIMARY KEY,
    video_id UUID REFERENCES videos(id),
    
    -- Cut analysis results
    filler_words JSONB,           -- Detected filler words with timestamps
    bad_takes JSONB,              -- Poor delivery segments  
    quality_segments JSONB,       -- Segment quality scores
    cut_recommendations JSONB,    -- Suggested cuts with rationale
    
    -- Similarity analysis
    similar_content_groups JSONB, -- Cross-video content groups
    best_versions JSONB,          -- Quality rankings within groups
    duplicate_segments JSONB,     -- Exact/near duplicate content
    
    -- Smart library data
    perfect_clips JSONB,          -- Extract-ready segments
    export_readiness_score DECIMAL DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced content segments table
ALTER TABLE content_segments ADD COLUMN speech_quality_score INTEGER DEFAULT 0;
ALTER TABLE content_segments ADD COLUMN disfluency_count INTEGER DEFAULT 0;
ALTER TABLE content_segments ADD COLUMN word_confidence DECIMAL DEFAULT 0;
```

### Implementation Phases

**Phase 1: Enhanced Assembly AI (1 week)**
- ✅ Add disfluency detection to existing lambda
- ✅ Enhance transcript analysis with quality metrics  
- ✅ Implement Agent 4 cut analysis
- ✅ Update database to store cut recommendations

**Phase 2: Smart Library Backend (2 weeks)**  
- 🔄 Cross-video similarity detection lambda
- 🔄 Perfect clip extraction algorithm
- 🔄 Content grouping and ranking system
- 🔄 Export readiness scoring

**Phase 3: Cut Review Interface (3 weeks)**
- 🔄 Interactive cut approval UI
- 🔄 Timeline visualization with cut overlays
- 🔄 Preview system for cut content
- 🔄 Batch cut operations

**Phase 4: Smart Media Library UI (2 weeks)**
- 🔄 Organized clip browser
- 🔄 Similarity group interface
- 🔄 Quality-based recommendations
- 🔄 Export-ready segment display

**Phase 5: Integration & Polish (1 week)**
- 🔄 End-to-end workflow testing
- 🔄 Performance optimization
- 🔄 User experience refinement
- 🔄 Documentation and training

---

## Enhanced Gemini Prompt for Timeline Cuts

### Current Problem with Existing Prompt
Your current Gemini prompts focus on scene descriptions and general editing suggestions, but they don't provide the **precise visual quality and editing data** needed for timeline cuts. For our enhanced system, we need Gemini to analyze:

1. **Visual quality frame-by-frame** (lighting, stability, framing)
2. **Edit points and transitions** (natural cut points, visual flow)
3. **Technical issues** (blur, noise, exposure problems)
4. **Visual-audio correlation** (does the visual match the speech quality?)

### Proposed Enhanced Gemini Prompts

```python
def get_enhanced_analysis_prompt(self, analysis_type, assembly_transcript_data=None):
    """Enhanced prompts for timeline cut optimization"""
    
    if analysis_type == 'timeline_cuts':
        return f"""
You are a Video Editing Specialist analyzing this video for precise timeline cutting. Focus on EDITING VIABILITY rather than content description.

ASSEMBLY AI TRANSCRIPT DATA (for correlation):
{assembly_transcript_data if assembly_transcript_data else "No transcript provided"}

YOUR ANALYSIS GOALS:
1. VISUAL QUALITY ASSESSMENT (frame-by-frame where needed)
2. OPTIMAL CUT POINTS identification  
3. TECHNICAL ISSUE DETECTION
4. VISUAL-AUDIO CORRELATION
5. EDITING RECOMMENDATIONS for timeline optimization

PROVIDE DETAILED ANALYSIS FOR:

## SECTION 1: VISUAL QUALITY SEGMENTS
For each segment, analyze:
- **Lighting quality**: Consistent exposure, proper lighting, shadows/highlights
- **Camera stability**: Shake, wobble, sudden movements that affect editing
- **Framing quality**: Subject positioning, composition, visual appeal
- **Technical issues**: Blur, noise, compression artifacts, color issues
- **Edit-ability score**: How suitable is this segment for clean cuts (0-100)

Format: 
```json
"visualQualitySegments": [
  {{
    "timeRange": "0:00-0:15",
    "lightingQuality": "excellent|good|fair|poor",
    "stabilityScore": 85,
    "framingQuality": "professional",
    "technicalIssues": ["slight motion blur at 0:08-0:10"],
    "editabilityScore": 88,
    "visualDescription": "Well-lit close-up, stable framing, minor blur during gesture",
    "editingNotes": "Perfect for main content, trim blur section"
  }}
]
```

## SECTION 2: OPTIMAL CUT POINTS
Identify the BEST places to make cuts based on visual flow:
- **Natural cut points**: Scene changes, camera movements, gesture completions
- **Avoid cut zones**: Mid-gesture, during movement, poor framing moments  
- **Transition quality**: How well cuts would flow together
- **Visual continuity**: Maintaining consistent look between cuts

Format:
```json
"optimalCutPoints": [
  {{
    "timestamp": "0:14.5",
    "cutType": "natural_pause",
    "visualContext": "Subject completes gesture, returns to neutral position",
    "cutQuality": "excellent",
    "reasoning": "Clean visual break, good for splitting content",
    "avoid": false
  }},
  {{
    "timestamp": "0:23.2", 
    "cutType": "mid_gesture",
    "visualContext": "Hand pointing, mid-motion",
    "cutQuality": "poor",
    "reasoning": "Would create jarring visual break",
    "avoid": true
  }}
]
```

## SECTION 3: VISUAL-AUDIO CORRELATION  
Analyze how visual quality correlates with speech from transcript:
- **Strong correlation**: Good visuals + clear speech = keep segment
- **Mismatch areas**: Great visuals + poor audio OR poor visuals + great audio
- **Technical sync**: Visual and audio technical quality alignment
- **Editing priority**: Which segments deserve priority in timeline

Format:
```json
"visualAudioCorrelation": [
  {{
    "timeRange": "0:00-0:30",
    "visualQuality": 92,
    "audioQuality": 85, 
    "correlation": "strong",
    "editingPriority": "high",
    "recommendation": "Perfect for main timeline - both visual and audio excellent",
    "issues": []
  }},
  {{
    "timeRange": "0:45-1:15", 
    "visualQuality": 75,
    "audioQuality": 95,
    "correlation": "mismatch", 
    "editingPriority": "medium",
    "recommendation": "Good audio content, fix visual issues or use as voice-over",
    "issues": ["lighting too dark", "slight camera shake"]
  }}
]
```

## SECTION 4: TIMELINE OPTIMIZATION RECOMMENDATIONS
Provide specific editing guidance for timeline assembly:

```json
"timelineOptimization": {{
  "bestSegments": [
    {{
      "timeRange": "0:00-0:30",
      "reason": "Perfect visual and audio quality",
      "useCase": "primary_content",
      "confidence": 95
    }}
  ],
  "problemSegments": [
    {{
      "timeRange": "1:20-1:35", 
      "issues": ["poor lighting", "camera shake"],
      "recommendation": "stabilize_and_color_correct",
      "severity": "medium"
    }}
  ],
  "editingComplexity": "low|medium|high",
  "overallEditability": 85,
  "recommendedCutStrategy": "aggressive|moderate|conservative"
}}
```

CRITICAL: Focus on EDITING UTILITY, not content description. Every analysis point should help with cutting decisions.
"""

    elif analysis_type == 'sample':
        return f"""
Quick editing assessment for first 30 seconds:

ASSEMBLY TRANSCRIPT PREVIEW:
{assembly_transcript_data[:500] if assembly_transcript_data else "No transcript"}

RAPID ANALYSIS:
1. **Visual Quality Snapshot**: Overall lighting, stability, framing quality
2. **Cut Point Identification**: 2-3 best places to cut in this sample
3. **Technical Issues**: Any obvious problems affecting editing
4. **Edit Readiness**: Can this be used in timeline as-is? (0-100 score)
5. **Quick Recommendations**: Top 2 editing actions needed

Focus on: Can we use this footage? Where can we cut it? What needs fixing?
"""

    else:  # Comprehensive analysis
        return f"""
Comprehensive editing-focused video analysis for timeline optimization.

FULL ASSEMBLY AI TRANSCRIPT:
{assembly_transcript_data if assembly_transcript_data else "No transcript provided"}

COMPLETE ANALYSIS REQUIRED:

## VISUAL QUALITY ASSESSMENT
- Frame-by-frame quality analysis
- Lighting consistency throughout video
- Camera stability and movement quality
- Technical issues identification
- Color and exposure analysis

## EDITING OPTIMIZATION
- Complete cut point mapping
- Visual flow analysis  
- Transition recommendations
- Timeline assembly strategy
- Quality-based segment prioritization

## TECHNICAL INTEGRATION
- Visual-audio synchronization check
- Technical quality correlation with transcript
- Editing complexity assessment
- Post-production requirements
- Export readiness evaluation

DELIVER: Complete editing blueprint for timeline cuts system integration.

Use the same JSON structure as timeline_cuts analysis but with comprehensive detail for entire video.
"""
```

### Key Improvements in Enhanced Prompt:

1. **Assembly AI Integration**: Uses transcript data to correlate visual and audio quality
2. **Editing-Focused**: Every analysis point serves timeline cutting decisions
3. **Precise Timestamps**: Frame-accurate cut point identification
4. **Quality Scoring**: Numerical scores for automated decision making
5. **Technical Issues**: Specific problems that affect editing viability
6. **Visual-Audio Correlation**: Critical for editing decisions
7. **Structured JSON**: Easy integration with your cut management system

### Integration with Your Lambda:

```python
# In your lambda, enhance the Gemini call:
def get_video_results_from_gcp(self, presigned_url, assembly_data=None):
    # ... existing code ...
    
    # Use enhanced prompt with Assembly data
    enhanced_prompt = self.get_enhanced_analysis_prompt('timeline_cuts', assembly_data)
    
    # Rest of Gemini API call with enhanced prompt
```

This transforms Gemini from a general video analyzer into a **precision editing tool** that directly feeds your timeline cuts system.

## Critical Problem: Timeline Position Tracking

### The Problem You've Identified

This is the **most complex challenge** in our timeline cuts system:

**Scenario:**
```
Original video: 12 minutes (720 seconds)
LLM finds filler word "um" at 10 seconds

User actions:
1. Remove first 7 seconds → "um" now at 3 seconds (10 - 7 = 3)
2. Drag that segment to end → "um" now at ??? seconds

How do we track the "um" cut recommendation?
```

### Why This Is Complex

1. **Dynamic Timeline**: Clips move, get trimmed, reordered
2. **Multiple Videos**: Each clip could be from different source videos
3. **Nested Cuts**: Cuts within cuts within timeline segments
4. **Real-time Updates**: Cut recommendations must update live as timeline changes

### Proposed Solutions

#### Solution 1: Source-Relative Positioning (Recommended)

Instead of timeline positions, track cuts relative to **source video**:

```typescript
interface CutRecommendation {
  id: string;
  sourceVideoId: string;          // Which original video
  sourceTimestamp: number;        // Time in ORIGINAL video (never changes)
  cutType: 'filler_word' | 'bad_take' | 'irrelevant';
  content: string;                // "um", "uh", actual problematic content
  duration: number;               // How long to cut (0.5 seconds for "um")
  
  // Dynamic fields (calculated in real-time)
  currentTimelinePositions: TimelinePosition[];  // Where this cut appears on timeline NOW
}

interface TimelinePosition {
  timelineItemId: string;         // Which timeline item contains this cut
  relativeStartTime: number;      // Time within that timeline item
  absoluteTimelineTime: number;   // Time on the overall timeline
  isVisible: boolean;             // Is this cut currently visible on timeline?
}
```

**Benefits:**
- Cut recommendations **never lose their source reference**
- Can calculate current timeline position dynamically
- Works even when clips are moved, trimmed, duplicated

#### Solution 2: Timeline Relationship Mapping

```typescript
interface TimelineCutTracker {
  cuts: SourceCut[];
  timelineItems: TimelineItem[];
  
  // Real-time calculation methods
  getCurrentCutPositions(cutId: string): TimelinePosition[];
  updateTimelinePositions(timelineItems: TimelineItem[]): void;
  findCutsInTimelineRange(start: number, end: number): CutRecommendation[];
}

class TimelineCutCalculator {
  // Core method: Given a source cut, find all its current timeline positions
  calculateCurrentPositions(sourceCut: CutRecommendation, timeline: TimelineItem[]): TimelinePosition[] {
    const positions: TimelinePosition[] = [];
    
    // Find all timeline items using this source video
    const relevantItems = timeline.filter(item => 
      item.sourceVideoId === sourceCut.sourceVideoId
    );
    
    for (const item of relevantItems) {
      // Check if this cut falls within the item's trim range
      const itemSourceStart = item.trimStart || 0;
      const itemSourceEnd = item.trimEnd || item.sourceDuration;
      
      if (sourceCut.sourceTimestamp >= itemSourceStart && 
          sourceCut.sourceTimestamp <= itemSourceEnd) {
        
        // Calculate where this cut appears within this timeline item
        const relativeTime = sourceCut.sourceTimestamp - itemSourceStart;
        const absoluteTimelineTime = item.startTime + relativeTime;
        
        positions.push({
          timelineItemId: item.id,
          relativeStartTime: relativeTime,
          absoluteTimelineTime: absoluteTimelineTime,
          isVisible: true
        });
      }
    }
    
    return positions;
  }
}
```

#### Solution 3: Cut State Management

```typescript
interface CutManagementSystem {
  // Source cuts (never change)
  sourceCuts: Map<string, SourceCut>;
  
  // Timeline state
  timelineItems: TimelineItem[];
  
  // Cut states (approved, rejected, pending)
  cutStates: Map<string, CutState>;
  
  // Real-time methods
  onTimelineChange(newTimeline: TimelineItem[]): void;
  getVisibleCuts(): VisibleCut[];
  applyCut(cutId: string): void;
  rejectCut(cutId: string): void;
}

interface SourceCut {
  id: string;
  videoId: string;
  sourceTime: number;           // NEVER changes
  type: string;
  content: string;
  confidence: number;
}

interface VisibleCut extends SourceCut {
  timelinePositions: TimelinePosition[];
  canApply: boolean;            // Is cut still valid?
  affectedItems: string[];      // Which timeline items would be affected
}
```

### Implementation Strategy

#### Phase 1: Source-Relative Storage
```typescript
// When analysis completes, store cuts relative to source
const sourceRelativeCuts = analysisResult.fillerWords.map(filler => ({
  id: uuidv4(),
  sourceVideoId: videoId,
  sourceTimestamp: filler.timestamp,  // From original video
  cutType: 'filler_word',
  content: filler.word,
  duration: filler.duration,
  reason: filler.reason,
  confidence: filler.confidence
}));

// Store in database
await supabase.from('timeline_cuts').insert(sourceRelativeCuts);
```

#### Phase 2: Real-Time Position Calculation
```typescript
// In timeline component, calculate current positions when timeline changes
useEffect(() => {
  const updateCutPositions = () => {
    const allCuts = getCutsForProject(projectId);
    const visibleCuts = allCuts.map(cut => ({
      ...cut,
      currentPositions: cutCalculator.calculateCurrentPositions(cut, timelineItems)
    }));
    setVisibleCuts(visibleCuts);
  };
  
  updateCutPositions();
}, [timelineItems]); // Recalculate when timeline changes
```

#### Phase 3: Cut Application
```typescript
const applyCut = (cutId: string) => {
  const cut = sourceCuts.get(cutId);
  const positions = cut.currentPositions;
  
  // Apply cut to all timeline items where it appears
  positions.forEach(position => {
    const timelineItem = getTimelineItem(position.timelineItemId);
    
    // Create new timeline items around the cut
    const beforeCut = {
      ...timelineItem,
      duration: position.relativeStartTime * fps
    };
    
    const afterCut = {
      ...timelineItem,
      startTime: timelineItem.startTime + (position.relativeStartTime + cut.duration) * fps,
      trimStart: (timelineItem.trimStart || 0) + position.relativeStartTime + cut.duration,
      duration: timelineItem.duration - (position.relativeStartTime + cut.duration) * fps
    };
    
    // Replace original item with split items
    replaceTimelineItem(timelineItem.id, [beforeCut, afterCut]);
  });
  
  // Mark cut as applied
  setCutState(cutId, 'applied');
};
```

### Database Schema for Timeline Cuts

```sql
CREATE TABLE timeline_cuts (
  id UUID PRIMARY KEY,
  video_id UUID REFERENCES videos(id),
  
  -- Source-relative data (never changes)
  source_timestamp DECIMAL NOT NULL,  -- Time in original video
  cut_type TEXT NOT NULL,             -- 'filler_word', 'bad_take', etc.
  content TEXT,                       -- What's being cut
  duration DECIMAL DEFAULT 0,         -- How long to cut
  reason TEXT,                        -- Why cut this
  confidence DECIMAL DEFAULT 0,       -- AI confidence
  
  -- Cut state
  status TEXT DEFAULT 'pending',      -- 'pending', 'applied', 'rejected'
  user_modified BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_timeline_cuts_video_timestamp ON timeline_cuts(video_id, source_timestamp);
CREATE INDEX idx_timeline_cuts_status ON timeline_cuts(status);
```

### User Experience Flow

```
1. User uploads 12-minute video
2. AI finds "um" at 10 seconds in SOURCE video
3. Cut stored as: { sourceVideoId: "abc", sourceTimestamp: 10, type: "filler_word" }

4. User trims first 7 seconds from timeline
   → Cut calculator finds "um" now appears at timeline position 3 seconds
   → Cut shows in UI at current position (3 seconds)

5. User drags segment to end of timeline  
   → Cut calculator finds "um" now appears at timeline position 8 minutes
   → Cut UI updates to show new position

6. User approves cut
   → System splits timeline item at calculated position
   → "um" removed from timeline regardless of current position
```

### Questions for Collaboration

1. **Should we calculate positions in real-time** or cache them and update on timeline changes?

2. **How do we handle cuts that span multiple timeline items** (same source video used multiple times)?

3. **What happens if a cut's source content is trimmed out** of all timeline items?

4. **Should we show cut markers on the timeline** or only in the cut review panel?

5. **How do we handle precision** - frame-accurate cuts vs second-level cuts?

6. **Do we need undo/redo** for cut operations specifically?

This is a complex problem but the source-relative approach should solve the core tracking issue. What are your thoughts on this approach?

## Open Questions for Collaboration

1. **Cut Granularity**: How fine-grained should cut boundaries be? Frame-level or second-level precision?

2. **Undo System**: Should we maintain full edit history or just recent changes?

3. **Preview Performance**: How to efficiently preview multiple cuts without re-encoding?

4. **Export Integration**: Which export formats/platforms should we prioritize?

5. **User Guidance**: How much hand-holding vs. user control in the cut review process?

6. **Similarity Threshold**: What confidence level should trigger content grouping?

7. **Quality Metrics**: What factors should determine "quality score" for segments?

8. **Timeline Complexity**: Should we support multiple tracks or keep it simple?

Let's discuss these points and refine the approach before implementation!

---

# Phase 4: Visual Timeline Layout with Applied Cuts

## Current Timeline Analysis (Based on Screenshot)

### Current Layout Components:
- **Video Player**: Top center with video preview
- **Timeline Controls**: Play/pause, time display (00:09:03 / 12:15:00), zoom controls
- **Action Buttons**: Split, Add Text, Add Track
- **Timeline Ruler**: Time markers every 10 seconds (0:00, 0:10, 0:20, etc.)
- **Track System**: Track 1 (with blue video segment), Track 2 (empty)
- **Track Controls**: Expand/collapse, track labels
- **Playhead**: Red vertical line at current position

### Current Strengths:
- Clean, professional layout
- Clear time navigation
- Good visual hierarchy
- Familiar video editing interface

## Proposed Phase 4 Layout: Timeline with Applied Cuts

### 1. Enhanced Timeline with Cut Indicators

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Video Preview (unchanged)                         │
├─────────────────────────────────────────────────────────────────────────┤
│ ⏸️ 00:09:03 / 12:15:00  [-] 26% [+] Fit  🗂️Split 📝Add Text 🎬Add Track │
│                                                                         │
│ NEW: 💡 12 cuts applied • 2m 34s saved • [👁️ Show Original] [Review Cuts] │
├─────────────────────────────────────────────────────────────────────────┤
│                    Timeline Ruler (enhanced)                            │
│ 0:00   0:10   0:20   0:30   0:40   0:50   1:00   1:10   1:20   1:30    │
│  │     │     │     │     │     │     │     │     │     │     │     │    │
│  ⚬     ⚬     ⚬           ⚬     ⚬                  ⚬     ⚬            │
│  └─ Small cut markers (⚬) showing where content was removed            │
├─────────────────────────────────────────────────────────────────────────┤
│ ▼ Track 1 (Video)                                              ×       │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ IMG_0333.MOV                                                        │ │
│ │ ████████│████████│███████████████│█████│████████████████│██████████    │ │
│ │         │        │               │     │                │           │ │
│ │         │        │               │     │                │           │ │
│ │         ▼        ▼               ▼     ▼                ▼           │ │
│ │       cut      cut             cut   cut              cut          │ │
│ │     split     split           split split            split         │ │
│ │    lines      lines           lines lines            lines         │ │
│ │                                                                     │ │
│ │ └─ Visual split lines show where cuts were applied and clips joined │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ▼ Track 2 (Audio)                                              ×       │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ [Empty - user can add audio tracks as normal]                      │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ▼ Track 3 (Text)                                               ×       │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ [Empty - user can add text tracks as normal]                       │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. Cut Status Bar (New Component)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 💡 Video Cleanup Status                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│ ✅ 12 cuts applied • 2m 34s saved • 78% completion                      │
│                                                                         │
│ Cut Types:                                                              │
│ 🗣️ Filler Words (7) • 🔄 Bad Takes (3) • ⏸️ Long Pauses (2)            │
│                                                                         │
│ [📋 Review All Cuts] [🔄 Undo Last] [↩️ Restore All] [⚙️ Settings]     │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3. Enhanced Timeline Item with Cut Visualization

```
Track 1: Clean Timeline (What user sees/exports)
┌─────────────────────────────────────────────────────────────────────────┐
│ IMG_0333.MOV                                                            │
│ ████████████████████████████████████████████████████████████████████    │
│ │<─────────────── 9m 41s (clean duration) ────────────────────────>│    │
│                                                                         │
│ Hover tooltips show:                                                    │
│ • "Removed 'um' at 0:15 (0.8s saved)"                                  │
│ • "Cut bad take at 2:34 (12s saved)"                                   │
└─────────────────────────────────────────────────────────────────────────┘

Track 2: Original Reference (Optional, collapsible)
┌─────────────────────────────────────────────────────────────────────────┐
│ IMG_0333.MOV (Original - 12m 15s)                                      │
│ ████████▒▒██████▒▒███████████████▒▒█████▒▒████████████████▒▒██████████   │
│ │        ^^      ^^               ^^     ^^                ^^        │ │
│ │        │       │                │      │                 │         │ │
│ │      filler   bad              filler  pause           filler      │ │
│ │      word     take             word    (3s)             word       │ │
│ │      (0.8s)   (12s)            (1.2s)                   (0.9s)     │ │
│ │                                                                     │ │
│ │ Click any greyed section to restore it                             │ │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.1. Original Video Preview (Hidden by Default)

```
When user clicks [👁️ Show Original] button:

┌─────────────────────────────────────────────────────────────────────────┐
│ Original Video Preview (Overlay/Modal)                                  │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                        Video Player                                 │ │
│ │ ┌─────────────────────────────────────────────────────────────────┐ │ │
│ │ │                                                                 │ │ │
│ │ │               [Video Content]                                   │ │ │
│ │ │                                                                 │ │ │
│ │ │ Mode: [🎬 Clean] [📹 Original] [🔍 Compare]                     │ │ │
│ │ └─────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                     │ │
│ │ Original Timeline (IMG_0333.MOV - 12m 15s)                         │ │
│ │ ████████▒▒██████▒▒███████████████▒▒█████▒▒████████████████▒▒██████   │ │
│ │          ^^      ^^               ^^     ^^                ^^       │ │
│ │          │       │                │      │                 │        │ │
│ │        filler   bad              filler  pause           filler     │ │
│ │        word     take             word    (3s)             word      │ │
│ │        (0.8s)   (12s)            (1.2s)                   (0.9s)    │ │
│ │                                                                     │ │
│ │ Click any greyed section to restore it                             │ │
│ │                                                                     │ │
│ │ [✅ Apply Changes] [❌ Cancel] [🔄 Reset All Cuts]                  │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4. Cut Markers on Timeline Ruler

```
Enhanced Timeline Ruler with Small Cut Indicators:
┌─────────────────────────────────────────────────────────────────────────┐
│ 0:00   0:10   0:20   0:30   0:40   0:50   1:00   1:10   1:20   1:30    │
│  │     │     │     │     │     │     │     │     │     │     │     │    │
│  ⚬     ⚬     ⚬           ⚬     ⚬                  ⚬     ⚬            │
│  └─ Small, subtle cut markers that don't clutter the timeline          │
│                                                                         │
│ Hover over ⚬ shows tooltip:                                            │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Cut: Filler word "um"                                               │ │
│ │ Duration: 0.8s saved                                                │ │
│ │ Time: 0:15.2 - 0:16.0                                              │ │
│ │ Confidence: 95%                                                     │ │
│ │ [🔄 Restore] [👁️ Preview]                                           │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5. Cut Review Bottom Panel (Industry Standard)

```
Main Timeline (unchanged)
┌─────────────────────────────────────────────────────────────────────────┐
│ [Normal timeline view with cut markers]                                 │
│ ████████████████████████████████████████████████████████████████████    │
├─────────────────────────────────────────────────────────────────────────┤
│ Cut Review Panel (slides up from bottom like DaVinci Resolve)           │
├─────────────────────────────────────────────────────────────────────────┤
│ 📋 Applied Cuts (12) • 2m 34s saved                    [−] Collapse     │
│                                                                         │
│ 🗣️ Filler Words (7)  🔄 Bad Takes (3)  ⏸️ Pauses (2)  [Filter ▼]      │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ✅ 0:15 "um" (0.8s) • 95% confidence    [🔄 Restore] [👁️ Preview]  │ │
│ │ ✅ 0:23 "uh" (0.6s) • 92% confidence    [🔄 Restore] [👁️ Preview]  │ │
│ │ ✅ 0:45 "like" (1.2s) • 87% confidence  [🔄 Restore] [👁️ Preview]  │ │
│ │ ✅ 2:34 Bad take (12s) • 94% confidence [🔄 Restore] [👁️ Preview]  │ │
│ │ ✅ 4:12 Long pause (3.2s) • 89% conf.   [🔄 Restore] [👁️ Preview]  │ │
│ │                                                                     │ │
│ │ [Show 7 more cuts...]                                              │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ [↩️ Restore All] [📤 Export EDL] [⚙️ Settings] [✨ Detect More Cuts]   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6. Video Player Enhancements

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Video Preview                                    │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │                                                                     │ │
│ │                    [Video Content]                                  │ │
│ │                                                                     │ │
│ │                                                                     │ │
│ │ NEW: Cut Preview Mode                                               │ │
│ │ ┌─────────────────────────────────────────────────────────────────┐ │ │
│ │ │ 🎬 Preview Mode: [Clean Version] [Original] [Split View]        │ │ │
│ │ │                                                                 │ │ │
│ │ │ Currently showing: Clean version (cuts applied)                │ │ │
│ │ │ Next cut at: 0:23 (filler word "uh")                          │ │ │
│ │ │                                                                 │ │ │
│ │ │ [◀️ Prev Cut] [▶️ Next Cut] [🔍 Focus on Cut]                   │ │ │
│ │ └─────────────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

## Implementation Strategy

### Phase 4A: Basic Cut Visualization (Week 1)
- Add cut markers (⚡) to timeline ruler
- Show basic cut count in status bar
- Implement hover tooltips on cut markers
- Add "Review Cuts" button to open cut panel

### Phase 4B: Enhanced Timeline Display (Week 2)
- Add optional "Original Reference" track
- Implement grey-out visualization for removed content
- Add cut restoration by clicking greyed sections
- Show time saved calculations

### Phase 4C: Advanced Features (Week 3)
- Cut review side panel with categorized cuts
- Video player cut preview modes
- Cut navigation (prev/next cut buttons)
- Export options (EDL, timeline data)

### Phase 4D: Polish & Integration (Week 4)
- Smooth animations for cut operations
- Keyboard shortcuts for cut navigation
- Undo/redo system for cut operations
- Performance optimization for large numbers of cuts

## User Experience Flow

1. **User applies cuts** → Timeline updates with cut markers
2. **User hovers over markers** → Tooltip shows cut details
3. **User clicks "Review Cuts"** → Side panel opens with cut list
4. **User clicks greyed section** → Cut is restored
5. **User switches preview mode** → See original vs clean version
6. **User exports timeline** → Gets clean version with all cuts applied

## Technical Considerations

### Performance
- Lazy load cut visualizations for long timelines
- Optimize re-renders when cuts change
- Cache cut position calculations

### Accessibility
- Screen reader support for cut markers
- Keyboard navigation for cut review
- High contrast mode for cut indicators

### Responsive Design
- Collapse cut review panel on mobile
- Stack timeline tracks vertically on small screens
- Simplify cut markers for touch interfaces

This layout maintains your current timeline's clean aesthetic while adding powerful cut visualization and management capabilities!