#!/usr/bin/env python3
"""
Quick test script to verify vector database retrieval
"""
import sys
import os
sys.path.insert(0, '/home/mntel/Desktop/projects/culture/config')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from AI.ai.vector_db import search_community

print("=" * 60)
print("Testing Vector Database Retrieval")
print("=" * 60)

# Test search for each community
communities = ['kikuyu', 'luo', 'maasai', 'kalenjin', 'somali']
test_query = "culture and traditions"

for community in communities:
    print(f"\n[{community}] Searching for: '{test_query}'")
    results = search_community(test_query, community, k=2)
    
    if results:
        print(f"✓ Found {len(results)} results")
        for i, doc in enumerate(results, 1):
            content = doc.page_content[:100] if hasattr(doc, 'page_content') else str(doc)[:100]
            print(f"  {i}. {content}...")
    else:
        print(f"✗ No results found")

print("\n" + "=" * 60)
print("Vector DB Test Complete")
print("=" * 60)
