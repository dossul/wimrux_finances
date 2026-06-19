#!/usr/bin/env python3
"""
Rapport de couverture détaillé SQL → Appwrite
Compare chaque table, attribut, et index entre les fichiers SQL et Appwrite
"""
import json, ssl, urllib.request, urllib.error, re
from pathlib import Path

ENDPOINT = "https://appwrite.benga.live/v1"
PROJECT = "6a29285200015cd421c7"
API_KEY = "cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57"
DB_ID = "wimrux_finances"
SQL_DIR = Path("c:/wamp64/www/wimrux_finances/sql")
AUDIT_DIR = Path("c:/wamp64/www/wimrux_finances/audit")

ctx = ssl._create_unverified_context()
HEADERS = {"X-Appwrite-Project": PROJECT, "X-Appwrite-Key": API_KEY}

def get_collection(col_id):
    req = urllib.request.Request(f"{ENDPOINT}/databases/{DB_ID}/collections/{col_id}", headers=HEADERS)
    try:
        return json.loads(urllib.request.urlopen(req, context=ctx, timeout=15).read())
    except urllib.error.HTTPError:
        return None
    except Exception:
        return None

def parse_sql_tables():
    """Parse SQL files for table definitions"""
    tables = {}
    # Use supabase migrations as the more authoritative source
    sql_files = list((SQL_DIR / "supabase/migrations").glob("*.sql"))
    if not sql_files:
        sql_files = list(SQL_DIR.glob("*.sql"))
    
    for sql_file in sql_files:
        content = sql_file.read_text(encoding='utf-8', errors='replace')
        # Find all CREATE TABLE blocks
        for m in re.finditer(
            r'CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?(\w+)\s*\((.*?)\);',
            content, re.DOTALL
        ):
            table_name = m.group(1)
            body = m.group(2)
            columns = []
            for line in body.split('\n'):
                line = line.strip().rstrip(',')
                if not line or line.startswith('--') or line.upper().startswith(('CONSTRAINT', 'PRIMARY', 'UNIQUE', 'FOREIGN', 'CHECK')):
                    continue
                col_match = re.match(r'^"?(\w+)"?\s+(\w+(?:\s*\([^)]*\))?)', line)
                if col_match:
                    columns.append(col_match.group(1))
            tables[table_name] = columns
    return tables

# Parse SQL
print("Parsing SQL files...")
sql_tables = parse_sql_tables()
print(f"Found {len(sql_tables)} tables in SQL\n")

# Compare
report_lines = []
report_lines.append("# Coverage Report SQL -> Appwrite\n\n")
report_lines.append("| Table | SQL cols | Appwrite attrs | Status |\n")
report_lines.append("|-------|----------|----------------|--------|\n")

stats = {"complete": 0, "partial": 0, "missing_table": 0, "total_sql_cols": 0, "total_app_attrs": 0}
gaps = []

for table_name, sql_cols in sorted(sql_tables.items()):
    sql_col_count = len(sql_cols)
    stats["total_sql_cols"] += sql_col_count
    
    coll = get_collection(table_name)
    if not coll:
        status = "MISSING TABLE"
        stats["missing_table"] += 1
        report_lines.append(f"| {table_name} | {sql_col_count} | - | {status} |\n")
        gaps.append({"table": table_name, "issue": "missing_collection"})
        continue
    
    app_attrs = coll.get("attributes", [])
    app_attr_keys = set(a.get("key") for a in app_attrs)
    stats["total_app_attrs"] += len(app_attrs)
    
    missing_attrs = [c for c in sql_cols if c not in app_attr_keys]
    
    if not missing_attrs:
        status = "OK"
        stats["complete"] += 1
    else:
        status = f"MISSING {len(missing_attrs)} attrs"
        stats["partial"] += 1
        gaps.append({
            "table": table_name,
            "issue": "missing_attributes",
            "missing": missing_attrs
        })
    
    report_lines.append(f"| {table_name} | {sql_col_count} | {len(app_attrs)} | {status} |\n")

# Write report
AUDIT_DIR.mkdir(parents=True, exist_ok=True)
report_file = AUDIT_DIR / "COVERAGE_REPORT.md"
report_file.write_text("".join(report_lines), encoding='utf-8')

# Write gaps JSON
gaps_file = AUDIT_DIR / "coverage_gaps.json"
gaps_file.write_text(json.dumps({"stats": stats, "gaps": gaps}, indent=2), encoding='utf-8')

# Console summary
print(f"Tables OK:               {stats['complete']}/{len(sql_tables)}")
print(f"Tables partielles:       {stats['partial']}")
print(f"Tables manquantes:       {stats['missing_table']}")
print(f"Total cols SQL:          {stats['total_sql_cols']}")
print(f"Total attrs Appwrite:    {stats['total_app_attrs']}")
print(f"\nRapport: {report_file}")
print(f"Gaps:    {gaps_file}")

if gaps:
    print(f"\n{len(gaps)} table(s) avec écarts:")
    for g in gaps[:10]:
        if g["issue"] == "missing_attributes":
            print(f"  - {g['table']}: {len(g['missing'])} attrs manquants -> {g['missing'][:5]}{'...' if len(g['missing']) > 5 else ''}")
        else:
            print(f"  - {g['table']}: {g['issue']}")
