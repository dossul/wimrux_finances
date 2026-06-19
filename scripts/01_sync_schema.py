#!/usr/bin/env python3
"""
Phase 1: Synchronisation complète du schéma SQL → Appwrite
Crée les collections manquantes, ajoute les attributs, corrige les types, fixe les permissions
"""
import json, ssl, urllib.request, urllib.error, re, time
from pathlib import Path

# Config
ENDPOINT = "https://appwrite.benga.live/v1"
PROJECT = "6a29285200015cd421c7"
API_KEY = "cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57"
DB_ID = "wimrux_finances"
SQL_DIR = Path("c:/wamp64/www/wimrux_finances/sql")
AUDIT_DIR = Path("c:/wamp64/www/wimrux_finances/audit")

# Standard permissions for all collections
PERMS = ['read("users")', 'create("users")', 'update("users")', 'delete("users")']

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
            log(f"Fichier manquant: {sql_file}", "WARN")
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
            for line in body.split('\n'):
                line = line.strip()
                # Skip constraints and comments
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
                    default = None
                    
                    # Extract default value
                    default_match = re.search(r'DEFAULT\s+([^\s,]+)', line, re.IGNORECASE)
                    if default_match:
                        default = default_match.group(1)
                    
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
                    elif 'numeric' in col_type or 'decimal' in col_type:
                        appwrite_type = "float"
                    elif 'float' in col_type or 'double' in col_type or 'real' in col_type:
                        appwrite_type = "float"
                    elif 'integer' in col_type or 'int' in col_type or 'bigint' in col_type or 'smallint' in col_type:
                        appwrite_type = "integer"
                    elif 'boolean' in col_type or 'bool' in col_type:
                        appwrite_type = "boolean"
                    elif 'timestamp' in col_type or 'date' in col_type:
                        appwrite_type = "datetime"
                    elif 'json' in col_type:
                        appwrite_type = "string"  # JSON as string
                        size = 100000
                    
                    attrs.append({
                        "key": col_name,
                        "type": appwrite_type,
                        "size": size,
                        "required": required,
                        "default": default,
                        "array": False
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
                    "key": idx_name,
                    "type": "unique" if is_unique else "key",
                    "attributes": idx_cols
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
    max_iterations = 100
    iterations = 0
    
    while iterations < max_iterations:
        iterations += 1
        data, err = call("GET", f"/databases/{DB_ID}/collections?limit={limit}&offset={offset}")
        if err:
            log(f"Erreur list collections: {err}", "ERROR")
            break
        
        batch = data.get("collections", [])
        added = 0
        for col in batch:
            col_id = col["$id"]
            if col_id in collections:
                continue
            
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
        
        if len(batch) < limit or added == 0:
            break
        offset += limit
    
    return collections

def create_collection(col_id, col_name):
    """Create a new collection in Appwrite"""
    body = {
        "collectionId": col_id,
        "name": col_name,
        "permissions": PERMS,
        "documentSecurity": False,
        "enabled": True
    }
    data, err = call("POST", f"/databases/{DB_ID}/collections", body)
    if err:
        if err.get("code") == 409:
            log(f"Collection {col_id} existe déjà", "WARN")
            return True
        log(f"Erreur création {col_id}: {err}", "ERROR")
        return False
    log(f"Collection {col_id} créée", "OK")
    return True

def update_collection_permissions(col_id, col_name):
    """Update collection permissions"""
    body = {
        "name": col_name,
        "permissions": PERMS,
        "documentSecurity": False,
        "enabled": True
    }
    data, err = call("PUT", f"/databases/{DB_ID}/collections/{col_id}", body)
    if err:
        log(f"Erreur permissions {col_id}: {err}", "ERROR")
        return False
    return True

def create_attribute(col_id, attr):
    """Create a single attribute in a collection"""
    attr_type = attr["type"]
    key = attr["key"]
    
    # Build request body based on type
    body = {"key": key, "required": attr.get("required", False)}
    
    if attr_type == "string":
        body["size"] = attr.get("size") or 255
        if attr.get("default"):
            body["default"] = attr["default"]
    elif attr_type == "integer":
        if attr.get("default"):
            try:
                body["default"] = int(attr["default"])
            except:
                pass
    elif attr_type == "float":
        if attr.get("default"):
            try:
                body["default"] = float(attr["default"])
            except:
                pass
    elif attr_type == "boolean":
        if attr.get("default"):
            default_val = attr["default"].lower()
            body["default"] = default_val in ("true", "1", "yes", "t")
    elif attr_type == "datetime":
        pass  # No default for datetime in Appwrite
    
    endpoint = f"/databases/{DB_ID}/collections/{col_id}/attributes/{attr_type}"
    data, err = call("POST", endpoint, body)
    
    if err:
        if err.get("code") == 409:
            return True  # Already exists
        log(f"Erreur attr {col_id}.{key}: {err}", "ERROR")
        return False
    return True

def create_index(col_id, idx):
    """Create an index in a collection"""
    body = {
        "key": idx["key"],
        "type": idx["type"],
        "attributes": idx["attributes"],
        "orders": ["ASC"] * len(idx["attributes"])
    }
    data, err = call("POST", f"/databases/{DB_ID}/collections/{col_id}/indexes", body)
    if err:
        if err.get("code") == 409:
            return True
        log(f"Erreur index {col_id}.{idx['key']}: {err}", "WARN")
        return False
    return True

def sync_schema():
    log("=" * 60)
    log("PHASE 1: SYNCHRONISATION SCHEMA SQL VERS APPWRITE")
    log("=" * 60)
    
    # Load target schema from SQL
    log("\n[1/4] Parsing schéma SQL...")
    target_schema = parse_sql_schema()
    log(f"{len(target_schema)} tables dans SQL", "OK")
    
    # Load current Appwrite state
    log("\n[2/4] Récupération collections Appwrite...")
    appwrite_cols = get_appwrite_collections()
    log(f"{len(appwrite_cols)} collections existantes", "OK")
    
    # Track stats
    stats = {
        "created": 0,
        "updated_perms": 0,
        "attrs_added": 0,
        "indexes_added": 0,
        "errors": 0
    }
    
    # Process each table from SQL
    log("\n[3/4] Synchronisation collections...")
    for col_id, col_def in target_schema.items():
        col_name = col_id.replace("_", " ").title()
        app_col = appwrite_cols.get(col_id)
        
        if not app_col:
            # Create missing collection
            log(f"Création: {col_id}")
            if create_collection(col_id, col_name):
                stats["created"] += 1
                # Add all attributes
                for attr in col_def["attributes"]:
                    if create_attribute(col_id, attr):
                        stats["attrs_added"] += 1
                    else:
                        stats["errors"] += 1
                    time.sleep(0.1)  # Rate limiting
                
                # Add indexes
                for idx in col_def["indexes"]:
                    if create_index(col_id, idx):
                        stats["indexes_added"] += 1
                
                time.sleep(0.5)  # Let Appwrite process
            else:
                stats["errors"] += 1
        else:
            # Update existing collection
            # Check permissions
            perms_ok = any('read("users")' in str(p) for p in app_col.get("permissions", []))
            if not perms_ok:
                log(f"Mise à jour permissions: {col_id}")
                if update_collection_permissions(col_id, col_name):
                    stats["updated_perms"] += 1
            
            # Check missing attributes
            app_attrs = app_col.get("attributes", {})
            for attr in col_def["attributes"]:
                attr_key = attr["key"]
                if attr_key not in app_attrs:
                    log(f"  + Attr manquant: {col_id}.{attr_key}")
                    if create_attribute(col_id, attr):
                        stats["attrs_added"] += 1
                    else:
                        stats["errors"] += 1
                    time.sleep(0.1)
                else:
                    # Check type mismatch
                    expected_type = attr["type"]
                    actual_type = app_attrs[attr_key].get("type")
                    if expected_type != actual_type:
                        log(f"  ⚠ Type différent: {col_id}.{attr_key} (attendu: {expected_type}, actuel: {actual_type})", "WARN")
            
            # Check missing indexes
            app_indexes = app_col.get("indexes", {})
            existing_idx_attrs = set()
            for idx in app_indexes.values():
                attrs_tuple = tuple(sorted(idx.get("attributes", [])))
                existing_idx_attrs.add(attrs_tuple)
            
            for idx in col_def["indexes"]:
                idx_attrs_tuple = tuple(sorted(idx["attributes"]))
                if idx_attrs_tuple not in existing_idx_attrs:
                    log(f"  + Index manquant: {col_id}.{idx['key']}")
                    if create_index(col_id, idx):
                        stats["indexes_added"] += 1
    
    log("\n[4/4] Finalisation...")
    time.sleep(3)  # Let Appwrite process all changes
    
    # Summary
    log("\n" + "=" * 60)
    log("RÉSUMÉ SYNCHRONISATION")
    log("=" * 60)
    log(f"Collections créées:     {stats['created']}")
    log(f"Permissions mises à jour: {stats['updated_perms']}")
    log(f"Attributs ajoutés:      {stats['attrs_added']}")
    log(f"Index créés:           {stats['indexes_added']}")
    log(f"Erreurs:               {stats['errors']}")
    
    return stats

if __name__ == "__main__":
    sync_schema()
    log("\n✅ Phase 1 terminée")
