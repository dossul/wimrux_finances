#!/usr/bin/env python3
"""
Phase 4: Import des données vers Appwrite
Importe les fichiers JSONL depuis exports/ vers Appwrite
"""
import json, ssl, urllib.request, urllib.error, time
from pathlib import Path

# Appwrite Config
ENDPOINT = "https://appwrite.benga.live/v1"
PROJECT = "6a29285200015cd421c7"
API_KEY = "cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57"
DB_ID = "wimrux_finances"
EXPORT_DIR = Path("c:/wamp64/www/wimrux_finances/exports")
IMPORT_DIR = Path("c:/wamp64/www/wimrux_finances/imports")

ctx = ssl._create_unverified_context()
HEADERS = {
    "Content-Type": "application/json",
    "X-Appwrite-Project": PROJECT,
    "X-Appwrite-Key": API_KEY
}

def log(msg, level="INFO"):
    prefix = {"INFO": "  ", "OK": "  ✓ ", "WARN": "  ⚠ ", "ERROR": "  ✗ "}.get(level, "  ")
    print(f"{prefix}{msg}")

def call(method, path, body=None, timeout=30):
    url = ENDPOINT + path
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    try:
        resp = urllib.request.urlopen(req, context=ctx, timeout=timeout)
        b = resp.read()
        return json.loads(b) if b else {}, None
    except urllib.error.HTTPError as e:
        b = e.read()
        try: return None, json.loads(b)
        except: return None, {"code": e.code, "message": str(e)}
    except Exception as e:
        return None, {"code": 0, "message": str(e)}

def transform_row_for_appwrite(row):
    """Transform PostgreSQL row to Appwrite format"""
    # Remove PostgreSQL-specific fields that don't exist in Appwrite
    appwrite_row = {}
    
    for key, value in row.items():
        # Skip internal PostgreSQL fields
        if key.startswith('__'):
            continue
        
        # Handle special fields
        if value is None:
            continue  # Skip null values, let Appwrite use defaults
        
        # Handle JSON fields - convert to string
        if isinstance(value, (dict, list)):
            appwrite_row[key] = json.dumps(value, ensure_ascii=False)
        else:
            appwrite_row[key] = value
    
    return appwrite_row

def import_table(table_name):
    """Import a single table from JSONL to Appwrite"""
    input_file = EXPORT_DIR / f"{table_name}.jsonl"
    log_file = IMPORT_DIR / f"{table_name}.log"
    
    if not input_file.exists():
        log(f"{table_name}: fichier non trouvé, ignoré", "WARN")
        return 0, 0
    
    IMPORT_DIR.mkdir(parents=True, exist_ok=True)
    
    total = 0
    errors = 0
    
    with open(input_file, 'r', encoding='utf-8') as f_in, \
         open(log_file, 'w', encoding='utf-8') as f_log:
        
        for line_num, line in enumerate(f_in, 1):
            line = line.strip()
            if not line:
                continue
            
            try:
                row = json.loads(line)
            except json.JSONDecodeError as e:
                f_log.write(f"LINE {line_num}: JSON parse error: {e}\n")
                errors += 1
                continue
            
            # Get document ID
            doc_id = row.get('id')
            if not doc_id:
                # Generate a unique ID if missing
                doc_id = f"{table_name}-{line_num}"
            
            # Transform row
            data = transform_row_for_appwrite(row)
            
            # Create document
            body = {
                "documentId": doc_id,
                "data": data
            }
            
            resp, err = call(
                "POST",
                f"/databases/{DB_ID}/collections/{table_name}/documents",
                body
            )
            
            if err:
                if err.get("code") == 409:
                    # Document exists, try update
                    resp2, err2 = call(
                        "PATCH",
                        f"/databases/{DB_ID}/collections/{table_name}/documents/{doc_id}",
                        {"data": data}
                    )
                    if err2:
                        f_log.write(f"DOC {doc_id}: Update error: {err2}\n")
                        errors += 1
                    else:
                        total += 1
                else:
                    f_log.write(f"DOC {doc_id}: Create error: {err}\n")
                    errors += 1
            else:
                total += 1
            
            if line_num % 100 == 0:
                log(f"  {table_name}: {total} docs importés...")
                time.sleep(0.5)  # Rate limiting
    
    log(f"{table_name}: {total} docs importés, {errors} erreurs")
    return total, errors

def import_all():
    log("=" * 60)
    log("PHASE 4: IMPORT DONNÉES VERS APPWRITE")
    log("=" * 60)
    
    # Tables in dependency order (parents first)
    tables = [
        "companies",
        "user_profiles",
        "ai_providers",
        "ai_models",
        "clients",
        "suppliers",
        "articles",
        "bank_accounts",
        "invoices",
        "invoice_items",
        "invoice_payments",
    ]
    
    stats = {}
    total_imported = 0
    total_errors = 0
    
    log(f"\nImport de {len(tables)} tables...")
    
    for table in tables:
        imported, errors = import_table(table)
        stats[table] = {"imported": imported, "errors": errors}
        total_imported += imported
        total_errors += errors
        time.sleep(1)  # Between tables
    
    # Save summary
    summary_file = IMPORT_DIR / "_summary.json"
    with open(summary_file, 'w', encoding='utf-8') as f:
        json.dump({
            "target": ENDPOINT,
            "database": DB_ID,
            "total_imported": total_imported,
            "total_errors": total_errors,
            "tables": stats,
            "import_date": time.strftime("%Y-%m-%dT%H:%M:%S")
        }, f, indent=2, ensure_ascii=False)
    
    log("\n" + "=" * 60)
    log("RÉSUMÉ IMPORT")
    log("=" * 60)
    log(f"Tables importées: {len([t for t in stats.values() if t['imported'] > 0])}")
    log(f"Total documents:  {total_imported}")
    log(f"Erreurs:        {total_errors}")
    log(f"Logs:           {IMPORT_DIR}")
    
    return stats

if __name__ == "__main__":
    import_all()
    log("\n✅ Phase 4 terminée")
