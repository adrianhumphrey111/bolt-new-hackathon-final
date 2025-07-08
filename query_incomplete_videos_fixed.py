#!/usr/bin/env python3
"""
Fixed version with HTTP/1.1 and better error handling
"""

import os
import sys
import json
from datetime import datetime
import httpx

# Try to import supabase, fall back to instructions if not available
try:
    from supabase import create_client, Client
except ImportError:
    print("❌ Supabase client not installed.")
    print("Install with: pip install supabase")
    sys.exit(1)

class FixedVideoChecker:
    def __init__(self):
        """Initialize with Supabase client using HTTP/1.1."""
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not url or not key:
            print("❌ Required environment variables not set:")
            print("   SUPABASE_URL - Your Supabase project URL")
            print("   SUPABASE_SERVICE_ROLE_KEY - Your service role key")
            sys.exit(1)
        
        # Create custom httpx client with HTTP/1.1 only
        custom_client = httpx.Client(
            http2=False,  # Force HTTP/1.1
            timeout=30.0,  # 30 second timeout
            limits=httpx.Limits(max_connections=10, max_keepalive_connections=5)
        )
        
        # Initialize Supabase with custom client
        self.supabase: Client = create_client(
            url, 
            key,
            options={
                'custom_client': custom_client
            }
        )
        print("✅ Connected to Supabase (using HTTP/1.1)")
    
    def get_all_videos_with_analysis_status(self):
        """Get all videos and their analysis status in one optimized query."""
        try:
            print("🔍 Fetching all videos...")
            
            # First get all videos
            videos_response = self.supabase.table('videos').select(
                'id, project_id, file_name, original_name, file_path, status, created_at'
            ).execute()
            
            videos = videos_response.data
            print(f"📹 Found {len(videos)} total videos")
            
            if not videos:
                return [], []
            
            # Get video IDs
            video_ids = [v['id'] for v in videos]
            
            print("🔍 Fetching analysis data...")
            
            # Get analysis data for all videos
            analysis_response = self.supabase.table('video_analysis').select(
                'video_id, status, transcription, llm_response, video_analysis'
            ).in_('video_id', video_ids).execute()
            
            analysis_data = analysis_response.data
            print(f"📊 Found {len(analysis_data)} analysis records")
            
            # Create lookup dict for analysis data
            analysis_by_video_id = {}
            for analysis in analysis_data:
                analysis_by_video_id[analysis['video_id']] = analysis
            
            # Categorize videos
            no_analysis = []
            with_analysis = []
            
            for video in videos:
                video_id = video['id']
                if video_id in analysis_by_video_id:
                    video['analysis'] = analysis_by_video_id[video_id]
                    with_analysis.append(video)
                else:
                    no_analysis.append(video)
            
            return no_analysis, with_analysis
            
        except Exception as e:
            print(f"❌ Error fetching data: {e}")
            print(f"❌ Error type: {type(e).__name__}")
            return [], []
    
    def categorize_analysis_issues(self, videos_with_analysis):
        """Categorize videos with analysis by their completeness."""
        pending = []
        failed = []
        incomplete_data = []
        complete = []
        
        for video in videos_with_analysis:
            analysis = video.get('analysis', {})
            status = analysis.get('status', 'unknown')
            
            if status in ['pending', 'processing']:
                pending.append(video)
            elif status == 'failed':
                failed.append(video)
            elif status == 'completed':
                # Check if data is actually present and not empty
                has_transcription = (
                    analysis.get('transcription') and 
                    analysis.get('transcription') != {} and
                    analysis.get('transcription') != 'null'
                )
                has_llm_response = (
                    analysis.get('llm_response') and 
                    analysis.get('llm_response') != {} and
                    analysis.get('llm_response') != 'null'
                )
                
                if not has_transcription or not has_llm_response:
                    incomplete_data.append(video)
                else:
                    complete.append(video)
            else:
                # Unknown status
                incomplete_data.append(video)
        
        return {
            'pending': pending,
            'failed': failed,
            'incomplete_data': incomplete_data,
            'complete': complete
        }
    
    def print_results(self, no_analysis, categories, detailed=False):
        """Print the results in a formatted way."""
        total_videos = len(no_analysis) + sum(len(videos) for videos in categories.values())
        total_issues = len(no_analysis) + len(categories['pending']) + len(categories['failed']) + len(categories['incomplete_data'])
        
        print("\n" + "="*80)
        print("📊 VIDEO ANALYSIS STATUS REPORT")
        print("="*80)
        print(f"📹 Total videos: {total_videos}")
        print(f"🚫 No analysis: {len(no_analysis)}")
        print(f"⏳ Pending/Processing: {len(categories['pending'])}")
        print(f"❌ Failed: {len(categories['failed'])}")
        print(f"⚠️  Incomplete data: {len(categories['incomplete_data'])}")
        print(f"✅ Complete: {len(categories['complete'])}")
        print(f"📊 Total needing attention: {total_issues}")
        
        if detailed and total_issues > 0:
            self._print_detailed_sections(no_analysis, categories)
        elif total_issues > 0:
            print(f"\n💡 Run with --detailed flag to see detailed information")
        
        if total_issues == 0:
            print("\n🎉 All videos have complete analysis!")
    
    def _print_detailed_sections(self, no_analysis, categories):
        """Print detailed information for each category."""
        sections = [
            ("🚫 VIDEOS WITHOUT ANALYSIS", no_analysis),
            ("⏳ VIDEOS WITH PENDING/PROCESSING ANALYSIS", categories['pending']),
            ("❌ VIDEOS WITH FAILED ANALYSIS", categories['failed']),
            ("⚠️  VIDEOS WITH INCOMPLETE DATA", categories['incomplete_data'])
        ]
        
        for title, videos in sections:
            if not videos:
                continue
                
            print(f"\n{title}")
            print("-" * len(title))
            
            for video in videos:
                analysis = video.get('analysis', {})
                print(f"📹 {video['original_name']}")
                print(f"   ID: {video['id']}")
                print(f"   Project: {video['project_id']}")
                print(f"   File: {video['file_path']}")
                print(f"   Video Status: {video['status']}")
                print(f"   Created: {video['created_at']}")
                
                if analysis:
                    print(f"   Analysis Status: {analysis.get('status', 'unknown')}")
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
        print("Fixed Video Analysis Checker")
        print("=" * 50)
        print("Usage: python query_incomplete_videos_fixed.py [options]")
        print()
        print("Options:")
        print("  -h, --help      Show this help message")
        print("  -d, --detailed  Show detailed report")
        print()
        print("Environment Variables:")
        print("  SUPABASE_URL              Your Supabase project URL")
        print("  SUPABASE_SERVICE_ROLE_KEY Your service role key")
        return
    
    try:
        checker = FixedVideoChecker()
        
        print("🔍 Analyzing video status...")
        no_analysis, with_analysis = checker.get_all_videos_with_analysis_status()
        
        if not no_analysis and not with_analysis:
            print("❌ No videos found or query failed")
            return
        
        categories = checker.categorize_analysis_issues(with_analysis)
        checker.print_results(no_analysis, categories, detailed)
        
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        print(f"❌ Error type: {type(e).__name__}")

if __name__ == "__main__":
    main()