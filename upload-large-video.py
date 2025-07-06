import requests
import os
import json
import time

API_KEY = "AIzaSyAOwHdC67BiwbTv9M-lrHVSxfNVS1mJTGQ"
VIDEO_PATH = "./test.MOV"

def upload_large_video(file_path):
    file_size = os.path.getsize(file_path)
    print(f"Uploading video: {file_path} ({file_size / (1024**3):.2f} GB)")
    
    # Step 1: Initialize resumable upload
    headers = {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": str(file_size),
        "X-Goog-Upload-Header-Content-Type": "video/quicktime",
        "Content-Type": "application/json"
    }
    
    data = {
        "file": {
            "display_name": os.path.basename(file_path)
        }
    }
    
    response = requests.post(
        f"https://generativelanguage.googleapis.com/upload/v1beta/files?key={API_KEY}",
        headers=headers,
        json=data
    )
    
    upload_url = response.headers.get("X-Goog-Upload-URL")
    print(f"Got upload URL: {upload_url}")
    
    # Step 2: Upload the file in chunks
    chunk_size = 64 * 1024 * 1024  # 32MB chunks
    
    with open(file_path, 'rb') as f:
        uploaded = 0
        while uploaded < file_size:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            
            end = min(uploaded + len(chunk), file_size)
            
            headers = {
                "Content-Length": str(len(chunk)),
                "X-Goog-Upload-Command": "upload" if end < file_size else "upload, finalize",
                "X-Goog-Upload-Offset": str(uploaded)
            }
            
            response = requests.post(upload_url, headers=headers, data=chunk)
            uploaded = end
            
            print(f"Uploaded {uploaded / (1024**2):.1f} MB / {file_size / (1024**2):.1f} MB ({uploaded * 100 / file_size:.1f}%)")
    
    # Get the file info
    file_info = response.json()
    return file_info

def wait_for_file_processing(file_name):
    """Wait for the file to be processed"""
    while True:
        response = requests.get(
            f"https://generativelanguage.googleapis.com/v1beta/{file_name}?key={API_KEY}"
        )
        file_info = response.json()
        
        state = file_info.get('state', 'PROCESSING')
        print(f"File state: {state}")
        
        if state == 'ACTIVE':
            return file_info
        elif state == 'FAILED':
            raise Exception(f"File processing failed: {file_info}")
        
        time.sleep(5)

def analyze_video(file_uri):
    """Analyze the video using Gemini"""
    headers = {
        "Content-Type": "application/json"
    }
    
    data = {
        "contents": [
            {
                "parts": [
                    {
                        "text": "Analyze this video and provide: 1) Scene descriptions with timestamps, 2) Key visual elements and transitions, 3) Suggested cuts for editing, 4) Overall content summary. Focus on identifying the most engaging moments."
                    },
                    {
                        "fileData": {
                            "mimeType": "video/quicktime",
                            "fileUri": file_uri
                        }
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 8192
        }
    }
    
    response = requests.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={API_KEY}",
        headers=headers,
        json=data
    )
    
    return response.json()

# Main execution
print("Starting upload...")
file_info = upload_large_video(VIDEO_PATH)
print(f"\nUpload complete! Response: {json.dumps(file_info, indent=2)}")

# Extract the file name from the response
if 'file' in file_info:
    file_name = file_info['file']['name']
    print(f"File name: {file_name}")
else:
    print("Unexpected response format. Full response:")
    print(json.dumps(file_info, indent=2))
    exit(1)

print("\nWaiting for processing...")
file_info = wait_for_file_processing(file_name)
print(f"File ready! URI: {file_info['uri']}")

print("\nAnalyzing video...")
result = analyze_video(file_info['uri'])

# Print the analysis
if 'candidates' in result:
    print("\n" + "="*50)
    print("ANALYSIS RESULT:")
    print("="*50)
    print(result['candidates'][0]['content']['parts'][0]['text'])
else:
    print("Error in analysis:", result)