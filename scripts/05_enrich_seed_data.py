#!/usr/bin/env python3
"""
Phase 5: Enrichir Appwrite avec des données démo réalistes
"""
import json, ssl, urllib.request, time, random
from datetime import datetime, timedelta

ENDPOINT = "https://appwrite.benga.live/v1"
PROJECT = "6a29285200015cd421c7"
API_KEY = "cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57"
DB_ID = "wimrux_finances"

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

def create_doc(collection, doc_id, data):
    body = {"documentId": doc_id, "data": data}
    return call("POST", f"/databases/{DB_ID}/collections/{collection}/documents", body)

COMPANY_ID = "company-iltic"
USER_ID = "admin-iltic"

def enrich():
    log("=" * 60)
    log("PHASE 5: ENRICHISSEMENT DONNÉES DÉMO")
    log("=" * 60)

    # ── Clients ──────────────────────────────────────────────────────────
    clients = [
        {"id": "client-001", "company_id": COMPANY_ID, "name": "Société Générale Burkina", "ifu": "1234567890123", "email": "sg@example.bf", "phone": "+226 25 30 00 01", "address": "Ouagadougou, Zone du Bois", "country": "BF", "is_active": True, "created_at": "2026-01-15T08:00:00Z"},
        {"id": "client-002", "company_id": COMPANY_ID, "name": "Orange Burkina Faso", "ifu": "2345678901234", "email": "finance@orange.bf", "phone": "+226 25 30 00 02", "address": "Ouagadougou, Avenue de l'Indépendance", "country": "BF", "is_active": True, "created_at": "2026-01-20T08:00:00Z"},
        {"id": "client-003", "company_id": COMPANY_ID, "name": "Ecobank Burkina", "ifu": "3456789012345", "email": "contact@ecobank.bf", "phone": "+226 25 30 00 03", "address": "Ouagadougou, Patte d'Oie", "country": "BF", "is_active": True, "created_at": "2026-02-01T08:00:00Z"},
        {"id": "client-004", "company_id": COMPANY_ID, "name": "CORA Institute", "ifu": "4567890123456", "email": "admin@cora.bf", "phone": "+226 25 30 00 04", "address": "Bobo-Dioulasso, Rue du Commerce", "country": "BF", "is_active": True, "created_at": "2026-02-10T08:00:00Z"},
        {"id": "client-005", "company_id": COMPANY_ID, "name": "Ministère des Finances BF", "ifu": "5678901234567", "email": "finances@gov.bf", "phone": "+226 25 30 00 05", "address": "Ouagadougou, Koulouba", "country": "BF", "is_active": True, "created_at": "2026-03-01T08:00:00Z"},
        {"id": "client-006", "company_id": COMPANY_ID, "name": "SONABEL", "ifu": "6789012345678", "email": "facturation@sonabel.bf", "phone": "+226 25 30 00 06", "address": "Ouagadougou", "country": "BF", "is_active": True, "created_at": "2026-03-15T08:00:00Z"},
        {"id": "client-007", "company_id": COMPANY_ID, "name": "ONATEL SA", "ifu": "7890123456789", "email": "compta@onatel.bf", "phone": "+226 25 30 00 07", "address": "Ouagadougou", "country": "BF", "is_active": True, "created_at": "2026-04-01T08:00:00Z"},
        {"id": "client-008", "company_id": COMPANY_ID, "name": "SOTRACO", "ifu": "8901234567890", "email": "sotraco@bf.net", "phone": "+226 25 30 00 08", "address": "Bobo-Dioulasso", "country": "BF", "is_active": True, "created_at": "2026-04-15T08:00:00Z"},
        {"id": "client-009", "company_id": COMPANY_ID, "name": "BICIAB", "ifu": "9012345678901", "email": "biciab@bank.bf", "phone": "+226 25 30 00 09", "address": "Ouagadougou", "country": "BF", "is_active": True, "created_at": "2026-05-01T08:00:00Z"},
        {"id": "client-010", "company_id": COMPANY_ID, "name": "SOTEMAG", "ifu": "0123456789012", "email": "sotemag@bf.net", "phone": "+226 25 30 00 10", "address": "Koudougou", "country": "BF", "is_active": True, "created_at": "2026-05-15T08:00:00Z"},
    ]
    for c in clients:
        _, err = create_doc("clients", c["id"], c)
        if err: log(f"client {c['id']}: {err.get('message','')}", "WARN")
        time.sleep(0.2)
    log(f"clients: {len(clients)} créés", "OK")

    # ── Suppliers ────────────────────────────────────────────────────────
    suppliers = [
        {"id": "sup-001", "company_id": COMPANY_ID, "name": "Fournitures Bureau BF", "ifu": "1111111111111", "email": "contact@fbb.bf", "phone": "+226 70 11 11 11", "address": "Ouagadougou", "country": "BF", "is_active": True, "created_at": "2026-01-10T08:00:00Z"},
        {"id": "sup-002", "company_id": COMPANY_ID, "name": "Tech Import SA", "ifu": "2222222222222", "email": "sales@techimport.bf", "phone": "+226 70 22 22 22", "address": "Ouagadougou", "country": "BF", "is_active": True, "created_at": "2026-02-05T08:00:00Z"},
        {"id": "sup-003", "company_id": COMPANY_ID, "name": "Électricité du Burkina", "ifu": "3333333333333", "email": "factures@edb.bf", "phone": "+226 25 33 33 33", "address": "Ouagadougou", "country": "BF", "is_active": True, "created_at": "2026-03-10T08:00:00Z"},
        {"id": "sup-004", "company_id": COMPANY_ID, "name": "Sonelgaz BF", "ifu": "4444444444444", "email": "billing@sonelgaz.bf", "phone": "+226 25 44 44 44", "address": "Ouagadougou", "country": "BF", "is_active": True, "created_at": "2026-04-20T08:00:00Z"},
        {"id": "sup-005", "company_id": COMPANY_ID, "name": "Imprimerie Nationale", "ifu": "5555555555555", "email": "commandes@impnat.bf", "phone": "+226 25 55 55 55", "address": "Ouagadougou", "country": "BF", "is_active": True, "created_at": "2026-05-10T08:00:00Z"},
    ]
    for s in suppliers:
        _, err = create_doc("suppliers", s["id"], s)
        if err: log(f"supplier {s['id']}: {err.get('message','')}", "WARN")
        time.sleep(0.2)
    log(f"suppliers: {len(suppliers)} créés", "OK")

    # ── Articles ─────────────────────────────────────────────────────────
    articles = [
        {"id": "art-001", "company_id": COMPANY_ID, "code": "SRV-CONS", "name": "Consulting IT", "description": "Prestation de conseil en informatique", "unit_price": 150000, "unit": "heure", "vat_rate": 18, "is_active": True, "created_at": "2026-01-01T00:00:00Z"},
        {"id": "art-002", "company_id": COMPANY_ID, "code": "SRV-DEV", "name": "Développement logiciel", "description": "Développement sur mesure", "unit_price": 250000, "unit": "jour", "vat_rate": 18, "is_active": True, "created_at": "2026-01-01T00:00:00Z"},
        {"id": "art-003", "company_id": COMPANY_ID, "code": "SRV-SUP", "name": "Support technique", "description": "Assistance technique mensuelle", "unit_price": 75000, "unit": "mois", "vat_rate": 18, "is_active": True, "created_at": "2026-01-01T00:00:00Z"},
        {"id": "art-004", "company_id": COMPANY_ID, "code": "HW-PC", "name": "Ordinateur portable", "description": "PC portable professionnel", "unit_price": 450000, "unit": "unité", "vat_rate": 18, "is_active": True, "created_at": "2026-01-01T00:00:00Z"},
        {"id": "art-005", "company_id": COMPANY_ID, "code": "HW-SRV", "name": "Serveur rack", "description": "Serveur Dell PowerEdge", "unit_price": 1200000, "unit": "unité", "vat_rate": 18, "is_active": True, "created_at": "2026-01-01T00:00:00Z"},
        {"id": "art-006", "company_id": COMPANY_ID, "code": "LIC-OFF", "name": "Licence Microsoft 365", "description": "Abonnement annuel", "unit_price": 85000, "unit": "utilisateur/an", "vat_rate": 18, "is_active": True, "created_at": "2026-01-01T00:00:00Z"},
        {"id": "art-007", "company_id": COMPANY_ID, "code": "NET-INS", "name": "Installation réseau", "description": "Câblage et configuration", "unit_price": 350000, "unit": "forfait", "vat_rate": 18, "is_active": True, "created_at": "2026-01-01T00:00:00Z"},
        {"id": "art-008", "company_id": COMPANY_ID, "code": "FOM-FOR", "name": "Formation utilisateurs", "description": "Session de formation", "unit_price": 125000, "unit": "session", "vat_rate": 18, "is_active": True, "created_at": "2026-01-01T00:00:00Z"},
        {"id": "art-009", "company_id": COMPANY_ID, "code": "CLO-HST", "name": "Hébergement cloud", "description": "Hébergement VPS mensuel", "unit_price": 45000, "unit": "mois", "vat_rate": 18, "is_active": True, "created_at": "2026-01-01T00:00:00Z"},
        {"id": "art-010", "company_id": COMPANY_ID, "code": "SEC-AUD", "name": "Audit sécurité", "description": "Audit de sécurité informatique", "unit_price": 500000, "unit": "forfait", "vat_rate": 18, "is_active": True, "created_at": "2026-01-01T00:00:00Z"},
    ]
    for a in articles:
        _, err = create_doc("articles", a["id"], a)
        if err: log(f"article {a['id']}: {err.get('message','')}", "WARN")
        time.sleep(0.2)
    log(f"articles: {len(articles)} créés", "OK")

    # ── Bank Accounts ────────────────────────────────────────────────────
    banks = [
        {"id": "bank-001", "company_id": COMPANY_ID, "name": "Compte Principal Ecobank", "bank_name": "Ecobank", "account_number": "001234567890", "iban": "BF12345678901234567890", "currency": "XOF", "is_active": True, "created_at": "2026-01-01T00:00:00Z"},
        {"id": "bank-002", "company_id": COMPANY_ID, "name": "Compte Orabank", "bank_name": "Orabank", "account_number": "009876543210", "iban": "BF09876543210987654321", "currency": "XOF", "is_active": True, "created_at": "2026-01-01T00:00:00Z"},
        {"id": "bank-003", "company_id": COMPANY_ID, "name": "Compte Coris Bank", "bank_name": "Coris Bank", "account_number": "005678901234", "iban": "BF05678901234567890123", "currency": "XOF", "is_active": True, "created_at": "2026-01-01T00:00:00Z"},
    ]
    for b in banks:
        _, err = create_doc("bank_accounts", b["id"], b)
        if err: log(f"bank {b['id']}: {err.get('message','')}", "WARN")
        time.sleep(0.2)
    log(f"bank_accounts: {len(banks)} créés", "OK")

    # ── Treasury Accounts ────────────────────────────────────────────────
    treasuries = [
        {"id": "treas-001", "company_id": COMPANY_ID, "name": "Caisse principale", "type": "cash", "currency": "XOF", "balance": 500000, "is_active": True, "created_at": "2026-01-01T00:00:00Z"},
        {"id": "treas-002", "company_id": COMPANY_ID, "name": "Compte Wave", "type": "mobile_money", "currency": "XOF", "balance": 250000, "is_active": True, "created_at": "2026-01-01T00:00:00Z"},
    ]
    for t in treasuries:
        _, err = create_doc("treasury_accounts", t["id"], t)
        if err: log(f"treasury {t['id']}: {err.get('message','')}", "WARN")
        time.sleep(0.2)
    log(f"treasury_accounts: {len(treasuries)} créés", "OK")

    # ── Transaction Categories ─────────────────────────────────────────
    categories = [
        {"id": "cat-001", "company_id": COMPANY_ID, "name": "Revenus services", "type": "income", "is_active": True, "created_at": "2026-01-01T00:00:00Z"},
        {"id": "cat-002", "company_id": COMPANY_ID, "name": "Ventes matériel", "type": "income", "is_active": True, "created_at": "2026-01-01T00:00:00Z"},
        {"id": "cat-003", "company_id": COMPANY_ID, "name": "Salaires", "type": "expense", "is_active": True, "created_at": "2026-01-01T00:00:00Z"},
        {"id": "cat-004", "company_id": COMPANY_ID, "name": "Loyer", "type": "expense", "is_active": True, "created_at": "2026-01-01T00:00:00Z"},
        {"id": "cat-005", "company_id": COMPANY_ID, "name": "Fournitures bureau", "type": "expense", "is_active": True, "created_at": "2026-01-01T00:00:00Z"},
        {"id": "cat-006", "company_id": COMPANY_ID, "name": "Transports", "type": "expense", "is_active": True, "created_at": "2026-01-01T00:00:00Z"},
        {"id": "cat-007", "company_id": COMPANY_ID, "name": "Services publics", "type": "expense", "is_active": True, "created_at": "2026-01-01T00:00:00Z"},
        {"id": "cat-008", "company_id": COMPANY_ID, "name": "Marketing", "type": "expense", "is_active": True, "created_at": "2026-01-01T00:00:00Z"},
        {"id": "cat-009", "company_id": COMPANY_ID, "name": "Impôts et taxes", "type": "expense", "is_active": True, "created_at": "2026-01-01T00:00:00Z"},
        {"id": "cat-010", "company_id": COMPANY_ID, "name": "Autres charges", "type": "expense", "is_active": True, "created_at": "2026-01-01T00:00:00Z"},
    ]
    for c in categories:
        _, err = create_doc("transaction_categories", c["id"], c)
        if err: log(f"category {c['id']}: {err.get('message','')}", "WARN")
        time.sleep(0.2)
    log(f"transaction_categories: {len(categories)} créés", "OK")

    # ── Invoices ─────────────────────────────────────────────────────────
    # Generate 20 invoices across 6 months
    invoice_statuses = ["draft", "sent", "paid", "overdue", "cancelled"]
    client_ids = [c["id"] for c in clients]
    invoices_created = 0
    for i in range(20):
        inv_id = f"inv-{i+1:03d}"
        client_id = random.choice(client_ids)
        base_date = datetime(2026, 1, 1) + timedelta(days=random.randint(0, 180))
        due_date = base_date + timedelta(days=random.choice([15, 30, 45, 60]))
        status = random.choices(invoice_statuses, weights=[10, 30, 40, 15, 5])[0]
        total_ht = random.randint(50000, 2000000)
        vat_amount = round(total_ht * 0.18)
        total_ttc = total_ht + vat_amount

        inv = {
            "id": inv_id,
            "company_id": COMPANY_ID,
            "client_id": client_id,
            "reference": f"F-2026-{i+1:04d}",
            "due_date": due_date.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "total_ht": total_ht,
            "total_tva": vat_amount,
            "type": "ST",
            "total_ttc": total_ttc,
            "paid_amount": total_ttc if status == "paid" else (random.randint(0, total_ttc) if status == "overdue" else 0),
            "status": status,
            "direction": "issued",
        }
        _, err = create_doc("invoices", inv["id"], inv)
        if err:
            log(f"invoice {inv['id']}: {err.get('message','')}", "WARN")
        else:
            invoices_created += 1

        # Create 1-3 invoice items per invoice
        num_items = random.randint(1, 3)
        for j in range(num_items):
            art = random.choice(articles)
            qty = random.randint(1, 10)
            unit_price = art["unit_price"]
            item_total = qty * unit_price
            item = {
                "id": f"item-v2-{i+1:03d}-{j+1}",
                "invoice_id": inv_id,
                "company_id": COMPANY_ID,
                "name": art["name"],
                "type": "service",
                "price": unit_price,
                "quantity": qty,
                "tax_group": "S",
                "amount_ht": item_total,
                "amount_tva": round(item_total * 0.18),
                "amount_ttc": round(item_total * 1.18),
            }
            _, err = create_doc("invoice_items", item["id"], item)
            if err: log(f"item {item['id']}: {err.get('message','')}", "WARN")
            time.sleep(0.1)

        # Create payment for paid invoices
        if status == "paid":
            pay = {
                "id": f"pay-v2-{i+1:03d}",
                "invoice_id": inv_id,
                "company_id": COMPANY_ID,
                "amount": total_ttc,
                "payment_date": (base_date + timedelta(days=random.randint(1, 14))).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "payment_method": random.choice(["bank_transfer", "cash", "mobile_money", "check"]),
                "reference": f"PAY-{i+1:04d}",
            }
            _, err = create_doc("invoice_payments", pay["id"], pay)
            if err: log(f"payment {pay['id']}: {err.get('message','')}", "WARN")
            time.sleep(0.1)

        time.sleep(0.2)

    log(f"invoices: {invoices_created} créés avec items et payments", "OK")

    # ── Tax Payments ───────────────────────────────────────────────────
    taxes = [
        {"id": "tax-001", "company_id": COMPANY_ID, "payment_type": "TVA", "amount": 250000, "payment_date": "2026-01-20T00:00:00Z", "fiscal_period": "2025-12", "reference": "TVA-DEC-2025", "status": "paid"},
        {"id": "tax-002", "company_id": COMPANY_ID, "payment_type": "IS", "amount": 1500000, "payment_date": "2026-03-31T00:00:00Z", "fiscal_period": "2025", "reference": "IS-2025", "status": "paid"},
        {"id": "tax-003", "company_id": COMPANY_ID, "payment_type": "TVA", "amount": 320000, "payment_date": "2026-04-20T00:00:00Z", "fiscal_period": "2026-03", "reference": "TVA-MAR-2026", "status": "paid"},
    ]
    for t in taxes:
        _, err = create_doc("tax_payments", t["id"], t)
        if err: log(f"tax {t['id']}: {err.get('message','')}", "WARN")
        time.sleep(0.2)
    log(f"tax_payments: {len(taxes)} créés", "OK")

    log("\n✅ Phase 5 terminée — données démo enrichies")

if __name__ == "__main__":
    enrich()
