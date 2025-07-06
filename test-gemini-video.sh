#!/bin/bash

# Replace with your actual API key
API_KEY="YOUR_API_KEY"
VIDEO_PATH="/path/to/your/video.mp4"

echo "Step 1: Uploading video to Gemini File API..."

# Upload the video file
UPLOAD_RESPONSE=$(curl -X POST \
  "https://generativelanguage.googleapis.com/upload/v1beta/files?key=$API_KEY" \
  -H "X-Goog-Upload-Protocol: resumable" \
  -H "X-Goog-Upload-Command: start" \
  -H "X-Goog-Upload-Header-Content-Length: $(stat -f%z "$VIDEO_PATH")" \
  -H "X-Goog-Upload-Header-Content-Type: video/mp4" \
  -H "Content-Type: application/json" \
  -d '{"file": {"display_name": "test_video.mp4"}}' \
  -D -)

# Extract upload URL from response headers
UPLOAD_URL=$(echo "$UPLOAD_RESPONSE" | grep -i "x-goog-upload-url:" | cut -d' ' -f2 | tr -d '\r')

echo "Step 2: Uploading video content..."

# Upload the actual video content
UPLOAD_RESULT=$(curl -X POST \
  "$UPLOAD_URL" \
  -H "X-Goog-Upload-Command: upload, finalize" \
  -H "X-Goog-Upload-Offset: 0" \
  -H "Content-Type: video/mp4" \
  --data-binary @"$VIDEO_PATH")

# Extract file URI from response
FILE_URI=$(echo "$UPLOAD_RESULT" | jq -r '.file.uri')

echo "File uploaded! URI: $FILE_URI"
echo "Step 3: Analyzing video..."

# Analyze the video
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=$API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"contents\": [
      {
        \"parts\": [
          {
            \"text\": \"Analyze this video and provide: 1) Scene descriptions with timestamps, 2) Key visual elements and transitions, 3) Suggested cuts for editing, 4) Overall content summary. Focus on identifying the most engaging moments.\"
          },
          {
            \"fileData\": {
              \"mimeType\": \"video/mp4\",
              \"fileUri\": \"$FILE_URI\"
            }
          }
        ]
      }
    ],
    \"generationConfig\": {
      \"temperature\": 0.7,
      \"maxOutputTokens\": 8192
    }
  }" | jq '.'