#!/usr/bin/env python3
"""
Simple script to query videos that don't have video_analysis rows or have incomplete analysis.
This version uses the Supabase client instead of direct PostgreSQL connection.

Usage:
    python query_incomplete_videos_simple.py
    python query_incomplete_videos_simple.py --detailed
"""

import os
import sys
import json
from datetime import datetime

# Try to import supabase, fall back to instructions if not available
try:
    from supabase import create_client, Client
except ImportError:
    print("❌ Supabase client not installed.")
    print("Install with: pip install supabase")
    print("Or use the PostgreSQL version: query_incomplete_videos.py")
    sys.exit(1)

class SimpleVideoChecker:
    def __init__(self):
        """Initialize with Supabase client."""
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not url or not key:
            print("❌ Required environment variables not set:")
            print("   SUPABASE_URL - Your Supabase project URL")
            print("   SUPABASE_SERVICE_ROLE_KEY - Your service role key")
            sys.exit(1)
        
        self.supabase: Client = create_client(url, key)
        print("✅ Connected to Supabase")
    
    def get_videos_without_analysis(self):
        """Get videos that have no video_analysis row."""
        try:
            # Get all videos
            videos_response = self.supabase.table('videos').select('*').execute()
            videos = videos_response.data
            print(len(videos))
            
            # Get all video_analysis records
            analysis_response = self.supabase.table('video_analysis').select('video_id').execute()
            analyzed_video_ids = {record['video_id'] for record in analysis_response.data}
            
            # Find videos without analysis
            unanalyzed_videos = [v for v in videos if v['id'] not in analyzed_video_ids]
            
            return unanalyzed_videos
            
        except Exception as e:
            print(f"❌ Error fetching videos without analysis: {e}")
            return []
    
    def get_videos_with_incomplete_analysis(self):
        """Get videos with incomplete or failed analysis."""
        try:
            # Query video_analysis for incomplete records
            response = self.supabase.table('video_analysis').select(
                'id, video_id, status, transcription, llm_response, video_analysis'
            ).neq('status', 'completed').execute()
            
            incomplete_analysis = response.data
            
            # Also check completed records that might be missing data
            completed_response = self.supabase.table('video_analysis').select(
                'id, video_id, status, transcription, llm_response, video_analysis'
            ).eq('status', 'completed').execute()
            
            completed_analysis = completed_response.data
            
            # Filter completed records that are actually incomplete
            incomplete_completed = []
            for record in completed_analysis:
                missing_data = (
                    not record.get('transcription') or 
                    not record.get('llm_response') or
                    record.get('transcription') == {} or
                    record.get('llm_response') == {}
                )
                if missing_data:
                    incomplete_completed.append(record)
            
            # Get video details for incomplete analysis
            all_incomplete = incomplete_analysis + incomplete_completed
            video_ids = [record['video_id'] for record in all_incomplete]
            
            if not video_ids:
                return []
            
            # Get video details
            videos_response = self.supabase.table('videos').select('*').in_('id', video_ids).execute()
            videos_by_id = {v['id']: v for v in videos_response.data}
            
            # Combine video and analysis data
            result = []
            for analysis in all_incomplete:
                video_id = analysis['video_id']
                if video_id in videos_by_id:
                    video = videos_by_id[video_id]
                    video['analysis'] = analysis
                    result.append(video)
            
            return result
            
        except Exception as e:
            print(f"❌ Error fetching incomplete analysis: {e}")
            return []
    
    def print_results(self, no_analysis, incomplete_analysis, detailed=False):
        """Print the results in a formatted way."""
        total_issues = len(no_analysis) + len(incomplete_analysis)
        
        print("\n" + "="*80)
        print("📊 VIDEO ANALYSIS STATUS REPORT")
        print("="*80)
        
        print(f"🚫 Videos without analysis: {len(no_analysis)}")
        print(f"⚠️  Videos with incomplete analysis: {len(incomplete_analysis)}")
        print(f"📊 Total videos needing attention: {total_issues}")
        
        if detailed and total_issues > 0:
            print("\n" + "="*80)
            print("🚫 VIDEOS WITHOUT ANALYSIS")
            print("="*80)
            
            for video in no_analysis:
                print(f"📹 {video['original_name']}")
                print(f"   ID: {video['id']}")
                print(f"   Project: {video['project_id']}")
                print(f"   File: {video['file_path']}")
                print(f"   Status: {video['status']}")
                print(f"   Created: {video['created_at']}")
                print()
            
            print("\n" + "="*80)
            print("⚠️  VIDEOS WITH INCOMPLETE ANALYSIS")
            print("="*80)
            
            for video in incomplete_analysis:
                analysis = video.get('analysis', {})
                print(f"📹 {video['original_name']}")
                print(f"   ID: {video['id']}")
                print(f"   Project: {video['project_id']}")
                print(f"   File: {video['file_path']}")
                print(f"   Video Status: {video['status']}")
                print(f"   Analysis Status: {analysis.get('status', 'unknown')}")
                print(f"   Has Transcription: {bool(analysis.get('transcription'))}")
                print(f"   Has LLM Response: {bool(analysis.get('llm_response'))}")
                print(f"   Has Video Analysis: {bool(analysis.get('video_analysis'))}")
                print()
        
        elif total_issues > 0:
            print(f"\n💡 Run with --detailed flag to see detailed information")
        
        if total_issues == 0:
            print("\n✅ All videos have complete analysis!")

def main():
    """Main function."""
    detailed = '--detailed' in sys.argv or '-d' in sys.argv
    show_help = '--help' in sys.argv or '-h' in sys.argv
    
    if show_help:
        print("Simple Video Analysis Checker")
        print("=" * 50)
        print("Usage: python query_incomplete_videos_simple.py [options]")
        print()
        print("Options:")
        print("  -h, --help      Show this help message")
        print("  -d, --detailed  Show detailed report")
        print()
        print("Environment Variables:")
        print("  SUPABASE_URL              Your Supabase project URL")
        print("  SUPABASE_SERVICE_ROLE_KEY Your service role key")
        return
    
    checker = SimpleVideoChecker()
    
    print("🔍 Checking video analysis status...")
    
    no_analysis = checker.get_videos_without_analysis()
    incomplete_analysis = checker.get_videos_with_incomplete_analysis()
    
    checker.print_results(no_analysis, incomplete_analysis, detailed)

if __name__ == "__main__":
    main()