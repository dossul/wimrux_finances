#!/usr/bin/env python3
"""Configure SMTP secrets and test email sending"""
import json, ssl, urllib.request

ENDPOINT = "https://appwrite.benga.live/v1"
API_KEY = "cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57"
headers = {
    "Content-Type": "application/json",
    "X-Appwrite-Project": "6a29285200015cd421c7",
    "X-Appwrite-Key": API_KEY,
}
ctx = ssl._create_unverified_context()

def set_var(func_id, key, value):
    body = json.dumps({"key": key, "value": value}).encode()
    req = urllib.request.Request(f"{ENDPOINT}/functions/{func_id}/variables", data=body, headers=headers, method="POST")
    try:
        urllib.request.urlopen(req, context=ctx)
        print(f"  CREATED {func_id}/{key}")
        return True
    except urllib.error.HTTPError as e:
        if e.code == 409:
            req2 = urllib.request.Request(f"{ENDPOINT}/functions/{func_id}/variables/{key}", data=body, headers=headers, method="PUT")
            try:
                urllib.request.urlopen(req2, context=ctx)
                print(f"  UPDATED {func_id}/{key}")
                return True
            except Exception as e2:
                print(f"  ERROR updating {func_id}/{key}: {e2}")
                return False
        else:
            print(f"  ERROR setting {func_id}/{key}: HTTP {e.code}")
            return False

# SMTP config
SMTP_CONFIG = {
    "SMTP_HOST": "vmi2335626.contaboserver.net",
    "SMTP_PORT": "465",
    "SMTP_USER": "noreply@wimrux.app",
    "SMTP_PASS": "TkLt_GNOIMmKPys",
    "FROM_EMAIL": "noreply@wimrux.app",
    "FROM_NAME": "WIMRUX FINANCES",
}

print("Configuring send-email secrets...")
for key, value in SMTP_CONFIG.items():
    set_var("send-email", key, value)

# Also set APPWRITE_KEY for send-email so it can use admin API if needed
print("\nConfiguring APPWRITE_KEY for send-email...")
set_var("send-email", "APPWRITE_KEY", API_KEY)

print("\nDone.")
