#!/usr/bin/env python3
"""Check actual state of Appwrite collections vs SQL schema"""
import json, ssl, urllib.request, urllib.error, re
from pathlib import Path

ENDPOINT = "https://appwrite.benga.live/v1"
PROJECT = "6a29285200015cd421c7"
API_KEY = "cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57"
DB_ID = "wimrux_finances"
SQL_DIR = Path("c:/wamp64/www/wimrux_finances/sql")

ctx = ssl._create_unverified_context()
HEADERS = {"X-Appwrite-Project": PROJECT, "X-Appwrite-Key": API_KEY}

def call(path):
    req = urllib.request.Request(ENDPOINT + path, headers=HEADERS)
    try:
        return json.loads(urllib.request.urlopen(req, context=ctx, timeout=30).read())
    except urllib.error.HTTPError as e:
        b = e.read()
        print(f"HTTP {e.code} on {path}: {b[:300]}")
        return {}
    except Exception as e:
        return {"error": str(e)}

# Get all collections with cursor pagination using queries[] (Appwrite 1.5)
import urllib.parse
all_cols = set()
last_id = None
total_expected = None
for i in range(20):
    # Appwrite 1.5 default page size is 25 - use cursorAfter for pagination
    path = f"/databases/{DB_ID}/collections"
    if last_id:
        path += f"?cursor={urllib.parse.quote(last_id)}"
    data = call(path)
    cols = data.get("collections", [])
    if total_expected is None:
        total_expected = data.get("total", 0)
    if not cols:
        break
    for c in cols:
        all_cols.add(c["$id"])
    if len(all_cols) >= total_expected:
        break
    last_id = cols[-1]["$id"]

print(f"Expected total: {total_expected}")
print(f"Got: {len(all_cols)}")

# Parse SQL for table names
sql_tables = set()
for sql_file in list(SQL_DIR.glob("*.sql")) + list((SQL_DIR / "supabase/migrations").glob("*.sql")):
    text = sql_file.read_text(encoding='utf-8', errors='replace')
    for m in re.finditer(r'CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?(\w+)', text):
        sql_tables.add(m.group(1))

missing = sql_tables - all_cols
extra = all_cols - sql_tables

print(f"Appwrite collections: {len(all_cols)}")
print(f"SQL tables: {len(sql_tables)}")
print(f"\nMISSING in Appwrite ({len(missing)}):")
for t in sorted(missing):
    print(f"  - {t}")
print(f"\nEXTRA in Appwrite ({len(extra)}):")
for t in sorted(extra):
    print(f"  - {t}")
print(f"\nALL Appwrite collections:")
for t in sorted(all_cols):
    print(f"  - {t}")
