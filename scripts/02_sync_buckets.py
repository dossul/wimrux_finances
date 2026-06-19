#!/usr/bin/env python3
"""
Phase 2: Synchronisation des buckets Storage
Crée les 13 buckets avec permissions et configurations correctes
"""
import json, ssl, urllib.request, urllib.error, time

# Config
ENDPOINT = "https://appwrite.benga.live/v1"
PROJECT = "6a29285200015cd421c7"
API_KEY = "cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57"

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

# Bucket definitions from 06_storage_buckets.md
BUCKETS = [
    # Public buckets
    {
        "id": "invoices-pdf",
        "name": "Invoices PDF",
        "public": True,
        "file_size_limit": 10485760,  # 10MB
        "allowed_extensions": [],  # Any (PDFs)
    },
    {
        "id": "company-logos",
        "name": "Company Logos",
        "public": True,
        "file_size_limit": 2097152,  # 2MB
        "allowed_extensions": ["jpg", "jpeg", "png", "svg"],
    },
    {
        "id": "invoices-scans",
        "name": "Invoices Scans",
        "public": True,
        "file_size_limit": 10485760,  # 10MB
        "allowed_extensions": ["pdf", "jpg", "jpeg", "png"],
    },
    {
        "id": "carnet-logos",
        "name": "Carnet Logos",
        "public": True,
        "file_size_limit": 2097152,  # 2MB
        "allowed_extensions": ["jpg", "jpeg", "png"],
    },
    # Private buckets
    {
        "id": "carnet-documents",
        "name": "Carnet Documents",
        "public": False,
        "file_size_limit": 52428800,  # 50MB
        "allowed_extensions": ["pdf"],
    },
    {
        "id": "carnet-rapports",
        "name": "Carnet Rapports",
        "public": False,
        "file_size_limit": 52428800,  # 50MB
        "allowed_extensions": ["pdf"],
    },
    {
        "id": "carnet-scans",
        "name": "Carnet Scans",
        "public": False,
        "file_size_limit": 52428800,  # 50MB
        "allowed_extensions": ["jpg", "jpeg", "png", "pdf"],
    },
    {
        "id": "carnet-scans-processed",
        "name": "Carnet Scans Processed",
        "public": False,
        "file_size_limit": 52428800,  # 50MB
        "allowed_extensions": ["pdf"],
    },
    {
        "id": "carnet-signatures",
        "name": "Carnet Signatures",
        "public": False,
        "file_size_limit": 2097152,  # 2MB
        "allowed_extensions": ["png"],
    },
    {
        "id": "certified-invoices-scans",
        "name": "Certified Invoices Scans",
        "public": False,
        "file_size_limit": 10485760,  # 10MB
        "allowed_extensions": ["pdf", "jpg", "jpeg"],
    },
    {
        "id": "coupon-tickets",
        "name": "Coupon Tickets",
        "public": False,
        "file_size_limit": 2097152,  # 2MB
        "allowed_extensions": ["pdf"],
    },
    {
        "id": "payment-evidences",
        "name": "Payment Evidences",
        "public": False,
        "file_size_limit": 5242880,  # 5MB
        "allowed_extensions": ["jpg", "jpeg", "png", "pdf"],
    },
    {
        "id": "report-exports",
        "name": "Report Exports",
        "public": False,
        "file_size_limit": 52428800,  # 50MB
        "allowed_extensions": ["csv", "json", "html", "pdf"],
    },
]

def create_bucket(bucket_def):
    """Create a storage bucket in Appwrite"""
    bucket_id = bucket_def["id"]
    
    # Build MIME types from extensions
    mime_types = []
    for ext in bucket_def.get("allowed_extensions", []):
        if ext == "jpg" or ext == "jpeg":
            mime_types.append("image/jpeg")
        elif ext == "png":
            mime_types.append("image/png")
        elif ext == "svg":
            mime_types.append("image/svg+xml")
        elif ext == "pdf":
            mime_types.append("application/pdf")
        elif ext == "csv":
            mime_types.append("text/csv")
        elif ext == "json":
            mime_types.append("application/json")
        elif ext == "html":
            mime_types.append("text/html")
    
    # Permissions
    if bucket_def["public"]:
        permissions = ['read("any")', 'create("users")', 'update("users")', 'delete("users")']
    else:
        permissions = ['read("users")', 'create("users")', 'update("users")', 'delete("users")']
    
    body = {
        "bucketId": bucket_id,
        "name": bucket_def["name"],
        "permissions": permissions,
        "fileSecurity": False,
        "enabled": True,
        # Don't set maximumFileSize - let Appwrite use default (_APP_STORAGE_LIMIT)
        "allowedFileExtensions": bucket_def.get("allowed_extensions", []),
        "compression": "none",
        "encryption": True,
        "antivirus": True
    }
    
    # Only add allowedMimeTypes if we have specific ones
    if mime_types:
        body["allowedMimeTypes"] = mime_types
    
    data, err = call("POST", "/storage/buckets", body)
    if err:
        if err.get("code") == 409:
            log(f"Bucket {bucket_id} existe déjà", "WARN")
            return "exists"
        log(f"Erreur création {bucket_id}: {err}", "ERROR")
        return "error"
    
    log(f"Bucket {bucket_id} créé", "OK")
    return "created"

def sync_buckets():
    log("=" * 60)
    log("PHASE 2: SYNCHRONISATION BUCKETS STORAGE")
    log("=" * 60)
    
    stats = {"created": 0, "exists": 0, "error": 0}
    
    log(f"\nTraitement de {len(BUCKETS)} buckets...")
    
    for bucket in BUCKETS:
        result = create_bucket(bucket)
        stats[result] += 1
        time.sleep(0.5)  # Rate limiting
    
    log("\n" + "=" * 60)
    log("RÉSUMÉ BUCKETS")
    log("=" * 60)
    log(f"Buckets créés:   {stats['created']}")
    log(f"Déjà existants:  {stats['exists']}")
    log(f"Erreurs:         {stats['error']}")
    
    return stats

if __name__ == "__main__":
    sync_buckets()
    log("\n✅ Phase 2 terminée")
