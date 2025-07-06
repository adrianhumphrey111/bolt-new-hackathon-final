import google.generativeai as genai
import time

# Configure API key
genai.configure(api_key="YOUR_API_KEY_HERE")

# Upload video file
print("Uploading video...")
video_file = genai.upload_file(path="./test.MOV")

# Wait for processing
print(f"Uploaded file: {video_file.uri}")
print("Waiting for processing...")

while video_file.state.name == "PROCESSING":
    time.sleep(10)
    video_file = genai.get_file(video_file.name)

if video_file.state.name == "FAILED":
    raise ValueError(f"Video processing failed: {video_file.state.name}")

# Create the model
model = genai.GenerativeModel(model_name="gemini-2.0-flash-exp")

# Make the request
print("Analyzing video...")
response = model.generate_content([
    video_file,
    "Analyze this video and provide: 1) Scene descriptions with timestamps, 2) Key visual elements and transitions, 3) Suggested cuts for editing, 4) Overall content summary. Focus on identifying the most engaging moments."
])

print("\nAnalysis Result:")
print(response.text)