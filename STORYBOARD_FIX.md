# Storyboard Content Fix

## Issue
When users upload videos without storyboard content, the Lambda function fails because it's querying with a join that expects `storyboard_content` to exist:

```sql
-- Lambda's problematic query (approximation)
SELECT 
  id,
  file_path,
  project_id,
  projects(user_id, storyboard_content(text_content))
FROM videos
WHERE id = $1
```

This returns 0 records when there's no storyboard content, causing the Lambda to error.

## Solution Applied

### 1. Reanalyze Endpoint Fix ✅
Modified `/api/videos/[videoId]/reanalyze/route.ts` to:
- Check if storyboard content exists separately
- Pass storyboard data and a flag to Lambda
- Lambda payload now includes:
  ```json
  {
    "video_id": "...",
    "project_id": "...",
    "additional_context": "...",
    "storyboard_content": "text content or empty string",
    "has_storyboard": true/false
  }
  ```

### 2. Initial Upload Trigger Fix ✅
Created new endpoint `/api/videos/[videoId]/start-analysis/route.ts` that:
- Properly checks for storyboard content before Lambda call
- Handles the case where no storyboard exists
- Updates video_analysis status appropriately
- Uses same payload format as reanalyze endpoint

### 3. Upload Flow Integration ✅
Modified `MediaLibrary.tsx` `saveVideoToProject` function to:
- Call the new start-analysis endpoint after S3 upload
- Replaces the problematic S3 event trigger
- Ensures proper storyboard handling from the start

## Lambda Fix Required
The Lambda function needs to be updated to:
1. Use LEFT JOIN for storyboard_content instead of requiring it
2. OR check the `has_storyboard` flag and skip the storyboard query
3. OR handle empty results gracefully

Example fix for Lambda:
```python
# Instead of expecting storyboard in the main query
if payload.get('has_storyboard', False):
    # Query storyboard separately
    storyboard = fetch_storyboard(project_id)
else:
    storyboard = None

# Or use LEFT JOIN in SQL
query = """
  SELECT 
    v.id,
    v.file_path,
    v.project_id,
    p.user_id,
    sc.text_content as storyboard_content
  FROM videos v
  INNER JOIN projects p ON v.project_id = p.id
  LEFT JOIN storyboard_content sc ON p.id = sc.project_id
  WHERE v.id = %s
"""
```

## Temporary Workaround
Until the Lambda is fixed, users can:
1. Add placeholder storyboard content to their projects before uploading videos
2. Use the reanalyze endpoint which now handles missing storyboards correctly

## Action Items
1. ✅ Fixed reanalyze endpoint to handle missing storyboards
2. ✅ Created start-analysis endpoint for initial uploads
3. ✅ Integrated start-analysis call in upload flow
4. ⚠️  Update Lambda function to handle missing storyboards gracefully
5. ⚠️  Consider disabling S3 event trigger if it still exists to avoid duplicate processing
6. ⚠️  Consider making storyboard optional in the UI to set user expectations

## Files Modified
- `/api/videos/[videoId]/reanalyze/route.ts` - Enhanced storyboard handling
- `/api/videos/[videoId]/start-analysis/route.ts` - New endpoint for initial analysis
- `MediaLibrary.tsx` - Integrated start-analysis call after S3 upload