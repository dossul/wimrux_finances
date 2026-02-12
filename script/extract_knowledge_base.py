#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WIMRUX® FINANCES - Extracteur de Base de Connaissances
======================================================
Ce script lit tous les PDF du dossier docs/, extrait leur contenu textuel,
les classe par catégorie (réglementaire, technique, cahier des charges),
et génère une base de connaissances complète en Markdown.

Usage:
    python extract_knowledge_base.py
"""

import os
import re
import sys
import json
import hashlib
from pathlib import Path
from datetime import datetime

try:
    import pdfplumber
except ImportError:
    print("ERREUR: pdfplumber non installé. Lancez: pip install -r requirements.txt")
    sys.exit(1)

try:
    import fitz  # PyMuPDF
    import pytesseract
    from PIL import Image
    import io
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    print("AVERTISSEMENT: PyMuPDF/pytesseract non installés. OCR désactivé.")
    print("Pour activer l'OCR: pip install PyMuPDF pytesseract")


# ============================================================================
# CONFIGURATION
# ============================================================================

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = SCRIPT_DIR.parent
DOCS_DIR = PROJECT_DIR / "docs"
OUTPUT_DIR = PROJECT_DIR / "knowledge_base"

# Catégorisation automatique des PDFs par mots-clés dans le nom de fichier
CATEGORIES = {
    "01_reglementation_dgi": {
        "title": "Réglementation DGI - Cadre Légal",
        "description": "Textes officiels de la Direction Générale des Impôts du Burkina Faso",
        "keywords": ["ARRETE", "COMMUNIQUE", "MISE-EN-PLACE", "PROCEDURES", "CODE-GENERAL"],
    },
    "02_specifications_techniques": {
        "title": "Spécifications Techniques SECeF / SFE",
        "description": "Spécifications techniques des systèmes de facturation électronique certifiée",
        "keywords": ["SPECIFICATIONS-TECHNIQUES"],
    },
    "03_cahier_des_charges": {
        "title": "Cahier des Charges WIMRUX® FINANCES",
        "description": "Documents internes de conception et spécifications du projet",
        "keywords": ["Cahier", "Document Technique", "Développement", "plateforme"],
    },
}


def classify_pdf(filename: str) -> str:
    """Classe un PDF dans une catégorie selon son nom de fichier."""
    for cat_key, cat_info in CATEGORIES.items():
        for keyword in cat_info["keywords"]:
            if keyword.lower() in filename.lower():
                return cat_key
    return "04_autres_documents"


def ocr_extract_text(pdf_path: Path) -> list:
    """Utilise OCR (Tesseract + PyMuPDF) pour extraire le texte d'un PDF scanné."""
    ocr_pages = []
    try:
        doc = fitz.open(str(pdf_path))
        total = len(doc)
        for i, page in enumerate(doc):
            # Rendre la page en image haute résolution
            mat = fitz.Matrix(3.0, 3.0)  # 3x zoom ~= 216 dpi
            pix = page.get_pixmap(matrix=mat)
            img_bytes = pix.tobytes("png")
            image = Image.open(io.BytesIO(img_bytes))
            text = pytesseract.image_to_string(image, lang="fra+eng")
            ocr_pages.append({
                "page_number": i + 1,
                "text": text.strip() if text else "",
                "tables": [],
                "ocr": True,
            })
            print(f"    OCR page {i + 1}/{total}: {len(text.strip())} caractères")
        doc.close()
    except Exception as e:
        print(f"    [OCR ERREUR] {e}")
    return ocr_pages


def extract_text_from_pdf(pdf_path: Path) -> dict:
    """Extrait le texte et les métadonnées d'un fichier PDF.
    Si pdfplumber ne trouve pas de texte (PDF scanné), bascule sur OCR."""
    result = {
        "filename": pdf_path.name,
        "filepath": str(pdf_path),
        "size_bytes": pdf_path.stat().st_size,
        "pages": [],
        "total_pages": 0,
        "tables": [],
        "full_text": "",
        "extraction_method": "pdfplumber",
        "extraction_status": "success",
        "error": None,
    }

    try:
        with pdfplumber.open(pdf_path) as pdf:
            result["total_pages"] = len(pdf.pages)

            for i, page in enumerate(pdf.pages):
                page_data = {
                    "page_number": i + 1,
                    "text": "",
                    "tables": [],
                    "ocr": False,
                }

                # Extraire le texte
                text = page.extract_text()
                if text:
                    page_data["text"] = text.strip()

                # Extraire les tableaux
                tables = page.extract_tables()
                if tables:
                    for table in tables:
                        cleaned_table = []
                        for row in table:
                            cleaned_row = [
                                cell.strip() if cell else "" for cell in row
                            ]
                            cleaned_table.append(cleaned_row)
                        page_data["tables"].append(cleaned_table)
                        result["tables"].append(
                            {"page": i + 1, "data": cleaned_table}
                        )

                result["pages"].append(page_data)

            # Vérifier si du texte a été extrait
            total_text = "".join(p["text"] for p in result["pages"])

            # Si peu ou pas de texte extrait -> PDF scanné, basculer sur OCR
            if len(total_text.strip()) < 50 and OCR_AVAILABLE:
                print(f"  ⚠️  Texte insuffisant ({len(total_text.strip())} car.) -> Bascule OCR...")
                result["extraction_method"] = "ocr_tesseract"
                ocr_pages = ocr_extract_text(pdf_path)
                if ocr_pages:
                    result["pages"] = ocr_pages
                    result["total_pages"] = len(ocr_pages)

            # Texte complet concaténé
            result["full_text"] = "\n\n".join(
                p["text"] for p in result["pages"] if p["text"]
            )

    except Exception as e:
        result["extraction_status"] = "error"
        result["error"] = str(e)
        print(f"  [ERREUR] {pdf_path.name}: {e}")

    return result


def generate_document_summary(doc: dict) -> str:
    """Génère un résumé court d'un document basé sur ses premiers paragraphes."""
    text = doc["full_text"][:2000]
    # Prendre les premières lignes significatives
    lines = [l.strip() for l in text.split("\n") if l.strip() and len(l.strip()) > 10]
    summary_lines = lines[:5]
    return "\n".join(summary_lines) if summary_lines else "(Contenu non extractible)"


def compute_file_hash(filepath: Path) -> str:
    """Calcule le hash MD5 d'un fichier pour le suivi des versions."""
    hasher = hashlib.md5()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def format_table_as_markdown(table: list) -> str:
    """Convertit un tableau extrait en format Markdown."""
    if not table or len(table) < 1:
        return ""

    md_lines = []
    # Header
    header = table[0]
    md_lines.append("| " + " | ".join(str(c) for c in header) + " |")
    md_lines.append("| " + " | ".join("---" for _ in header) + " |")
    # Rows
    for row in table[1:]:
        # Aligner le nombre de colonnes
        padded = row + [""] * (len(header) - len(row))
        md_lines.append("| " + " | ".join(str(c) for c in padded[:len(header)]) + " |")

    return "\n".join(md_lines)


def sanitize_filename(name: str) -> str:
    """Nettoie un nom de fichier pour en faire un nom de fichier Markdown valide."""
    name = name.replace(".pdf", "").replace(".PDF", "")
    name = re.sub(r"[^\w\s\-àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ]", "_", name)
    name = re.sub(r"_+", "_", name).strip("_")
    return name[:100]


def write_document_markdown(doc: dict, output_path: Path):
    """Écrit le contenu extrait d'un document en fichier Markdown."""
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(f"# {doc['filename']}\n\n")
        f.write(f"- **Fichier source:** `{doc['filename']}`\n")
        f.write(f"- **Taille:** {doc['size_bytes'] / 1024:.1f} Ko\n")
        f.write(f"- **Pages:** {doc['total_pages']}\n")
        f.write(f"- **Statut extraction:** {doc['extraction_status']}\n")
        f.write(f"- **Hash MD5:** `{doc.get('hash', 'N/A')}`\n")
        f.write(f"- **Date extraction:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write("---\n\n")

        if doc["extraction_status"] == "error":
            f.write(f"> **ERREUR D'EXTRACTION:** {doc['error']}\n\n")
            return

        # Contenu page par page
        for page in doc["pages"]:
            f.write(f"## Page {page['page_number']}\n\n")

            if page["text"]:
                f.write(page["text"])
                f.write("\n\n")

            if page["tables"]:
                for j, table in enumerate(page["tables"]):
                    f.write(f"### Tableau {j + 1} (Page {page['page_number']})\n\n")
                    f.write(format_table_as_markdown(table))
                    f.write("\n\n")

            f.write("---\n\n")


def write_index(categories_data: dict, all_docs: list, output_dir: Path):
    """Génère le fichier INDEX principal de la base de connaissances."""
    index_path = output_dir / "INDEX.md"

    with open(index_path, "w", encoding="utf-8") as f:
        f.write("# 📚 WIMRUX® FINANCES - Base de Connaissances Intégrale\n\n")
        f.write(f"**Date de génération:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"**Nombre total de documents:** {len(all_docs)}\n")
        total_pages = sum(d["total_pages"] for d in all_docs)
        f.write(f"**Nombre total de pages traitées:** {total_pages}\n")
        success = sum(1 for d in all_docs if d["extraction_status"] == "success")
        errors = len(all_docs) - success
        f.write(f"**Extractions réussies:** {success} | **Erreurs:** {errors}\n\n")
        f.write("---\n\n")

        f.write("## Table des Matières\n\n")

        for cat_key in sorted(categories_data.keys()):
            cat = categories_data[cat_key]
            f.write(f"### {cat['title']}\n\n")
            f.write(f"*{cat['description']}*\n\n")

            if cat["documents"]:
                for doc in cat["documents"]:
                    safe_name = sanitize_filename(doc["filename"])
                    rel_path = f"{cat_key}/{safe_name}.md"
                    status_icon = "✅" if doc["extraction_status"] == "success" else "❌"
                    f.write(
                        f"- {status_icon} [{doc['filename']}]({rel_path}) "
                        f"— {doc['total_pages']} pages, {doc['size_bytes'] / 1024:.0f} Ko\n"
                    )
                f.write("\n")
            else:
                f.write("*(Aucun document dans cette catégorie)*\n\n")

        # Section résumé des points clés extraits
        f.write("---\n\n")
        f.write("## Résumé Exécutif par Document\n\n")

        for doc in all_docs:
            f.write(f"### {doc['filename']}\n\n")
            summary = generate_document_summary(doc)
            f.write(f"```\n{summary}\n```\n\n")

    print(f"  [INDEX] {index_path}")


def write_synthesis(all_docs: list, output_dir: Path):
    """Génère un fichier de synthèse thématique pour le développement."""
    synth_path = output_dir / "SYNTHESE_DEVELOPPEMENT.md"

    with open(synth_path, "w", encoding="utf-8") as f:
        f.write("# 🏗️ SYNTHÈSE POUR LE DÉVELOPPEMENT - WIMRUX® FINANCES\n\n")
        f.write(f"**Généré le:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write("Ce document synthétise les exigences extraites de tous les PDFs réglementaires\n")
        f.write("et techniques pour guider le développement à 100%.\n\n")
        f.write("---\n\n")

        # Section 1: Exigences réglementaires
        f.write("## 1. Exigences Réglementaires DGI\n\n")
        f.write("### Sources réglementaires traitées:\n\n")
        for doc in all_docs:
            cat = classify_pdf(doc["filename"])
            if cat == "01_reglementation_dgi":
                f.write(f"- **{doc['filename']}** ({doc['total_pages']} pages)\n")
        f.write("\n")

        f.write("### Points Critiques (à vérifier dans chaque document):\n\n")
        f.write("- [ ] Conditions d'édition de la facture normalisée\n")
        f.write("- [ ] Éléments de sécurité obligatoires sur la facture\n")
        f.write("- [ ] Procédures d'homologation SFE\n")
        f.write("- [ ] Spécifications du MCF (Module de Contrôle de Facturation)\n")
        f.write("- [ ] Format et contenu du Code SECeF\n")
        f.write("- [ ] Exigences de la signature électronique\n")
        f.write("- [ ] Règles du mode dégradé (bufferisation)\n")
        f.write("- [ ] Format du Z-Report (rapport de clôture journalière)\n")
        f.write("- [ ] Exigences de la piste d'audit\n")
        f.write("- [ ] Conditions de commercialisation de la FEC\n")
        f.write("- [ ] Documents tenant lieu de FEC\n\n")

        # Section 2: Spécifications techniques
        f.write("## 2. Spécifications Techniques\n\n")
        f.write("### Sources techniques traitées:\n\n")
        for doc in all_docs:
            cat = classify_pdf(doc["filename"])
            if cat == "02_specifications_techniques":
                f.write(f"- **{doc['filename']}** ({doc['total_pages']} pages)\n")
        f.write("\n")

        f.write("### Éléments Techniques Clés:\n\n")
        f.write("- [ ] Protocole de communication SFE ↔ MCF\n")
        f.write("- [ ] Format des données échangées (XML/JSON)\n")
        f.write("- [ ] Algorithmes de chiffrement requis\n")
        f.write("- [ ] Format du QR Code de sécurité\n")
        f.write("- [ ] Spécifications de la signature électronique\n")
        f.write("- [ ] Séquençage des numéros de facture\n")
        f.write("- [ ] Compteurs MCF (horaire, séquentiel)\n")
        f.write("- [ ] Exigences de performance (latence < 3s)\n")
        f.write("- [ ] Spécifications du mode RS232 / API\n\n")

        # Section 3: Cahier des charges
        f.write("## 3. Exigences Projet WIMRUX® FINANCES\n\n")
        f.write("### Sources projet traitées:\n\n")
        for doc in all_docs:
            cat = classify_pdf(doc["filename"])
            if cat == "03_cahier_des_charges":
                f.write(f"- **{doc['filename']}** ({doc['total_pages']} pages)\n")
        f.write("\n")

        f.write("### Modules à Développer:\n\n")
        f.write("- [ ] **Auth & RBAC** — Authentification, rôles (Admin, Caissier, Auditeur)\n")
        f.write("- [ ] **Facturation** — Création, validation, certification MCF (FV, FA, FT, EV)\n")
        f.write("- [ ] **Driver SFE-MCF** — Communication avec le MCF (RS232/API)\n")
        f.write("- [ ] **PDF Generator** — Génération PDF avec QR Code, bloc sécurité, NIM\n")
        f.write("- [ ] **Trésorerie** — Multi-comptes (Banque, Caisse, Mobile Money)\n")
        f.write("- [ ] **Taxes** — Groupes de taxation A-P, calcul TVA\n")
        f.write("- [ ] **Z-Report** — Clôture journalière, totalisation, archivage\n")
        f.write("- [ ] **Audit Log** — Piste d'audit inaltérable, triggers PostgreSQL\n")
        f.write("- [ ] **Rapports** — Bilan, compte de résultat, balance âgée\n")
        f.write("- [ ] **Gestion Clients** — IFU, validation, API DGI\n")
        f.write("- [ ] **Mode Dégradé** — File d'attente sécurisée si MCF inaccessible\n")
        f.write("- [ ] **Chiffrement** — AES-256 CBC pour données sensibles\n")
        f.write("- [ ] **IA / Assistant** — Analyse prédictive, NLP\n")
        f.write("- [ ] **Multi-entreprise** — Isolation données, sélecteur entreprise\n\n")

        # Section 4: Stack technique
        f.write("## 4. Stack Technique Confirmée\n\n")
        f.write("| Composant | Technologie |\n")
        f.write("| --- | --- |\n")
        f.write("| Frontend | React 18+ avec TypeScript, Tailwind CSS 3.4 |\n")
        f.write("| Backend | Python (Django/FastAPI) |\n")
        f.write("| Base de données | PostgreSQL (ACID, Supabase compatible) |\n")
        f.write("| Chiffrement | AES-256 CBC |\n")
        f.write("| Auth | OAuth 2.0, RBAC |\n")
        f.write("| PDF | Génération avec QR Code |\n")
        f.write("| Communication MCF | RS232 / API REST |\n\n")

        # Section 5: Roadmap
        f.write("## 5. Roadmap Critique\n\n")
        f.write("| Phase | Période | Livrables |\n")
        f.write("| --- | --- | --- |\n")
        f.write("| Socle & BDD | Février 2026 | Architecture PostgreSQL, Auth, Rôles |\n")
        f.write("| Driver MCF | Mars 2026 | Pont RS232/API, simulateur MCF, chiffrement |\n")
        f.write("| Facturation | Avril 2026 | UI saisie, PDF fiscal, QR Code, Avoirs |\n")
        f.write("| Tests & Audit | Mai 2026 | Tests charge, Z-Reports, dossier DGI |\n")
        f.write("| Homologation | Juin 2026 | Dépôt DGI, démo, déploiement pilote |\n")
        f.write("| **DEADLINE** | **1er Juillet 2026** | **Production homologuée** |\n\n")

        f.write("---\n\n")
        f.write("## 6. Contenu Intégral Extrait\n\n")
        f.write("Consultez les fichiers Markdown individuels dans les sous-dossiers\n")
        f.write("de `knowledge_base/` pour le contenu complet de chaque document.\n")

    print(f"  [SYNTHÈSE] {synth_path}")


def write_json_database(all_docs: list, output_dir: Path):
    """Exporte la base de connaissances en format JSON structuré."""
    db_path = output_dir / "knowledge_base.json"

    db = {
        "project": "WIMRUX® FINANCES",
        "version": "1.0",
        "generated_at": datetime.now().isoformat(),
        "total_documents": len(all_docs),
        "total_pages": sum(d["total_pages"] for d in all_docs),
        "documents": [],
    }

    for doc in all_docs:
        entry = {
            "filename": doc["filename"],
            "category": classify_pdf(doc["filename"]),
            "total_pages": doc["total_pages"],
            "size_bytes": doc["size_bytes"],
            "hash_md5": doc.get("hash", ""),
            "extraction_status": doc["extraction_status"],
            "content_preview": doc["full_text"][:500] if doc["full_text"] else "",
            "tables_count": len(doc["tables"]),
        }
        db["documents"].append(entry)

    with open(db_path, "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=2)

    print(f"  [JSON] {db_path}")


# ============================================================================
# MAIN
# ============================================================================

def main():
    print("=" * 70)
    print("  WIMRUX® FINANCES - Extracteur de Base de Connaissances")
    print("=" * 70)
    print()

    # Vérifier le dossier docs
    if not DOCS_DIR.exists():
        print(f"ERREUR: Le dossier docs/ est introuvable: {DOCS_DIR}")
        sys.exit(1)

    # Lister les PDFs
    pdf_files = sorted(DOCS_DIR.glob("*.pdf")) + sorted(DOCS_DIR.glob("*.PDF"))
    if not pdf_files:
        print("ERREUR: Aucun fichier PDF trouvé dans docs/")
        sys.exit(1)

    print(f"📂 Dossier source: {DOCS_DIR}")
    print(f"📄 {len(pdf_files)} fichiers PDF détectés")
    print(f"📁 Dossier de sortie: {OUTPUT_DIR}")
    print()

    # Créer la structure de sortie
    OUTPUT_DIR.mkdir(exist_ok=True)
    for cat_key in CATEGORIES:
        (OUTPUT_DIR / cat_key).mkdir(exist_ok=True)
    (OUTPUT_DIR / "04_autres_documents").mkdir(exist_ok=True)

    # Préparer les données par catégorie
    categories_data = {}
    for cat_key, cat_info in CATEGORIES.items():
        categories_data[cat_key] = {
            "title": cat_info["title"],
            "description": cat_info["description"],
            "documents": [],
        }
    categories_data["04_autres_documents"] = {
        "title": "Autres Documents",
        "description": "Documents non classés automatiquement",
        "documents": [],
    }

    all_docs = []

    # Extraction
    print("-" * 70)
    print("EXTRACTION EN COURS...")
    print("-" * 70)

    for i, pdf_path in enumerate(pdf_files, 1):
        print(f"\n[{i}/{len(pdf_files)}] {pdf_path.name}")
        print(f"  Taille: {pdf_path.stat().st_size / 1024:.1f} Ko")

        # Hash du fichier
        file_hash = compute_file_hash(pdf_path)
        print(f"  Hash MD5: {file_hash}")

        # Extraction
        doc = extract_text_from_pdf(pdf_path)
        doc["hash"] = file_hash

        if doc["extraction_status"] == "success":
            method = doc.get("extraction_method", "pdfplumber")
            method_label = "(OCR)" if method == "ocr_tesseract" else "(texte natif)"
            print(f"  ✅ {doc['total_pages']} pages extraites {method_label}, {len(doc['tables'])} tableaux détectés")
            chars = len(doc["full_text"])
            print(f"  📝 {chars} caractères de texte extraits")
        else:
            print(f"  ❌ Erreur: {doc['error']}")

        # Classifier et sauvegarder
        category = classify_pdf(doc["filename"])
        print(f"  📂 Catégorie: {category}")

        safe_name = sanitize_filename(doc["filename"])
        output_path = OUTPUT_DIR / category / f"{safe_name}.md"
        write_document_markdown(doc, output_path)
        print(f"  💾 Sauvegardé: {output_path.name}")

        categories_data[category]["documents"].append(doc)
        all_docs.append(doc)

    # Générer les fichiers de synthèse
    print("\n" + "-" * 70)
    print("GÉNÉRATION DES FICHIERS DE SYNTHÈSE...")
    print("-" * 70)

    write_index(categories_data, all_docs, OUTPUT_DIR)
    write_synthesis(all_docs, OUTPUT_DIR)
    write_json_database(all_docs, OUTPUT_DIR)

    # Rapport final
    print("\n" + "=" * 70)
    print("  EXTRACTION TERMINÉE")
    print("=" * 70)
    total_pages = sum(d["total_pages"] for d in all_docs)
    total_chars = sum(len(d["full_text"]) for d in all_docs)
    total_tables = sum(len(d["tables"]) for d in all_docs)
    success = sum(1 for d in all_docs if d["extraction_status"] == "success")

    print(f"\n  📄 Documents traités: {len(all_docs)}")
    print(f"  📃 Pages totales: {total_pages}")
    print(f"  📝 Caractères extraits: {total_chars:,}")
    print(f"  📊 Tableaux détectés: {total_tables}")
    print(f"  ✅ Réussites: {success}")
    print(f"  ❌ Erreurs: {len(all_docs) - success}")
    print(f"\n  📁 Base de connaissances: {OUTPUT_DIR}")
    print(f"     ├── INDEX.md")
    print(f"     ├── SYNTHESE_DEVELOPPEMENT.md")
    print(f"     ├── knowledge_base.json")

    for cat_key in sorted(categories_data.keys()):
        count = len(categories_data[cat_key]["documents"])
        if count > 0:
            print(f"     ├── {cat_key}/ ({count} documents)")

    print()


if __name__ == "__main__":
    main()
