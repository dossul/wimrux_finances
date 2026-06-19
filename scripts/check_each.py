#!/usr/bin/env python3
"""Check each SQL table by direct GET on Appwrite"""
import json, ssl, urllib.request, urllib.error, re
from pathlib import Path

ENDPOINT = "https://appwrite.benga.live/v1"
PROJECT = "6a29285200015cd421c7"
API_KEY = "cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57"
DB_ID = "wimrux_finances"
SQL_DIR = Path("c:/wamp64/www/wimrux_finances/sql")

ctx = ssl._create_unverified_context()
HEADERS = {"X-Appwrite-Project": PROJECT, "X-Appwrite-Key": API_KEY}

def get_collection(col_id):
    req = urllib.request.Request(f"{ENDPOINT}/databases/{DB_ID}/collections/{col_id}", headers=HEADERS)
    try:
        d = json.loads(urllib.request.urlopen(req, context=ctx, timeout=15).read())
        return d
    except urllib.error.HTTPError as e:
        return None
    except Exception as e:
        return None

# Parse SQL tables
sql_tables = set()
for sql_file in list(SQL_DIR.glob("*.sql")) + list((SQL_DIR / "supabase/migrations").glob("*.sql")):
    text = sql_file.read_text(encoding='utf-8', errors='replace')
    for m in re.finditer(r'CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?(\w+)', text):
        sql_tables.add(m.group(1))

print(f"Checking {len(sql_tables)} SQL tables in Appwrite...\n")

exists = []
missing = []
for table in sorted(sql_tables):
    d = get_collection(table)
    if d:
        attr_count = len(d.get("attributes", []))
        idx_count = len(d.get("indexes", []))
        exists.append((table, attr_count, idx_count))
        print(f"  OK  {table:40s} attrs={attr_count} idx={idx_count}")
    else:
        missing.append(table)
        print(f"  XX  {table:40s} MISSING")

print(f"\n{len(exists)} exist / {len(missing)} missing of {len(sql_tables)} SQL tables")
if missing:
    print("\nMissing:")
    for m in missing:
        print(f"  - {m}")
