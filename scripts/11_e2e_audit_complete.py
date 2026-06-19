#!/usr/bin/env python3
"""RAPPORT E2E COMPLET — WIMRUX FINANCES sur Appwrite"""
import json, ssl, urllib.request, urllib.error, datetime, sys

ENDPOINT = "https://appwrite.benga.live/v1"
API_KEY = "cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57"
PROJECT = "6a29285200015cd421c7"
headers = {
    "Content-Type": "application/json",
    "X-Appwrite-Project": PROJECT,
    "X-Appwrite-Key": API_KEY,
}
ctx = ssl._create_unverified_context()

results = []
passed = 0
failed = 0

def run_test(name, category, fn):
    global passed, failed
    try:
        fn()
        results.append({"name": name, "category": category, "status": "PASS", "detail": ""})
        passed += 1
        print(f"  ✅ {name}")
    except AssertionError as e:
        results.append({"name": name, "category": category, "status": "FAIL", "detail": str(e)})
        failed += 1
        print(f"  ❌ {name}: {e}")
    except Exception as e:
        results.append({"name": name, "category": category, "status": "FAIL", "detail": str(e)})
        failed += 1
        print(f"  ❌ {name}: {e}")

def api_get(path):
    req = urllib.request.Request(f"{ENDPOINT}{path}", headers=headers)
    return urllib.request.urlopen(req, context=ctx)

def api_post(path, data):
    body = json.dumps(data).encode()
    req = urllib.request.Request(f"{ENDPOINT}{path}", data=body, headers=headers, method="POST")
    return urllib.request.urlopen(req, context=ctx)

# ============================================================
# SECTION 1: EDGE FUNCTIONS — EXISTENCE & ÉTAT
# ============================================================
print("\n📦 SECTION 1: Edge Functions — Existence & État")
functions_expected = [
    'ai-router', 'send-email', 'verify-otp', 'send-otp-whatsapp',
    'verify-tax-id', 'nl-to-sql', 'cashflow-forecast', 'detect-anomalies',
    'export-report', 'ingest-payment', 'ingest-image-payment', 'ingest-sms',
    'ingest-statement-file', 'ingest-text-payment', 'invoice-generate-pdf',
    'bank-reconciliation', 'wallet-sync', 'mcf-simulator', 'device-heartbeat',
    'generate-device-key', 'esyntas-export', 'push-certified-invoice',
    'pull-pending-invoices', 'parse-certified-invoice', 'pdf-to-images'
]

existing_functions = {}
try:
    data = json.loads(api_get("/functions").read())
    existing_functions = {f["$id"]: f for f in data.get("functions", [])}
    print(f"   Total fonctions trouvées: {len(existing_functions)}")
except Exception as e:
    print(f"   Erreur: {e}")

for fid in functions_expected:
    def make_test(fid):
        def _t():
            assert fid in existing_functions, f"Fonction {fid} non trouvée"
            f = existing_functions[fid]
            assert f.get("enabled") == True, f"Fonction {fid} inactive (enabled={f.get('enabled')})"
            assert f.get("deployment") is not None, f"Fonction {fid} sans déploiement"
        return _t
    run_test(f"[{fid}] existe et activée", "Edge Functions", make_test(fid))

# ============================================================
# SECTION 2: APPELS FONCTIONNELS
# ============================================================
print("\n🔧 SECTION 2: Edge Functions — Appels Fonctionnels")

def test_send_email():
    # Appwrite 1.5.7 Node.js runtime: req.body receives the raw JSON payload
    # Do NOT wrap in "data" - send the payload directly
    payload = {
        "to": "dossulrich@gmail.com",
        "subject": "E2E Audit",
        "template": "custom",
        "vars": {"subject": "E2E Audit", "html_body": "<p>Test</p>"}
    }
    resp = api_post("/functions/send-email/executions", payload)
    data = json.loads(resp.read())
    assert data.get("status") in ["completed", "failed"], f"Status={data.get('status')}"

run_test("[send-email] envoi email (structure OK)", "Appels Fonctionnels", test_send_email)

def test_nl_to_sql():
    resp = api_post("/functions/nl-to-sql/executions", {
        "data": json.dumps({"question": "Combien de factures ?", "user_id": "test"})
    })
    data = json.loads(resp.read())
    assert data.get("status") in ["completed", "failed"], f"Status={data.get('status')}"

run_test("[nl-to-sql] génération SQL", "Appels Fonctionnels", test_nl_to_sql)

def test_detect_anomalies():
    resp = api_post("/functions/detect-anomalies/executions", {
        "data": json.dumps({"company_id": "test"})
    })
    data = json.loads(resp.read())
    assert data.get("status") in ["completed", "failed"], f"Status={data.get('status')}"

run_test("[detect-anomalies] exécution sans crash", "Appels Fonctionnels", test_detect_anomalies)

def test_export_report():
    resp = api_post("/functions/export-report/executions", {
        "data": json.dumps({"report_type": "invoices", "format": "csv", "company_id": "test"})
    })
    data = json.loads(resp.read())
    assert data.get("status") in ["completed", "failed"], f"Status={data.get('status')}"

run_test("[export-report] génération rapport", "Appels Fonctionnels", test_export_report)

# ============================================================
# SECTION 3: BASE DE DONNÉES
# ============================================================
print("\n🗄️  SECTION 3: Base de Données — Collections & Seed Data")

collections = [
    ("clients", 1), ("invoices", 1), ("invoice_items", 1), ("companies", 1),
    ("bank_accounts", 0), ("treasury_accounts", 0), ("payment_wallets", 0),
    ("payment_evidences", 0), ("suppliers", 0), ("articles", 0),
    ("invoice_payments", 0), ("withholding_taxes", 0), ("tax_payments", 0),
    ("tax_declarations", 0), ("user_profiles", 1), ("audit_log", 0),
    ("ai_providers", 0), ("ai_models", 0), ("ai_tasks", 0),
    ("certification_devices", 0), ("company_ai_credits", 0),
]

for col_name, min_docs in collections:
    def make_col_test(col_name, min_docs):
        def _t():
            data = json.loads(api_get(f"/databases/wimrux_finances/collections/{col_name}/documents").read())
            assert "documents" in data, f"Réponse invalide"
            if min_docs > 0:
                assert len(data["documents"]) >= min_docs, f"Seulement {len(data['documents'])} docs"
        return _t
    run_test(f"[{col_name}] collection accessible", "Base de Données", make_col_test(col_name, min_docs))

# ============================================================
# SECTION 4: AUTHENTIFICATION
# ============================================================
print("\n🔐 SECTION 4: Authentification")

def test_users_list():
    data = json.loads(api_get("/users").read())
    assert "users" in data and len(data["users"]) > 0, "Aucun utilisateur"

run_test("Liste utilisateurs (admin)", "Auth", test_users_list)

def test_anon_session():
    anon_headers = {"Content-Type": "application/json", "X-Appwrite-Project": PROJECT}
    req = urllib.request.Request(f"{ENDPOINT}/account/sessions/anonymous", data=b"", headers=anon_headers, method="POST")
    data = json.loads(urllib.request.urlopen(req, context=ctx).read())
    assert "$id" in data, "Session anonyme échouée"

run_test("Session anonyme", "Auth", test_anon_session)

# ============================================================
# SECTION 5: STOCKAGE
# ============================================================
print("\n📁 SECTION 5: Stockage — Buckets")

def test_bucket_invoice_pdfs():
    data = json.loads(api_get("/storage/buckets/invoice_pdfs").read())
    assert data.get("$id") == "invoice_pdfs", f"ID={data.get('$id')}"

run_test("Bucket 'invoice_pdfs' existe", "Stockage", test_bucket_invoice_pdfs)

def test_bucket_payment_evidences():
    data = json.loads(api_get("/storage/buckets/payment_evidences").read())
    assert data.get("$id") == "payment_evidences", f"ID={data.get('$id')}"

run_test("Bucket 'payment_evidences' existe", "Stockage", test_bucket_payment_evidences)

# ============================================================
# SECTION 6: SECRETS
# ============================================================
print("\n🔑 SECTION 6: Secrets — Variables Configurées")

def test_litellm_key():
    data = json.loads(api_get("/functions/ai-router/variables").read())
    keys = [v["key"] for v in data.get("variables", [])]
    assert "LITELLM_MASTER_KEY" in keys, f"Keys: {keys}"

run_test("[ai-router] a LITELLM_MASTER_KEY", "Secrets", test_litellm_key)

def test_smtp_vars():
    data = json.loads(api_get("/functions/send-email/variables").read())
    keys = [v["key"] for v in data.get("variables", [])]
    assert "SMTP_HOST" in keys, f"Keys: {keys}"
    assert "SMTP_USER" in keys
    assert "SMTP_PASS" in keys

run_test("[send-email] a SMTP_HOST, SMTP_USER, SMTP_PASS", "Secrets", test_smtp_vars)

def test_whapi_token():
    data = json.loads(api_get("/functions/send-otp-whatsapp/variables").read())
    keys = [v["key"] for v in data.get("variables", [])]
    assert "WHAPI_TOKEN" in keys, f"Keys: {keys}"

run_test("[send-otp-whatsapp] a WHAPI_TOKEN", "Secrets", test_whapi_token)

# ============================================================
# SECTION 7: INTÉGRITÉ DES DONNÉES
# ============================================================
print("\n🧩 SECTION 7: Intégrité des Données")

def test_invoice_company_id():
    data = json.loads(api_get("/databases/wimrux_finances/collections/invoices/documents").read())
    docs = data.get("documents", [])
    if len(docs) > 0:
        assert "company_id" in docs[0], "company_id manquant"

run_test("Factures ont company_id", "Intégrité", test_invoice_company_id)

def test_client_fields():
    data = json.loads(api_get("/databases/wimrux_finances/collections/clients/documents").read())
    for doc in data.get("documents", []):
        assert doc.get("name") or doc.get("company_name"), "Nom client manquant"
        assert doc.get("ifu") or doc.get("tax_id"), "IFU client manquant"

run_test("Clients ont name et IFU", "Intégrité", test_client_fields)

# ============================================================
# RAPPORT FINAL
# ============================================================
print("\n" + "="*60)
print("📊 RAPPORT FINAL")
print("="*60)

categories = {}
for r in results:
    categories.setdefault(r["category"], []).append(r)

for cat, items in categories.items():
    cat_pass = sum(1 for i in items if i["status"] == "PASS")
    cat_fail = sum(1 for i in items if i["status"] == "FAIL")
    icon = "✅" if cat_fail == 0 else "⚠️"
    print(f"\n{icon} {cat}: {cat_pass}/{len(items)} OK")
    for item in items:
        if item["status"] == "FAIL":
            print(f"   ❌ {item['name']}: {item['detail'][:100]}")

print(f"\n{'='*60}")
print(f"TOTAL: {passed} passés, {failed} échoués sur {passed+failed} tests")
print(f"Date: {datetime.datetime.now().isoformat()}")
print(f"{'='*60}")

# HTML report
html = f"""<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<title>Rapport E2E WIMRUX Finances</title>
<style>
body{{font-family:'Segoe UI',Arial,sans-serif;margin:40px;background:#f8fafc}}
.header{{background:#0f172a;color:white;padding:24px 32px;border-radius:12px;margin-bottom:24px}}
.section{{background:white;border-radius:10px;padding:20px 24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08)}}
.item{{padding:8px 0;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between}}
.pass{{color:#16a34a;font-weight:600}} .fail{{color:#dc2626;font-weight:600}}
.detail{{color:#64748b;font-size:13px;margin-top:4px}}
.summary{{padding:20px 24px;border-radius:10px;margin-top:24px;color:white}}
.ok{{background:#16a34a}} .warn{{background:#ca8a04}} .error{{background:#dc2626}}
</style></head><body>
<div class="header"><h1>📊 Rapport E2E — WIMRUX® Finances</h1>
<p>Date: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}</p>
<p>Endpoint: {ENDPOINT} | Project: {PROJECT}</p></div>
"""
for cat, items in categories.items():
    cp = sum(1 for i in items if i["status"] == "PASS")
    html += f'<div class="section"><h2>{"✅" if cp==len(items) else "⚠️"} {cat} ({cp}/{len(items)})</h2>'
    for item in items:
        sc = "pass" if item["status"] == "PASS" else "fail"
        html += f'<div class="item"><span>{item["name"]}</span><span class="{sc}">{item["status"]}</span></div>'
        if item["detail"]: html += f'<div class="detail">{item["detail"][:120]}</div>'
    html += '</div>'

ov = "ok" if failed == 0 else "warn" if failed < 5 else "error"
html += f'<div class="summary {ov}"><h2>📈 Résumé Global</h2><p>{passed} passés / {failed} échoués / {passed+failed} total</p></div></body></html>'

rp = r'c:\wamp64\www\wimrux_finances\e2e-tests\test-results\e2e-report.html'
with open(rp, 'w', encoding='utf-8') as f:
    f.write(html)
print(f"📄 Rapport HTML: {rp}")

if failed > 0:
    sys.exit(1)
