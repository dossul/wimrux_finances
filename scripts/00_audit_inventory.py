#!/usr/bin/env python3
"""
Phase 0: Audit complet - Inventaire Appwrite vs SQL cible
Génère audit/inventory.json et audit/REPORT.md
"""
import json, ssl, urllib.request, urllib.error, re, os
from pathlib import Path

# Config
ENDPOINT = "https://appwrite.benga.live/v1"
PROJECT = "6a29285200015cd421c7"
API_KEY = "cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57"
DB_ID = "wimrux_finances"
SQL_DIR = Path("c:/wamp64/www/wimrux_finances/sql")
AUDIT_DIR = Path("c:/wamp64/www/wimrux_finances/audit")

ctx = ssl._create_unverified_context()
HEADERS = {
    "Content-Type": "application/json",
    "X-Appwrite-Project": PROJECT,
    "X-Appwrite-Key": API_KEY
}

def log(msg):
    print(f"  {msg}")

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

def parse_sql_schema():
    """Parse tous les fichiers SQL pour extraire les tables et attributs"""
    tables = {}
    sql_files = [
        SQL_DIR / "02_core_tables.sql",
        SQL_DIR / "03_invoice_tables.sql",
        SQL_DIR / "04_ai_and_system_tables.sql",
        SQL_DIR / "05_mobile_money_and_wallet.sql",
    ]
    
    for sql_file in sql_files:
        if not sql_file.exists():
            log(f"⚠ Fichier manquant: {sql_file}")
            continue
        
        content = sql_file.read_text(encoding='utf-8')
        
        # Pattern: CREATE TABLE table_name (
        table_matches = re.finditer(
            r'CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public\.(\w+)\s*\((.*?)\);',
            content, re.DOTALL | re.IGNORECASE
        )
        
        for match in table_matches:
            table_name = match.group(1)
            body = match.group(2)
            
            attrs = []
            # Parse columns
            for line in body.split('\n'):
                line = line.strip()
                # Skip comments and constraints
                if not line or line.startswith('--') or line.startswith('CONSTRAINT') or \
                   line.startswith('PRIMARY') or line.startswith('UNIQUE') or \
                   line.startswith('FOREIGN') or line.startswith('CREATE') or \
                   line.startswith(')') or line.startswith('TABLE'):
                    continue
                
                # Match: column_name type constraints
                col_match = re.match(r'(\w+)\s+(\w+(?:\s*\([^)]*\))?)', line)
                if col_match:
                    col_name = col_match.group(1)
                    col_type = col_match.group(2).lower()
                    
                    # Map PostgreSQL → Appwrite
                    appwrite_type = "string"
                    size = None
                    required = "NOT NULL" in line.upper() and "DEFAULT" not in line.upper()
                    
                    if 'uuid' in col_type:
                        appwrite_type = "string"
                        size = 36
                    elif 'varchar' in col_type or 'character varying' in col_type:
                        appwrite_type = "string"
                        size_match = re.search(r'\((\d+)\)', col_type)
                        size = int(size_match.group(1)) if size_match else 255
                    elif 'text' in col_type:
                        appwrite_type = "string"
                        size = 50000
                    elif 'numeric' in col_type or 'decimal' in col_type or 'float' in col_type or 'double' in col_type:
                        appwrite_type = "float"
                    elif 'integer' in col_type or 'int' in col_type:
                        appwrite_type = "integer"
                    elif 'boolean' in col_type or 'bool' in col_type:
                        appwrite_type = "boolean"
                    elif 'timestamp' in col_type or 'date' in col_type:
                        appwrite_type = "datetime"
                    elif 'json' in col_type:
                        appwrite_type = "string"  # JSON stored as string
                        size = 100000
                    
                    attrs.append({
                        "name": col_name,
                        "pg_type": col_type,
                        "appwrite_type": appwrite_type,
                        "size": size,
                        "required": required,
                        "default": re.search(r'DEFAULT\s+([^\s,]+)', line.upper()) and True
                    })
            
            # Parse indexes
            indexes = []
            idx_matches = re.finditer(
                r'CREATE\s+(UNIQUE\s+)?INDEX\s+(\w+)\s+ON\s+public\.' + table_name + r'\s+USING\s+\w+\s*\(([^)]+)\)',
                content, re.IGNORECASE
            )
            for idx_match in idx_matches:
                is_unique = bool(idx_match.group(1))
                idx_name = idx_match.group(2)
                idx_cols = [c.strip().split()[0] for c in idx_match.group(3).split(',')]
                indexes.append({
                    "name": idx_name,
                    "unique": is_unique,
                    "columns": idx_cols
                })
            
            tables[table_name] = {
                "attributes": attrs,
                "indexes": indexes
            }
    
    return tables

def get_appwrite_collections():
    """Get all collections from Appwrite with pagination"""
    collections = {}
    offset = 0
    limit = 25
    max_iterations = 100  # Safety limit
    iterations = 0
    
    while iterations < max_iterations:
        iterations += 1
        data, err = call("GET", f"/databases/{DB_ID}/collections?limit={limit}&offset={offset}")
        if err:
            log(f"⚠ Erreur list collections: {err}")
            break
        
        batch = data.get("collections", [])
        added = 0
        for col in batch:
            col_id = col["$id"]
            if col_id in collections:
                continue  # Skip duplicates
            
            attrs = {}
            for attr in col.get("attributes", []):
                attrs[attr["key"]] = {
                    "type": attr.get("type", "unknown"),
                    "required": attr.get("required", False),
                    "size": attr.get("size"),
                    "default": attr.get("default")
                }
            
            indexes = {}
            for idx in col.get("indexes", []):
                idx_key = idx.get("$id") or idx.get("key") or f"idx_{len(indexes)}"
                indexes[idx_key] = {
                    "type": idx.get("type"),
                    "attributes": idx.get("attributes", []),
                    "orders": idx.get("orders", [])
                }
            
            collections[col_id] = {
                "name": col.get("name"),
                "permissions": col.get("$permissions", []),
                "attributes": attrs,
                "indexes": indexes,
                "documentSecurity": col.get("documentSecurity", False),
                "enabled": col.get("enabled", True)
            }
            added += 1
        
        log(f"  Récupéré {len(collections)} collections (+{added})")
        
        if len(batch) < limit or added == 0:
            break
        offset += limit
    
    return collections

def get_appwrite_buckets():
    """Get all storage buckets from Appwrite"""
    buckets = {}
    offset = 0
    limit = 25
    max_iterations = 50
    iterations = 0
    
    while iterations < max_iterations:
        iterations += 1
        data, err = call("GET", f"/storage/buckets?limit={limit}&offset={offset}")
        if err:
            log(f"⚠ Erreur list buckets: {err}")
            break
        
        batch = data.get("buckets", [])
        added = 0
        for bucket in batch:
            bucket_id = bucket["$id"]
            if bucket_id in buckets:
                continue
            buckets[bucket_id] = {
                "name": bucket.get("name"),
                "permissions": bucket.get("$permissions", []),
                "fileSecurity": bucket.get("fileSecurity", False),
                "enabled": bucket.get("enabled", True),
                "maximumFileSize": bucket.get("maximumFileSize", 0),
                "allowedFileExtensions": bucket.get("allowedFileExtensions", [])
            }
            added += 1
        
        if len(batch) < limit or added == 0:
            break
        offset += limit
    
    return buckets

def get_appwrite_functions():
    """Get all functions from Appwrite"""
    functions = {}
    offset = 0
    limit = 25
    max_iterations = 50
    iterations = 0
    
    while iterations < max_iterations:
        iterations += 1
        data, err = call("GET", f"/functions?limit={limit}&offset={offset}")
        if err:
            log(f"⚠ Erreur list functions: {err}")
            break
        
        batch = data.get("functions", [])
        added = 0
        for func in batch:
            func_id = func["$id"]
            if func_id in functions:
                continue
            functions[func_id] = {
                "name": func.get("name"),
                "runtime": func.get("runtime"),
                "execute": func.get("execute", []),
                "events": func.get("events", []),
                "schedule": func.get("schedule"),
                "timeout": func.get("timeout"),
                "enabled": func.get("enabled", True)
            }
            added += 1
        
        if len(batch) < limit or added == 0:
            break
        offset += limit
    
    return functions

def generate_inventory():
    log("=" * 60)
    log("AUDIT COMPLET - Inventaire Appwrite vs SQL cible")
    log("=" * 60)
    
    # 1. Parse SQL schema
    log("\n[1/5] Parsing schéma SQL...")
    sql_schema = parse_sql_schema()
    log(f"  ✓ {len(sql_schema)} tables trouvées dans SQL")
    
    # 2. Get Appwrite collections
    log("\n[2/5] Récupération collections Appwrite...")
    appwrite_cols = get_appwrite_collections()
    log(f"  ✓ {len(appwrite_cols)} collections trouvées dans Appwrite")
    
    # 3. Get Appwrite buckets
    log("\n[3/5] Récupération buckets Appwrite...")
    appwrite_buckets = get_appwrite_buckets()
    log(f"  ✓ {len(appwrite_buckets)} buckets trouvés")
    
    # 4. Get Appwrite functions
    log("\n[4/5] Récupération functions Appwrite...")
    appwrite_funcs = get_appwrite_functions()
    log(f"  ✓ {len(appwrite_funcs)} functions trouvées")
    
    # 5. Compare and generate report
    log("\n[5/5] Génération du rapport...")
    
    # Build inventory
    inventory = {
        "metadata": {
            "endpoint": ENDPOINT,
            "project": PROJECT,
            "database": DB_ID,
            "sql_tables_count": len(sql_schema),
            "appwrite_collections_count": len(appwrite_cols),
            "appwrite_buckets_count": len(appwrite_buckets),
            "appwrite_functions_count": len(appwrite_funcs)
        },
        "tables": {},
        "buckets": {},
        "functions": {}
    }
    
    # Compare tables
    for table_name, sql_def in sql_schema.items():
        appwrite_col = appwrite_cols.get(table_name)
        
        if not appwrite_col:
            status = "MISSING"
            missing_attrs = [a["name"] for a in sql_def["attributes"]]
            extra_attrs = []
        else:
            # Check attributes
            sql_attrs = {a["name"]: a for a in sql_def["attributes"]}
            app_attrs = appwrite_col["attributes"]
            
            missing_attrs = [name for name in sql_attrs if name not in app_attrs]
            extra_attrs = [name for name in app_attrs if name not in sql_attrs]
            
            # Check type mismatches
            type_mismatches = []
            for attr_name, sql_attr in sql_attrs.items():
                if attr_name in app_attrs:
                    app_attr = app_attrs[attr_name]
                    expected_type = sql_attr["appwrite_type"]
                    actual_type = app_attr["type"]
                    if expected_type != actual_type:
                        type_mismatches.append({
                            "name": attr_name,
                            "expected": expected_type,
                            "actual": actual_type
                        })
            
            # Check indexes
            missing_indexes = []
            for idx in sql_def.get("indexes", []):
                idx_found = False
                for app_idx in appwrite_col["indexes"].values():
                    if set(idx["columns"]) == set(app_idx["attributes"]):
                        idx_found = True
                        break
                if not idx_found:
                    missing_indexes.append(idx["name"])
            
            # Check permissions
            perms_ok = 'read("users")' in str(appwrite_col.get("permissions", []))
            
            if missing_attrs or type_mismatches or missing_indexes or not perms_ok:
                status = "INCOMPLETE"
            else:
                status = "OK"
        
        inventory["tables"][table_name] = {
            "status": status,
            "exists_in_appwrite": appwrite_col is not None,
            "sql_attributes_count": len(sql_def["attributes"]),
            "appwrite_attributes_count": len(appwrite_col["attributes"]) if appwrite_col else 0,
            "missing_attributes": missing_attrs,
            "extra_attributes": extra_attrs,
            "type_mismatches": type_mismatches if appwrite_col else [],
            "missing_indexes": missing_indexes,
            "permissions_ok": perms_ok if appwrite_col else False
        }
    
    # Extra collections in Appwrite (not in SQL)
    for col_id in appwrite_cols:
        if col_id not in sql_schema:
            inventory["tables"][col_id] = {
                "status": "EXTRA",
                "exists_in_appwrite": True,
                "note": "Collection présente dans Appwrite mais absente du schéma SQL"
            }
    
    # Buckets target from documentation
    target_buckets = [
        "invoices-pdf", "company-logos", "invoices-scans", "carnet-logos",
        "carnet-documents", "carnet-rapports", "carnet-scans", "carnet-scans-processed",
        "carnet-signatures", "certified-invoices-scans", "coupon-tickets",
        "payment-evidences", "report-exports"
    ]
    
    for bucket_id in target_buckets:
        app_bucket = appwrite_buckets.get(bucket_id)
        inventory["buckets"][bucket_id] = {
            "status": "OK" if app_bucket else "MISSING",
            "exists": app_bucket is not None,
            "permissions": app_bucket.get("permissions") if app_bucket else None
        }
    
    # Functions target from documentation
    target_functions = [
        "ai-router", "send-email", "send-otp-whatsapp", "verify-otp",
        "cashflow-forecast", "detect-anomalies", "export-report",
        "ingest-payment", "ingest-image-payment", "ingest-statement-file",
        "ingest-text-payment", "ingest-sms", "nl-to-sql", "verify-tax-id",
        "generate-device-key", "device-heartbeat", "push-certified-invoice",
        "pull-pending-invoices", "parse-certified-invoice", "pdf-to-images",
        "mcf-simulator", "fnec-simulator", "chatbot-gateway", "crypto-aes256",
        "delete-user", "next-invoice-ref"
    ]
    
    for func_name in target_functions:
        app_func = appwrite_funcs.get(func_name)
        inventory["functions"][func_name] = {
            "status": "OK" if app_func else "MISSING",
            "exists": app_func is not None,
            "runtime": app_func.get("runtime") if app_func else None
        }
    
    # Save inventory JSON
    inventory_path = AUDIT_DIR / "inventory.json"
    with open(inventory_path, 'w', encoding='utf-8') as f:
        json.dump(inventory, f, indent=2, ensure_ascii=False)
    log(f"  ✓ Sauvegardé: {inventory_path}")
    
    # Generate markdown report
    report = generate_markdown_report(inventory)
    report_path = AUDIT_DIR / "REPORT.md"
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report)
    log(f"  ✓ Sauvegardé: {report_path}")
    
    # Summary
    missing_tables = sum(1 for t in inventory["tables"].values() if t.get("status") == "MISSING")
    incomplete_tables = sum(1 for t in inventory["tables"].values() if t.get("status") == "INCOMPLETE")
    ok_tables = sum(1 for t in inventory["tables"].values() if t.get("status") == "OK")
    missing_buckets = sum(1 for b in inventory["buckets"].values() if b.get("status") == "MISSING")
    missing_functions = sum(1 for f in inventory["functions"].values() if f.get("status") == "MISSING")
    
    log("\n" + "=" * 60)
    log("RÉSUMÉ")
    log("=" * 60)
    log(f"  Tables SQL cible:        {len(sql_schema)}")
    log(f"  Tables Appwrite actuel:  {len(appwrite_cols)}")
    log(f"  Tables OK:               {ok_tables}")
    log(f"  Tables INCOMPLETE:       {incomplete_tables}")
    log(f"  Tables MANQUANTES:       {missing_tables}")
    log(f"  Buckets MANQUANTS:       {missing_buckets}")
    log(f"  Functions MANQUANTES:    {missing_functions}")
    
    return inventory

def generate_markdown_report(inventory):
    """Generate human-readable markdown report"""
    lines = [
        "# Audit Migration InsForge → Appwrite",
        "",
        f"**Date:** {__import__('datetime').datetime.now().isoformat()}",
        f"**Endpoint:** {inventory['metadata']['endpoint']}",
        "",
        "## 📊 Statistiques globales",
        "",
        f"| Métrique | Valeur |",
        f"|----------|--------|",
        f"| Tables SQL cible | {inventory['metadata']['sql_tables_count']} |",
        f"| Collections Appwrite | {inventory['metadata']['appwrite_collections_count']} |",
        f"| Buckets Appwrite | {inventory['metadata']['appwrite_buckets_count']} |",
        f"| Functions Appwrite | {inventory['metadata']['appwrite_functions_count']} |",
        "",
        "## 🗄️ Tables / Collections",
        "",
    ]
    
    # Group by status
    missing = [(k, v) for k, v in inventory["tables"].items() if v.get("status") == "MISSING"]
    incomplete = [(k, v) for k, v in inventory["tables"].items() if v.get("status") == "INCOMPLETE"]
    ok = [(k, v) for k, v in inventory["tables"].items() if v.get("status") == "OK"]
    extra = [(k, v) for k, v in inventory["tables"].items() if v.get("status") == "EXTRA"]
    
    if missing:
        lines.extend(["### ❌ Collections MANQUANTES (à créer)", ""])
        for name, info in sorted(missing):
            lines.append(f"- `{name}` - {info['sql_attributes_count']} attributs")
        lines.append("")
    
    if incomplete:
        lines.extend(["### ⚠️ Collections INCOMPLÈTES (à compléter)", ""])
        for name, info in sorted(incomplete):
            issues = []
            if info.get("missing_attributes"):
                issues.append(f"{len(info['missing_attributes'])} attrs manquants")
            if info.get("type_mismatches"):
                issues.append(f"{len(info['type_mismatches'])} types incorrects")
            if not info.get("permissions_ok"):
                issues.append("permissions incorrectes")
            lines.append(f"- `{name}` - {', '.join(issues) if issues else 'problème'}")
        lines.append("")
    
    if ok:
        lines.extend([f"### ✅ Collections OK ({len(ok)})", ""])
        for name, info in sorted(ok):
            lines.append(f"- `{name}`")
        lines.append("")
    
    if extra:
        lines.extend([f"### 📝 Collections EXTRA (non dans SQL)", ""])
        for name, info in sorted(extra):
            lines.append(f"- `{name}` - {info.get('note', '')}")
        lines.append("")
    
    # Buckets
    lines.extend(["## 📦 Buckets Storage", ""])
    missing_buckets = [(k, v) for k, v in inventory["buckets"].items() if v.get("status") == "MISSING"]
    ok_buckets = [(k, v) for k, v in inventory["buckets"].items() if v.get("status") == "OK"]
    
    if missing_buckets:
        lines.extend(["### ❌ Buckets MANQUANTS", ""])
        for name, _ in sorted(missing_buckets):
            lines.append(f"- `{name}`")
        lines.append("")
    
    if ok_buckets:
        lines.extend([f"### ✅ Buckets OK ({len(ok_buckets)})", ""])
        for name, _ in sorted(ok_buckets):
            lines.append(f"- `{name}`")
        lines.append("")
    
    # Functions
    lines.extend(["## ⚡ Edge Functions", ""])
    missing_funcs = [(k, v) for k, v in inventory["functions"].items() if v.get("status") == "MISSING"]
    ok_funcs = [(k, v) for k, v in inventory["functions"].items() if v.get("status") == "OK"]
    
    if missing_funcs:
        lines.extend([f"### ❌ Functions MANQUANTES ({len(missing_funcs)})", ""])
        for name, _ in sorted(missing_funcs):
            lines.append(f"- `{name}`")
        lines.append("")
    
    if ok_funcs:
        lines.extend([f"### ✅ Functions OK ({len(ok_funcs)})", ""])
        for name, _ in sorted(ok_funcs):
            lines.append(f"- `{name}`")
        lines.append("")
    
    # Recommendations
    lines.extend([
        "## 🎯 Recommandations",
        "",
        "### Priorité 0 (Bloquant)",
        "1. Créer les collections manquantes avec attributs corrects",
        "2. Corriger les permissions sur toutes les collections (read/write users)",
        "3. Créer les buckets storage manquants",
        "",
        "### Priorité 1 (Critique)",
        "1. Compléter les attributs manquants sur collections INCOMPLETE",
        "2. Corriger les types d'attributs incorrects",
        "3. Créer les index manquants",
        "",
        "### Priorité 2 (Important)",
        "1. Déployer les edge functions critiques (auth, OTP, email)",
        "2. Migrer les données depuis InsForge",
        "",
        "### Priorité 3 (Amélioration)",
        "1. Déployer toutes les edge functions",
        "2. Portage des triggers métier",
        "3. Tests E2E complets",
        ""
    ])
    
    return "\n".join(lines)

if __name__ == "__main__":
    import datetime
    generate_inventory()
    log("\n✅ Audit terminé. Voir audit/REPORT.md")
