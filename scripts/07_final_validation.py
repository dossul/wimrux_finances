#!/usr/bin/env python3
"""
Phase 7: Validation finale de la migration Appwrite
Vérifie collections, fonctions, seed data, et secrets
"""
import json, ssl, urllib.request, urllib.parse

ENDPOINT = "https://appwrite.benga.live/v1"
PROJECT = "6a29285200015cd421c7"
API_KEY = "cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57"
DB = "wimrux_finances"

ctx = ssl._create_unverified_context()
headers = {
    "Content-Type": "application/json",
    "X-Appwrite-Project": PROJECT,
    "X-Appwrite-Key": API_KEY,
}

def log(msg, level="INFO"):
    prefix = {"INFO": "  ", "OK": "  ✓ ", "WARN": "  ⚠ ", "ERROR": "  ✗ "}.get(level, "  ")
    print(f"{prefix}{msg}")

def call(method, path, body=None):
    url = ENDPOINT + path
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req, context=ctx)
        b = resp.read()
        return json.loads(b) if b else {}, None
    except urllib.error.HTTPError as e:
        b = e.read()
        try: return None, json.loads(b)
        except: return None, {"code": e.code, "message": str(e)}
    except Exception as e:
        return None, {"code": 0, "message": str(e)}

def validate():
    log("=" * 60)
    log("PHASE 7: VALIDATION FINALE MIGRATION APPWRITE")
    log("=" * 60)

    errors = 0
    warnings = 0

    # ── 1. Vérifier les fonctions ─────────────────────────────────────
    log("\n1. Edge Functions")
    log("-" * 40)
    all_funcs = {}
    resp, err = call("GET", "/functions?limit=100")
    if err:
        log(f"Erreur listing fonctions: {err}", "ERROR")
        errors += 1
    else:
        for f in resp.get("functions", []):
            all_funcs[f["$id"]] = f

    required = [
        "ai-router", "send-email", "verify-otp", "send-otp-whatsapp",
        "verify-tax-id", "export-report", "bank-reconciliation",
        "invoice-generate-pdf", "esyntas-export", "wallet-sync",
        "cashflow-forecast", "detect-anomalies", "ingest-payment",
        "nl-to-sql", "generate-device-key", "device-heartbeat",
        "push-certified-invoice", "pull-pending-invoices",
        "parse-certified-invoice", "pdf-to-images", "mcf-simulator",
        "fnec-simulator", "chatbot-gateway", "crypto-aes256", "delete-user",
    ]
    for fid in required:
        if fid in all_funcs:
            f = all_funcs[fid]
            if f.get("enabled") is True or f.get("status") is True:
                log(f"{fid}: enabled", "OK")
            else:
                log(f"{fid}: disabled (enabled={f.get('enabled')}, status={f.get('status')})", "WARN")
                warnings += 1
        else:
            # Appwrite 1.5.7 has a pagination bug beyond 25 items
            # Try direct lookup
            f, err = call("GET", f"/functions/{fid}")
            if err:
                log(f"{fid}: MISSING", "ERROR")
                errors += 1
            else:
                if f.get("enabled") is True or f.get("status") is True:
                    log(f"{fid}: enabled", "OK")
                else:
                    log(f"{fid}: disabled (found via direct lookup)", "WARN")
                    warnings += 1

    # ── 2. Vérifier les collections critiques ─────────────────────────
    log("\n2. Collections critiques")
    log("-" * 40)
    critical = [
        "companies", "user_profiles", "clients", "suppliers",
        "articles", "invoices", "invoice_items", "invoice_payments",
        "bank_accounts", "treasury_accounts", "transaction_categories",
        "tax_payments", "audit_log", "otp_codes",
        "ai_providers", "ai_models", "ai_tasks",
    ]
    for cid in critical:
        _, err = call("GET", f"/databases/{DB}/collections/{cid}")
        if err:
            log(f"{cid}: HTTP {err.get('code', '?')}", "ERROR")
            errors += 1
        else:
            log(f"{cid}: OK", "OK")

    # ── 3. Vérifier seed data ─────────────────────────────────────────
    log("\n3. Seed Data")
    log("-" * 40)
    seed_checks = [
        ("clients", 5),
        ("invoices", 5),
        ("suppliers", 3),
        ("articles", 5),
        ("bank_accounts", 2),
        ("treasury_accounts", 1),
        ("transaction_categories", 5),
        ("tax_payments", 1),
    ]
    for col, min_count in seed_checks:
        resp, err = call("GET", f"/databases/{DB}/collections/{col}/documents?limit=50")
        if err:
            log(f"{col}: erreur {err}", "ERROR")
            errors += 1
        else:
            count = len(resp.get("documents", []))
            if count >= min_count:
                log(f"{col}: {count} documents", "OK")
            else:
                log(f"{col}: {count} documents (min: {min_count})", "WARN")
                warnings += 1

    # ── 4. Vérifier buckets ───────────────────────────────────────────
    log("\n4. Storage Buckets")
    log("-" * 40)
    resp, err = call("GET", "/storage/buckets?limit=100")
    if err:
        log(f"Buckets listing error: {err}", "ERROR")
        errors += 1
    else:
        buckets = [b["$id"] for b in resp.get("buckets", [])]
        for bid in ["invoice-pdfs", "company-logos", "receipts", "attachments", "reports"]:
            if bid in buckets:
                log(f"{bid}: exists", "OK")
            else:
                # Appwrite 1.5.7 pagination bug: try direct lookup
                _, berr = call("GET", f"/storage/buckets/{bid}")
                if berr:
                    log(f"{bid}: missing", "WARN")
                    warnings += 1
                else:
                    log(f"{bid}: exists (found via direct lookup)", "OK")

    # ── 5. Vérifier vars des fonctions ────────────────────────────────
    log("\n5. Function Variables (sample)")
    log("-" * 40)
    for fid in ["ai-router", "send-email", "verify-otp"]:
        resp, err = call("GET", f"/functions/{fid}/variables")
        if err:
            log(f"{fid} vars: erreur", "WARN")
            warnings += 1
        else:
            var_keys = [v["key"] for v in resp.get("variables", [])]
            if "APPWRITE_ENDPOINT" in var_keys:
                log(f"{fid}: APPWRITE_ENDPOINT configured", "OK")
            else:
                log(f"{fid}: APPWRITE_ENDPOINT missing", "WARN")
                warnings += 1

    # ── Résumé ───────────────────────────────────────────────────────
    log("\n" + "=" * 60)
    log("RÉSUMÉ VALIDATION")
    log("=" * 60)
    log(f"Erreurs:   {errors}")
    log(f"Warnings:  {warnings}")
    if errors == 0:
        log("✅ Migration Appwrite validée avec succès", "OK")
    else:
        log("❌ Des erreurs critiques restent à corriger", "ERROR")
    return errors, warnings

if __name__ == "__main__":
    validate()
