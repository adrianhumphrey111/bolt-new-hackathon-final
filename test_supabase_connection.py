#!/usr/bin/env python3
"""
Simple script to test Supabase connection and authentication
"""

import os
import sys

try:
    from supabase import create_client, Client
except ImportError:
    print("❌ Supabase client not installed.")
    print("Install with: pip install supabase")
    sys.exit(1)

def test_connection():
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    print(f"🔗 Testing connection to: {url}")
    print(f"🔑 Using service key: {key[:20]}...")
    
    if not url or not key:
        print("❌ Missing environment variables")
        return False
    
    try:
        supabase: Client = create_client(url, key)
        print("✅ Supabase client created")
        
        # Test a simple query
        print("🔍 Testing database access...")
        
        # Try to count videos (simple query)
        response = supabase.table('videos').select('id', count='exact').limit(1).execute()
        print(f"✅ Videos table accessible, found {response.count} total videos")
        
        # Try to count video_analysis
        response = supabase.table('video_analysis').select('id', count='exact').limit(1).execute()
        print(f"✅ video_analysis table accessible, found {response.count} total analysis records")
        
        return True
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        print(f"❌ Error type: {type(e).__name__}")
        return False

if __name__ == "__main__":
    success = test_connection()
    if success:
        print("\n🎉 Connection test successful!")
    else:
        print("\n💡 Troubleshooting tips:")
        print("1. Verify your SUPABASE_URL is correct")
        print("2. Verify your SUPABASE_SERVICE_ROLE_KEY is correct")
        print("3. Check if your Supabase project is active")
        print("4. Try regenerating your service role key")