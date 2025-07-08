#!/usr/bin/env python3
"""
Alternative approach using direct REST API calls with proper header cleaning
"""

import os
import sys
import json
import requests
import time
from datetime import datetime

class RestVideoChecker:
    def __init__(self):
        """Initialize with direct REST API calls."""
        self.url = os.getenv('SUPABASE_URL', '').strip()
        self.key = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '').strip().replace('\n', '').replace('\r', '')
        
        if not self.url or not self.key:
            print("❌ Required environment variables not set:")
            print("   SUPABASE_URL - Your Supabase project URL")
            print("   SUPABASE_SERVICE_ROLE_KEY - Your service role key")
            sys.exit(1)
        
        # Clean and validate the key
        if not self.key.startswith('eyJ'):
            print("❌ Service key doesn't look like a valid JWT token")
            print(f"Key starts with: {self.key[:20]}...")
            sys.exit(1)
        
        self.headers = {
            'apikey': self.key,
            'Authorization': f'Bearer {self.key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
        
        print(f"✅ Using direct REST API calls")
        print(f"🔗 URL: {self.url}")
        print(f"🔑 Key: {self.key[:20]}...{self.key[-10:]}")
    
    def test_connection(self):
        """Test the connection first."""
        try:
            response = requests.get(
                f"{self.url}/rest/v1/videos",
                headers=self.headers,
                params={'select': 'id', 'limit': 1},
                timeout=10
            )
            
            print(f"🔍 Connection test: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ Connection successful")
                return True
            elif response.status_code == 401:
                print("❌ Authentication failed - check your service key")
                return False
            elif response.status_code == 404:
                print("❌ Table not found - check your database schema")
                return False
            else:
                print(f"❌ Unexpected response: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Connection test failed: {e}")
            return False
    
    def get_videos(self):
        """Get all videos using REST API."""
        try:
            print("📹 Fetching videos...")
            response = requests.get(
                f"{self.url}/rest/v1/videos",
                headers=self.headers,
                params={
                    'select': 'id,project_id,file_name,original_name,file_path,status,created_at'
                },
                timeout=30
            )
            
            if response.status_code == 200:
                videos = response.json()
                print(f"📹 Found {len(videos)} videos")
                return videos
            else:
                print(f"❌ Failed to fetch videos: {response.status_code}")
                print(f"Response: {response.text[:500]}...")
                return []
                
        except Exception as e:
            print(f"❌ Error fetching videos: {e}")
            return []
    
    def get_video_analysis(self):
        """Get all video analysis using REST API."""
        try:
            print("📊 Fetching analysis records...")
            response = requests.get(
                f"{self.url}/rest/v1/video_analysis",
                headers=self.headers,
                params={
                    'select': 'video_id,status,transcription,llm_response,video_analysis'
                },
                timeout=30
            )
            
            if response.status_code == 200:
                analysis = response.json()
                print(f"📊 Found {len(analysis)} analysis records")
                return analysis
            else:
                print(f"❌ Failed to fetch analysis: {response.status_code}")
                print(f"Response: {response.text[:500]}...")
                return []
                
        except Exception as e:
            print(f"❌ Error fetching analysis: {e}")
            return []
    
    def analyze_videos(self):
        """Analyze video completion status."""
        # Test connection first
        if not self.test_connection():
            return None
        
        videos = self.get_videos()
        analysis_records = self.get_video_analysis()
        
        if not videos:
            print("❌ No videos found")
            return None
        
        # Create lookup for analysis records
        analysis_by_video = {record['video_id']: record for record in analysis_records}
        
        # Categorize videos
        categories = {
            'no_analysis': [],
            'pending': [],
            'failed': [],
            'incomplete_data': [],
            'complete': []
        }
        
        for video in videos:
            video_id = video['id']
            analysis = analysis_by_video.get(video_id)
            
            if not analysis:
                categories['no_analysis'].append(video)
            else:
                status = analysis.get('status', 'unknown')
                
                if status in ['pending', 'processing']:
                    categories['pending'].append({**video, 'analysis': analysis})
                elif status == 'failed':
                    categories['failed'].append({**video, 'analysis': analysis})
                elif status == 'completed':
                    # Check if data exists and is not empty
                    # For incomplete data: only care about missing llm_response or video_analysis
                    # (missing transcription is fine)
                    llm_response = analysis.get('llm_response')
                    video_analysis = analysis.get('video_analysis')
                    
                    has_llm = llm_response and llm_response != {} and llm_response != 'null'
                    has_video_analysis = video_analysis and video_analysis != {} and video_analysis != 'null'
                    
                    if has_llm and has_video_analysis:
                        categories['complete'].append({**video, 'analysis': analysis})
                    else:
                        categories['incomplete_data'].append({**video, 'analysis': analysis})
                else:
                    categories['incomplete_data'].append({**video, 'analysis': analysis})
        
        return categories
    
    def get_video_file_path(self, video_id):
        """Get the file path for a video from the database."""
        try:
            response = requests.get(
                f"{self.url}/rest/v1/videos",
                headers=self.headers,
                params={
                    'select': 'file_path,processed_file_path',
                    'id': f'eq.{video_id}',
                    'limit': 1
                },
                timeout=10
            )
            
            if response.status_code == 200:
                videos = response.json()
                if videos:
                    video = videos[0]
                    # Use processed file path if available, otherwise use original
                    file_path = video.get('processed_file_path') or video.get('file_path')
                    return file_path
            
            return None
            
        except Exception as e:
            print(f"❌ Error getting file path for video {video_id}: {e}")
            return None

    def trigger_reanalysis(self, video_id, project_id):
        """Trigger reanalysis for a specific video by creating a fake S3 trigger event."""
        api_url = "https://3jmprxblzk.execute-api.us-east-1.amazonaws.com/default/TranscribeAudio"
        
        # Get the file path for this video
        file_path = self.get_video_file_path(video_id)
        if not file_path:
            return False, f"Could not find file path for video {video_id}"
        
        # Create a fake S3 trigger event that mimics an actual S3 upload
        s3_trigger_payload = {
            "Records": [
                {
                    "eventVersion": "2.0",
                    "eventSource": "aws:s3",
                    "awsRegion": "us-east-1",
                    "eventTime": "1970-01-01T00:00:00.000Z",
                    "eventName": "ObjectCreated:Put",
                    "userIdentity": {
                        "principalId": "REANALYSIS_TRIGGER"
                    },
                    "requestParameters": {
                        "sourceIPAddress": "127.0.0.1"
                    },
                    "responseElements": {
                        "x-amz-request-id": f"REANALYSIS-{video_id}",
                        "x-amz-id-2": "REANALYSIS/TRIGGER/REQUEST"
                    },
                    "s3": {
                        "s3SchemaVersion": "1.0",
                        "configurationId": "reanalysisConfigRule",
                        "bucket": {
                            "name": "raw-clips-global",
                            "ownerIdentity": {
                                "principalId": "REANALYSIS_TRIGGER"
                            },
                            "arn": "arn:aws:s3:::raw-clips-global"
                        },
                        "object": {
                            "key": file_path,
                            "size": 1024,
                            "eTag": f"reanalysis{video_id}",
                            "sequencer": f"REANALYSIS{video_id}"
                        }
                    }
                }
            ]
        }
        
        try:
            print(f"🔄 Sending S3 trigger event for file: {file_path}")
            response = requests.post(
                api_url,
                json=s3_trigger_payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                return True, f"S3 trigger: {result.get('message', 'processed successfully')}"
            else:
                print(f"⚠️ S3 trigger failed ({response.status_code}), trying API Gateway format...")
                # Fallback to API Gateway format
                return self.trigger_reanalysis_api_gateway(video_id, project_id)
                
        except Exception as e:
            print(f"⚠️ S3 trigger error ({e}), trying API Gateway format...")
            # Fallback to API Gateway format
            return self.trigger_reanalysis_api_gateway(video_id, project_id)
    
    def trigger_reanalysis_api_gateway(self, video_id, project_id):
        """Fallback: Trigger reanalysis using API Gateway format."""
        api_url = "https://3jmprxblzk.execute-api.us-east-1.amazonaws.com/default/TranscribeAudio"
        
        api_gateway_payload = {
            "video_id": video_id,
            "project_id": project_id,
            "additional_context": "",
            "storyboard_content": "",
            "has_storyboard": False,
            "trigger_source": "queue_processor"  # This triggers synchronous processing
        }
        
        try:
            response = requests.post(
                api_url,
                json=api_gateway_payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                return True, f"API Gateway: {result.get('message', 'processed successfully')}"
            else:
                return False, f"API Gateway failed: HTTP {response.status_code}: {response.text}"
                
        except Exception as e:
            return False, f"API Gateway error: {e}"
    
    def reanalyze_videos(self, categories, delay_minutes=2):
        """Trigger reanalysis for all videos that need attention with delays."""
        videos_to_reanalyze = []
        
        # Collect all videos that need reanalysis
        videos_to_reanalyze.extend(categories['no_analysis'])
        videos_to_reanalyze.extend(categories['pending'])
        videos_to_reanalyze.extend(categories['incomplete_data'])
        
        if not videos_to_reanalyze:
            print("\n✅ No videos need reanalysis!")
            return
        
        total_videos = len(videos_to_reanalyze)
        delay_seconds = delay_minutes * 60
        
        print(f"\n🚀 STARTING REANALYSIS FOR {total_videos} VIDEOS")
        print(f"⏰ Delay between requests: {delay_minutes} minutes ({delay_seconds} seconds)")
        print(f"🕐 Estimated total time: {total_videos * delay_minutes:.1f} minutes")
        print("=" * 60)
        
        successful = 0
        failed = 0
        
        for i, video in enumerate(videos_to_reanalyze, 1):
            video_id = video['id']
            project_id = video['project_id']
            video_name = video['original_name']
            
            print(f"\n[{i}/{total_videos}] Processing: {video_name}")
            print(f"🎯 Video ID: {video_id}")
            print(f"📁 Project ID: {project_id}")
            
            # Get file path first
            file_path = self.get_video_file_path(video_id)
            if file_path:
                print(f"📄 File Path: {file_path}")
            else:
                print(f"❌ Could not find file path for video {video_id}")
                failed += 1
                continue
            
            # Trigger reanalysis
            success, message = self.trigger_reanalysis(video_id, project_id)
            
            if success:
                print(f"✅ SUCCESS: {message}")
                successful += 1
            else:
                print(f"❌ FAILED: {message}")
                failed += 1
            
            # Wait before next request (except for the last one)
            if i < total_videos:
                print(f"⏳ Waiting {delay_minutes} minutes before next request...")
                
                # Show countdown
                for remaining in range(delay_seconds, 0, -30):
                    mins, secs = divmod(remaining, 60)
                    print(f"   ⏰ {mins:02d}:{secs:02d} remaining", end='\r')
                    time.sleep(30)
                
                print("   ⏰ 00:00 - Proceeding to next video...")
        
        # Final summary
        print(f"\n" + "=" * 60)
        print(f"🎉 REANALYSIS BATCH COMPLETED!")
        print(f"✅ Successful: {successful}")
        print(f"❌ Failed: {failed}")
        print(f"📊 Total processed: {total_videos}")
        print(f"🕐 Total time elapsed: {(total_videos - 1) * delay_minutes:.1f} minutes")
    
    def print_results(self, categories, detailed=False, trigger_reanalysis=False):
        """Print the analysis results."""
        if not categories:
            return
            
        total_videos = sum(len(videos) for videos in categories.values())
        issues = len(categories['no_analysis']) + len(categories['pending']) + len(categories['failed']) + len(categories['incomplete_data'])
        
        print("\n" + "="*80)
        print("📊 VIDEO ANALYSIS STATUS REPORT")
        print("="*80)
        print(f"📹 Total videos: {total_videos}")
        print(f"🚫 No analysis: {len(categories['no_analysis'])}")
        print(f"⏳ Pending/Processing: {len(categories['pending'])}")
        print(f"❌ Failed: {len(categories['failed'])}")
        print(f"⚠️  Incomplete data: {len(categories['incomplete_data'])}")
        print(f"✅ Complete: {len(categories['complete'])}")
        print(f"📊 Total needing attention: {issues}")
        
        # Print reanalyzing statements for videos that need attention
        if issues > 0:
            print(f"\n🔄 VIDEOS TO REANALYZE:")
            print("-" * 40)
            
            # Videos with no analysis
            for video in categories['no_analysis']:
                print(f'reanalyzing video_id: "{video["id"]}"')
            
            # Videos with pending/processing analysis
            for video in categories['pending']:
                print(f'reanalyzing video_id: "{video["id"]}"')
            
            # Videos with incomplete data (only missing llm_response or video_analysis)
            for video in categories['incomplete_data']:
                print(f'reanalyzing video_id: "{video["id"]}"')
        
        if detailed and issues > 0:
            self._print_detailed(categories)
        elif issues > 0:
            print(f"\n💡 Run with --detailed flag to see detailed information")
        
        if issues == 0:
            print("\n🎉 All videos have complete analysis!")
        
        # Offer to trigger reanalysis
        if trigger_reanalysis and issues > 0:
            print(f"\n" + "="*60)
            self.reanalyze_videos(categories)
    
    def _print_detailed(self, categories):
        """Print detailed breakdown."""
        issue_categories = ['no_analysis', 'pending', 'failed', 'incomplete_data']
        
        for category in issue_categories:
            videos = categories[category]
            if not videos:
                continue
            
            titles = {
                'no_analysis': '🚫 VIDEOS WITHOUT ANALYSIS',
                'pending': '⏳ VIDEOS WITH PENDING ANALYSIS',
                'failed': '❌ VIDEOS WITH FAILED ANALYSIS',
                'incomplete_data': '⚠️  VIDEOS WITH INCOMPLETE DATA'
            }
            
            title = titles[category]
            print(f"\n{title}")
            print("-" * len(title))
            
            for video in videos:
                analysis = video.get('analysis', {})
                print(f"📹 {video['original_name']}")
                print(f"   ID: {video['id']}")
                print(f"   Project: {video['project_id']}")
                print(f"   File Path: {video['file_path']}")
                print(f"   Video Status: {video['status']}")
                print(f"   Created: {video['created_at']}")
                
                if analysis:
                    print(f"   Analysis Status: {analysis.get('status')}")
                    print(f"   Has Transcription: {bool(analysis.get('transcription'))}")
                    print(f"   Has LLM Response: {bool(analysis.get('llm_response'))}")
                    print(f"   Has Video Analysis: {bool(analysis.get('video_analysis'))}")
                else:
                    print(f"   Analysis: None")
                print()

def main():
    """Main function."""
    detailed = '--detailed' in sys.argv or '-d' in sys.argv
    show_help = '--help' in sys.argv or '-h' in sys.argv
    
    if show_help:
        print("Video Analysis Checker (REST API)")
        print("=" * 50)
        print("Usage: python query_videos_rest_fixed.py [options]")
        print()
        print("Options:")
        print("  -h, --help      Show this help message")
        print("  -d, --detailed  Show detailed report")
        print("  -r, --reanalyze Trigger reanalysis for videos that need attention")
        print()
        print("Environment Variables:")
        print("  SUPABASE_URL              Your Supabase project URL")
        print("  SUPABASE_SERVICE_ROLE_KEY Your service role key")
        return
    
    checker = RestVideoChecker()
    
    print("🔍 Analyzing videos using REST API...")
    categories = checker.analyze_videos()
    
    if categories:
        # Check for --reanalyze flag
        trigger_reanalysis = '--reanalyze' in sys.argv or '-r' in sys.argv
        checker.print_results(categories, detailed, trigger_reanalysis)

if __name__ == "__main__":
    main()