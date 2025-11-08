#!/usr/bin/env python3
"""
Test script for the Strvm Musixmatch API
This bypasses your proxy and uses the reverse-engineered API directly
"""

import sys
import os
import json

# Add the musicxmatch-api to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'musicxmatch-api', 'src'))

try:
    from musicxmatch_api import MusixMatchAPI
except ImportError as e:
    print("❌ Error importing MusixMatchAPI:")
    print(f"   {e}")
    print("\n📦 To fix this, run:")
    print("   pip install musicxmatch_api")
    print("   OR")
    print("   pip install -e ./musicxmatch-api")
    sys.exit(1)

def test_search(query):
    """Test search with the Strvm API"""
    print(f"🔍 Testing Strvm API search for: '{query}'")
    print("=" * 50)
    
    try:
        # Initialize the API
        api = MusixMatchAPI()
        print("✅ API initialized successfully")
        
        # Perform search
        print(f"🔎 Searching for: {query}")
        search_results = api.search_tracks(query)
        
        # Check response
        if not search_results or 'message' not in search_results:
            print("❌ Invalid response structure")
            return
        
        message = search_results['message']
        
        if message['header']['status_code'] != 200:
            print(f"❌ API error: {message['header']['status_code']}")
            return
        
        # Get tracks
        tracks = message.get('body', {}).get('track_list', [])
        
        if not tracks:
            print("❌ No tracks found")
            return
        
        print(f"✅ Found {len(tracks)} results!")
        print("\n📋 Results:")
        print("-" * 50)
        
        # Display first 10 results
        for i, track_item in enumerate(tracks[:10], 1):
            track = track_item['track']
            print(f"{i:2d}. {track['track_name']}")
            print(f"    Artist: {track['artist_name']}")
            print(f"    Album: {track.get('album_name', 'Unknown')}")
            print(f"    ID: {track['track_id']}")
            print(f"    Has Lyrics: {'✅' if track.get('has_lyrics') else '❌'}")
            print()
        
        if len(tracks) > 10:
            print(f"... and {len(tracks) - 10} more results")
        
        # Save full results to file for inspection
        output_file = f"strvm_results_{query.replace(' ', '_')}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(search_results, f, indent=2, ensure_ascii=False)
        print(f"💾 Full results saved to: {output_file}")
        
    except Exception as e:
        print(f"❌ Error during search: {e}")
        import traceback
        traceback.print_exc()

def main():
    print("🎵 Strvm Musixmatch API Test")
    print("=" * 50)
    
    # Test queries
    test_queries = [
        "amarte mas",
        "historia entre tus", 
        "18 libras",
        "despacito",
        "shape of you"
    ]
    
    if len(sys.argv) > 1:
        # Use command line argument
        query = " ".join(sys.argv[1:])
        test_search(query)
    else:
        # Test with predefined queries
        for query in test_queries:
            test_search(query)
            print("\n" + "=" * 50 + "\n")

if __name__ == "__main__":
    main()
