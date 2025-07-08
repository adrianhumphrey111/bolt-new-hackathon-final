#!/usr/bin/env python3
"""
Script to query videos that don't have video_analysis rows or have incomplete analysis.

This script finds:
1. Videos that don't have any video_analysis row
2. Videos that have video_analysis rows but status is not 'completed'
3. Videos that have 'completed' status but missing transcription or llm_response data

Based on the schema analysis:
- videos table: id, project_id, file_name, original_name, file_path, status, created_at, updated_at
- video_analysis table: id, project_id, video_id, status, transcription, llm_response, video_analysis, created_at, updated_at
"""

import os
import sys
import json
from typing import List, Dict, Any
from dataclasses import dataclass
from datetime import datetime

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("Error: psycopg2 not installed. Install with: pip install psycopg2-binary")
    sys.exit(1)

@dataclass
class Video:
    id: str
    project_id: str
    file_name: str
    original_name: str
    file_path: str
    status: str
    created_at: datetime
    analysis_status: str = None
    analysis_id: str = None
    has_transcription: bool = False
    has_llm_response: bool = False
    has_video_analysis: bool = False

class VideoAnalysisChecker:
    def __init__(self, database_url: str = None):
        """Initialize with database connection."""
        self.database_url = database_url or os.getenv('DATABASE_URL')
        if not self.database_url:
            raise ValueError("DATABASE_URL environment variable must be set or passed as parameter")
        
        self.conn = None
        
    def connect(self):
        """Connect to the database."""
        try:
            self.conn = psycopg2.connect(self.database_url)
            print("✅ Connected to database")
        except Exception as e:
            print(f"❌ Failed to connect to database: {e}")
            sys.exit(1)
    
    def disconnect(self):
        """Close database connection."""
        if self.conn:
            self.conn.close()
            print("🔌 Disconnected from database")
    
    def query_incomplete_videos(self) -> List[Video]:
        """Query all videos and their analysis status."""
        if not self.conn:
            raise ValueError("Not connected to database")
        
        query = """
        SELECT 
            v.id,
            v.project_id,
            v.file_name,
            v.original_name,
            v.file_path,
            v.status as video_status,
            v.created_at,
            va.id as analysis_id,
            va.status as analysis_status,
            CASE WHEN va.transcription IS NOT NULL AND va.transcription != 'null'::jsonb THEN true ELSE false END as has_transcription,
            CASE WHEN va.llm_response IS NOT NULL AND va.llm_response != 'null'::jsonb THEN true ELSE false END as has_llm_response,
            CASE WHEN va.video_analysis IS NOT NULL AND va.video_analysis != 'null'::jsonb THEN true ELSE false END as has_video_analysis
        FROM videos v
        LEFT JOIN video_analysis va ON v.id = va.video_id
        ORDER BY v.created_at DESC;
        """
        
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query)
                rows = cur.fetchall()
                
                videos = []
                for row in rows:
                    video = Video(
                        id=row['id'],
                        project_id=row['project_id'],
                        file_name=row['file_name'],
                        original_name=row['original_name'],
                        file_path=row['file_path'],
                        status=row['video_status'],
                        created_at=row['created_at'],
                        analysis_status=row['analysis_status'],
                        analysis_id=row['analysis_id'],
                        has_transcription=row['has_transcription'],
                        has_llm_response=row['has_llm_response'],
                        has_video_analysis=row['has_video_analysis']
                    )
                    videos.append(video)
                
                return videos
                
        except Exception as e:
            print(f"❌ Failed to query videos: {e}")
            return []
    
    def categorize_videos(self, videos: List[Video]) -> Dict[str, List[Video]]:
        """Categorize videos by their analysis completeness."""
        categories = {
            'no_analysis': [],           # No video_analysis row at all
            'pending_analysis': [],      # Has analysis row but status is pending/processing
            'failed_analysis': [],       # Has analysis row but status is failed
            'incomplete_data': [],       # Status is completed but missing transcription/llm_response
            'complete': []              # Fully completed with all data
        }
        
        for video in videos:
            if video.analysis_id is None:
                # No analysis row exists
                categories['no_analysis'].append(video)
            elif video.analysis_status in ['pending', 'processing']:
                # Analysis is in progress
                categories['pending_analysis'].append(video)
            elif video.analysis_status == 'failed':
                # Analysis failed
                categories['failed_analysis'].append(video)
            elif video.analysis_status == 'completed':
                # Check if data is actually present
                if not video.has_transcription or not video.has_llm_response:
                    categories['incomplete_data'].append(video)
                else:
                    categories['complete'].append(video)
            else:
                # Unknown status
                categories['incomplete_data'].append(video)
        
        return categories
    
    def print_summary(self, categories: Dict[str, List[Video]]):
        """Print a summary of video analysis status."""
        total_videos = sum(len(videos) for videos in categories.values())
        
        print("\n" + "="*80)
        print(f"📊 VIDEO ANALYSIS SUMMARY")
        print("="*80)
        print(f"Total videos found: {total_videos}")
        print()
        
        for category, videos in categories.items():
            count = len(videos)
            if count > 0:
                emoji = {
                    'no_analysis': '🚫',
                    'pending_analysis': '⏳',
                    'failed_analysis': '❌',
                    'incomplete_data': '⚠️',
                    'complete': '✅'
                }[category]
                
                title = {
                    'no_analysis': 'No Analysis Row',
                    'pending_analysis': 'Analysis Pending/Processing',
                    'failed_analysis': 'Analysis Failed',
                    'incomplete_data': 'Incomplete Data (completed but missing transcription/llm_response)',
                    'complete': 'Complete Analysis'
                }[category]
                
                print(f"{emoji} {title}: {count} videos")
        
        print("\n" + "="*80)
    
    def print_detailed_report(self, categories: Dict[str, List[Video]]):
        """Print detailed information about incomplete videos."""
        incomplete_categories = ['no_analysis', 'pending_analysis', 'failed_analysis', 'incomplete_data']
        
        for category in incomplete_categories:
            videos = categories[category]
            if not videos:
                continue
                
            title = {
                'no_analysis': '🚫 VIDEOS WITHOUT ANALYSIS',
                'pending_analysis': '⏳ VIDEOS WITH PENDING/PROCESSING ANALYSIS',
                'failed_analysis': '❌ VIDEOS WITH FAILED ANALYSIS',
                'incomplete_data': '⚠️ VIDEOS WITH INCOMPLETE DATA'
            }[category]
            
            print(f"\n{title}")
            print("-" * len(title))
            
            for video in videos:
                print(f"📹 {video.original_name}")
                print(f"   ID: {video.id}")
                print(f"   Project: {video.project_id}")
                print(f"   File Path: {video.file_path}")
                print(f"   Video Status: {video.status}")
                print(f"   Created: {video.created_at}")
                
                if video.analysis_id:
                    print(f"   Analysis ID: {video.analysis_id}")
                    print(f"   Analysis Status: {video.analysis_status}")
                    print(f"   Has Transcription: {video.has_transcription}")
                    print(f"   Has LLM Response: {video.has_llm_response}")
                    print(f"   Has Video Analysis: {video.has_video_analysis}")
                else:
                    print(f"   Analysis: None")
                print()


def main():
    """Main function to run the video analysis checker."""
    # Check for database URL
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        print("❌ DATABASE_URL environment variable not set")
        print("   Please set it to your Supabase database URL:")
        print("   export DATABASE_URL='postgresql://username:password@host:port/database'")
        sys.exit(1)
    
    # Parse command line arguments
    show_detailed = '--detailed' in sys.argv or '-d' in sys.argv
    show_help = '--help' in sys.argv or '-h' in sys.argv
    
    if show_help:
        print("Video Analysis Checker")
        print("=" * 50)
        print("Usage: python query_incomplete_videos.py [options]")
        print()
        print("Options:")
        print("  -h, --help      Show this help message")
        print("  -d, --detailed  Show detailed report of incomplete videos")
        print()
        print("Environment Variables:")
        print("  DATABASE_URL    Supabase database connection string")
        return
    
    # Initialize checker and run analysis
    checker = VideoAnalysisChecker(database_url)
    
    try:
        print("🔍 Querying video analysis status...")
        checker.connect()
        
        videos = checker.query_incomplete_videos()
        if not videos:
            print("❌ No videos found or query failed")
            return
        
        categories = checker.categorize_videos(videos)
        checker.print_summary(categories)
        
        if show_detailed:
            checker.print_detailed_report(categories)
        else:
            incomplete_count = sum(len(categories[cat]) for cat in ['no_analysis', 'pending_analysis', 'failed_analysis', 'incomplete_data'])
            if incomplete_count > 0:
                print(f"\n💡 Run with --detailed flag to see detailed information about {incomplete_count} incomplete videos")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        checker.disconnect()


if __name__ == "__main__":
    main()