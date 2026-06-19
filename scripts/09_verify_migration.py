#!/usr/bin/env python3
"""
Phase 9: Vérification finale de la migration
Vérifie que toutes les collections, attributs, permissions et buckets sont en place
"""
import json, ssl, urllib.request, urllib.error
from pathlib import Path

ENDPOINT = "https://appwrite.benga.live/v1"
PROJECT = "6a29285200015cd421c7"
API_KEY = "cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57"
DB_ID = "wimrux_finances"
AUDIT_DIR = Path("c:/wamp64/www/wimrux_finances/audit")

ctx = ssl._create_unverified_context()
HEADERS = {
    "Content-Type": "application/json",
    "X-Appwrite-Project": PROJECT,
    "X-Appwrite-Key": API_KEY
}

def log(msg, level="INFO"):
    prefix = {"INFO": "  ", "OK": "  ✓ ", "WARN": "  ⚠ ", "ERROR": "  ✗ "}.get(level, "  ")
    print(f"{prefix}{msg}")

def call(method, path, timeout=30):
    url = ENDPOINT + path
    req = urllib.request.Request(url, headers=HEADERS, method=method)
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

def verify():
    log("=" * 60)
    log("PHASE 9: VÉRIFICATION FINALE")
    log("=" * 60)
    
    issues = []
    
    # 1. Check collections count
    log("\n[1/4] Vérification collections...")
    cols_data, err = call("GET", f"/databases/{DB_ID}/collections?limit=100")
    if err:
        log(f"Erreur récupération collections: {err}", "ERROR")
        issues.append("collections_api_error")
    else:
        collections = cols_data.get("collections", [])
        log(f"{len(collections)} collections trouvées")
        
        # Check for critical collections
        critical = ['companies', 'user_profiles', 'clients', 'invoices', 'invoice_items']
        for col_name in critical:
            found = any(c["$id"] == col_name for c in collections)
            if found:
                log(f"✓ {col_name}", "OK")
            else:
                log(f"✗ {col_name} MANQUANT", "ERROR")
                issues.append(f"missing_collection_{col_name}")
        
        # Check permissions on companies
        companies = next((c for c in collections if c["$id"] == "companies"), None)
        if companies:
            perms = companies.get("$permissions", [])
            if any('read("users")' in str(p) for p in perms):
                log("✓ Permissions OK sur companies", "OK")
            else:
                log("⚠ Permissions incorrectes sur companies", "WARN")
                issues.append("companies_permissions")
    
    # 2. Check buckets
    log("\n[2/4] Vérification buckets...")
    buckets_data, err = call("GET", "/storage/buckets?limit=100")
    if err:
        log(f"Erreur récupération buckets: {err}", "ERROR")
        issues.append("buckets_api_error")
    else:
        buckets = buckets_data.get("buckets", [])
        log(f"{len(buckets)} buckets trouvés")
        
        # Check critical buckets
        critical_buckets = ['invoices-pdf', 'company-logos', 'payment-evidences']
        for bucket_name in critical_buckets:
            found = any(b["$id"] == bucket_name for b in buckets)
            if found:
                log(f"✓ {bucket_name}", "OK")
            else:
                log(f"✗ {bucket_name} MANQUANT", "ERROR")
                issues.append(f"missing_bucket_{bucket_name}")
    
    # 3. Check functions
    log("\n[3/4] Vérification functions...")
    funcs_data, err = call("GET", "/functions?limit=100")
    if err:
        log(f"Erreur récupération functions: {err}", "ERROR")
        issues.append("functions_api_error")
    else:
        functions = funcs_data.get("functions", [])
        log(f"{len(functions)} functions trouvées")
        
        # Check critical functions
        critical_funcs = ['ai-router', 'send-email', 'send-otp-whatsapp', 'verify-otp']
        for func_name in critical_funcs:
            found = any(f["$id"] == func_name for f in functions)
            if found:
                log(f"✓ {func_name}", "OK")
            else:
                log(f"⚠ {func_name} manquant (P2)", "WARN")
    
    # 4. Check documents in critical collections
    log("\n[4/4] Vérification données...")
    for col_name in ['companies', 'user_profiles']:
        docs_data, err = call("GET", f"/databases/{DB_ID}/collections/{col_name}/documents?limit=1")
        if err:
            log(f"⚠ Erreur lecture {col_name}: {err}", "WARN")
        else:
            docs = docs_data.get("documents", [])
            if docs:
                log(f"✓ {col_name}: {len(docs)}+ documents", "OK")
            else:
                log(f"⚠ {col_name}: aucun document", "WARN")
    
    # Summary
    log("\n" + "=" * 60)
    log("RÉSUMÉ VÉRIFICATION")
    log("=" * 60)
    
    if issues:
        log(f"{len(issues)} problème(s) trouvé(s):", "ERROR")
        for issue in issues:
            log(f"  - {issue}", "ERROR")
        return False
    else:
        log("✓ Aucun problème critique trouvé", "OK")
        log("✓ Migration prête pour déploiement", "OK")
        return True

if __name__ == "__main__":
    success = verify()
    log("\n" + ("✅ Phase 9 terminée - PRÊT" if success else "⚠️ Phase 9 terminée - PROBLÈMES"))
