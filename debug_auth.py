#!/usr/bin/env python3
"""
Debug authentication issues with Supabase
"""

import os
import sys
import json
import requests
import base64

def decode_jwt_payload(token):
    """Decode JWT payload to see what's inside."""
    try:
        # JWT has 3 parts separated by dots
        parts = token.split('.')
        if len(parts) != 3:
            return None
        
        # Decode the payload (second part)
        payload = parts[1]
        # Add padding if needed
        padding = 4 - (len(payload) % 4)
        if padding != 4:
            payload += '=' * padding
        
        decoded = base64.urlsafe_b64decode(payload)
        return json.loads(decoded)
    except Exception as e:
        print(f"Error decoding JWT: {e}")
        return None

def test_different_auth_methods():
    """Test different authentication methods."""
    url = os.getenv('SUPABASE_URL', '').strip()
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '').strip().replace('\n', '').replace('\r', '')
    
    print(f"🔗 URL: {url}")
    print(f"🔑 Key length: {len(key)} characters")
    print(f"🔑 Key preview: {key[:30]}...{key[-20:]}")
    
    # Decode the JWT to see what's inside
    payload = decode_jwt_payload(key)
    if payload:
        print(f"🔍 JWT payload: {json.dumps(payload, indent=2)}")
    else:
        print("❌ Could not decode JWT")
    
    # Test different authentication methods
    test_cases = [
        {
            "name": "Method 1: apikey + Authorization Bearer",
            "headers": {
                'apikey': key,
                'Authorization': f'Bearer {key}',
                'Content-Type': 'application/json'
            }
        },
        {
            "name": "Method 2: Authorization Bearer only",
            "headers": {
                'Authorization': f'Bearer {key}',
                'Content-Type': 'application/json'
            }
        },
        {
            "name": "Method 3: apikey only",
            "headers": {
                'apikey': key,
                'Content-Type': 'application/json'
            }
        }
    ]
    
    for test_case in test_cases:
        print(f"\n🧪 Testing: {test_case['name']}")
        
        try:
            response = requests.get(
                f"{url}/rest/v1/videos",
                headers=test_case['headers'],
                params={'select': 'id', 'limit': 1},
                timeout=10
            )
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Success! Found {len(data)} record(s)")
                return test_case['headers']
            elif response.status_code == 401:
                print(f"   ❌ Unauthorized")
            elif response.status_code == 404:
                print(f"   ❌ Not found (table might not exist)")
            else:
                print(f"   ❌ Error: {response.text[:200]}")
                
        except Exception as e:
            print(f"   ❌ Exception: {e}")
    
    return None

def test_table_access():
    """Test access to different tables."""
    url = os.getenv('SUPABASE_URL', '').strip()
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '').strip().replace('\n', '').replace('\r', '')
    
    headers = {
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json'
    }
    
    tables = ['videos', 'video_analysis', 'projects']
    
    print("\n🔍 Testing table access...")
    
    for table in tables:
        try:
            response = requests.get(
                f"{url}/rest/v1/{table}",
                headers=headers,
                params={'select': 'id', 'limit': 1},
                timeout=10
            )
            
            print(f"   {table}: {response.status_code}", end="")
            
            if response.status_code == 200:
                data = response.json()
                print(f" ✅ ({len(data)} records found)")
            elif response.status_code == 401:
                print(f" ❌ Unauthorized")
            elif response.status_code == 404:
                print(f" ❌ Table not found")
            else:
                print(f" ❌ Error")
                
        except Exception as e:
            print(f"   {table}: ❌ Exception: {e}")

def main():
    """Main debug function."""
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not url or not key:
        print("❌ Environment variables not set")
        return
    
    print("🔍 SUPABASE AUTHENTICATION DEBUG")
    print("=" * 50)
    
    # Test different auth methods
    working_headers = test_different_auth_methods()
    
    if working_headers:
        print(f"\n✅ Found working authentication method!")
        test_table_access()
    else:
        print(f"\n❌ No authentication method worked")
        print(f"\n💡 Things to check:")
        print(f"1. Is your service role key correct?")
        print(f"2. Is your Supabase project URL correct?")
        print(f"3. Are your RLS policies allowing service role access?")
        print(f"4. Is your Supabase project active?")

if __name__ == "__main__":
    main()