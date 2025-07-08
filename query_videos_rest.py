#!/usr/bin/env python3
"""
Alternative approach using direct REST API calls to avoid HTTP/2 issues
"""

import os
import sys
import json
import requests
from datetime import datetime

class RestVideoChecker:
    def __init__(self):
        """Initialize with direct REST API calls."""
        self.url = os.getenv('SUPABASE_URL')
        self.key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not self.url or not self.key:
            print("❌ Required environment variables not set:")
            print("   SUPABASE_URL - Your Supabase project URL")
            print("   SUPABASE_SERVICE_ROLE_KEY - Your service role key")
            sys.exit(1)
        
        self.headers = {
            'apikey': self.key,
            'Authorization': f'Bearer {self.key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
        
        print("✅ Using direct REST API calls")
    
    def get_videos(self):
        """Get all videos using REST API."""
        try:
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
                print(f"❌ Failed to fetch videos: {response.status_code} - {response.text}")
                return []
                
        except Exception as e:
            print(f"❌ Error fetching videos: {e}")
            return []
    
    def get_video_analysis(self):
        """Get all video analysis using REST API."""
        try:
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
                print(f"❌ Failed to fetch analysis: {response.status_code} - {response.text}")
                return []
                
        except Exception as e:
            print(f"❌ Error fetching analysis: {e}")
            return []
    
    def analyze_videos(self):
        """Analyze video completion status."""
        videos = self.get_videos()
        analysis_records = self.get_video_analysis()
        
        if not videos:
            return
        
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
                    # Check if data exists
                    has_transcription = bool(analysis.get('transcription'))
                    has_llm = bool(analysis.get('llm_response'))
                    
                    if has_transcription and has_llm:
                        categories['complete'].append({**video, 'analysis': analysis})
                    else:
                        categories['incomplete_data'].append({**video, 'analysis': analysis})
                else:
                    categories['incomplete_data'].append({**video, 'analysis': analysis})
        
        return categories
    
    def print_results(self, categories, detailed=False):
        """Print the analysis results."""
        total_videos = sum(len(videos) for videos in categories.values())
        issues = len(categories['no_analysis']) + len(categories['pending']) + len(categories['failed']) + len(categories['incomplete_data'])
        
        print("\n" + "="*80)
        print("📊 VIDEO ANALYSIS STATUS REPORT (REST API)")
        print("="*80)
        print(f"📹 Total videos: {total_videos}")
        print(f"🚫 No analysis: {len(categories['no_analysis'])}")
        print(f"⏳ Pending/Processing: {len(categories['pending'])}")
        print(f"❌ Failed: {len(categories['failed'])}")
        print(f"⚠️  Incomplete data: {len(categories['incomplete_data'])}")
        print(f"✅ Complete: {len(categories['complete'])}")
        print(f"📊 Total needing attention: {issues}")
        
        if detailed and issues > 0:
            self._print_detailed(categories)
        elif issues > 0:
            print(f"\n💡 Run with --detailed flag to see detailed information")
        
        if issues == 0:
            print("\n🎉 All videos have complete analysis!")
    
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
                print(f"   Created: {video['created_at']}")
                
                if analysis:
                    print(f"   Analysis Status: {analysis.get('status')}")
                    print(f"   Has Transcription: {bool(analysis.get('transcription'))}")
                    print(f"   Has LLM Response: {bool(analysis.get('llm_response'))}")
                print()

def main():
    """Main function."""
    detailed = '--detailed' in sys.argv or '-d' in sys.argv
    
    checker = RestVideoChecker()
    
    print("🔍 Analyzing videos using REST API...")
    categories = checker.analyze_videos()
    
    if categories:
        checker.print_results(categories, detailed)

if __name__ == "__main__":
    main()