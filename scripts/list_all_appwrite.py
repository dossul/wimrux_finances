#!/usr/bin/env python3
"""List ALL appwrite collections by iterating pages with cursor"""
import json, ssl, urllib.request, urllib.parse, urllib.error

ENDPOINT = "https://appwrite.benga.live/v1"
PROJECT = "6a29285200015cd421c7"
API_KEY = "cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57"
DB_ID = "wimrux_finances"

ctx = ssl._create_unverified_context()
HEADERS = {"X-Appwrite-Project": PROJECT, "X-Appwrite-Key": API_KEY}

# Try queries[] with proper URL encoding
def fetch_page(cursor_after=None):
    queries = ['limit(100)']
    if cursor_after:
        queries.append(f'cursorAfter("{cursor_after}")')
    
    # Try the queries[] format
    params = []
    for q in queries:
        params.append(("queries[]", q))
    qs = urllib.parse.urlencode(params)
    url = f"{ENDPOINT}/databases/{DB_ID}/collections?{qs}"
    
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        return json.loads(urllib.request.urlopen(req, context=ctx, timeout=30).read())
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read()[:200]}")
        return None

# Method 1: queries[] limit
print("=== Method 1: queries[]=limit(100) ===")
data = fetch_page()
if data:
    cols = data.get("collections", [])
    print(f"Total: {data.get('total')}, Got: {len(cols)}")

# Method 2: simple GET (default 25)
print("\n=== Method 2: simple GET ===")
all_cols = []
seen = set()
last_id = None
for i in range(10):
    if last_id:
        url = f"{ENDPOINT}/databases/{DB_ID}/collections?queries[]={urllib.parse.quote(f'cursorAfter(' + chr(34) + last_id + chr(34) + ')')}"
    else:
        url = f"{ENDPOINT}/databases/{DB_ID}/collections"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        d = json.loads(urllib.request.urlopen(req, context=ctx, timeout=30).read())
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read()[:300]}")
        break
    cols = d.get("collections", [])
    print(f"Page {i+1}: got {len(cols)}, total={d.get('total')}")
    new_added = 0
    for c in cols:
        if c["$id"] not in seen:
            seen.add(c["$id"])
            all_cols.append(c["$id"])
            new_added += 1
    if new_added == 0 or len(cols) == 0:
        break
    last_id = cols[-1]["$id"]

print(f"\nTotal unique: {len(all_cols)}")
for c in sorted(all_cols):
    print(f"  - {c}")
