#!/usr/bin/env python3
"""
Phase 8: Déployer toutes les edge functions depuis edge_functions/ vers Appwrite
"""
import json, ssl, urllib.request, os, subprocess, tempfile, shutil

ENDPOINT = "https://appwrite.benga.live/v1"
PROJECT = "6a29285200015cd421c7"
API_KEY = "cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57"
APPWRITE_CLI = r"C:\nvm4w\nodejs\appwrite.cmd"
EDGE_FUNCTIONS_DIR = r"c:\wamp64\www\wimrux_finances\edge_functions"

ctx = ssl._create_unverified_context()
headers = {
    "X-Appwrite-Project": PROJECT,
    "X-Appwrite-Key": API_KEY
}

def get_functions():
    all_funcs = {}
    last_id = None
    for i in range(5):
        url = ENDPOINT + "/functions?limit=25"
        if last_id:
            url += f"&cursorAfter={last_id}"
        req = urllib.request.Request(url, headers=headers)
        resp = json.loads(urllib.request.urlopen(req, context=ctx).read())
        funcs = resp.get("functions", [])
        if not funcs:
            break
        for f in funcs:
            all_funcs[f["$id"]] = f
        last_id = funcs[-1]["$id"]
        if len(funcs) < 25:
            break
    return all_funcs

def deploy_function(func_id, code_dir):
    cmd = [
        APPWRITE_CLI, "functions", "create-deployment",
        "--function-id", func_id,
        "--code", code_dir,
        "--activate", "true",
        "--entrypoint", "index.js"
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode == 0:
            return True, None
        else:
            err = result.stderr or result.stdout
            return False, err[:500]
    except Exception as e:
        return False, str(e)[:500]

def main():
    print("=" * 60)
    print("PHASE 8: DÉPLOIEMENT DE TOUTES LES EDGE FUNCTIONS")
    print("=" * 60)

    # Get existing functions
    appwrite_funcs = get_functions()
    print(f"\nFonctions Appwrite existantes: {len(appwrite_funcs)}")

    # Scan local edge_functions directory
    local_dirs = {}
    for item in os.listdir(EDGE_FUNCTIONS_DIR):
        item_path = os.path.join(EDGE_FUNCTIONS_DIR, item)
        if os.path.isdir(item_path) and os.path.exists(os.path.join(item_path, "index.js")):
            local_dirs[item] = item_path

    print(f"Fonctions locales prêtes: {len(local_dirs)}\n")

    deployed = 0
    skipped = 0
    errors = 0

    for func_id, code_dir in local_dirs.items():
        if func_id not in appwrite_funcs:
            print(f"  SKIP {func_id}: fonction non créée côté Appwrite")
            skipped += 1
            continue

        print(f"  DEPLOY {func_id} ...", end=" ")
        ok, err = deploy_function(func_id, code_dir)
        if ok:
            print("OK")
            deployed += 1
        else:
            print(f"ERROR: {err}")
            errors += 1

    print(f"\n{'=' * 60}")
    print(f"RÉSULTAT: {deployed} déployées, {skipped} ignorées, {errors} erreurs")
    print("=" * 60)

if __name__ == "__main__":
    main()
