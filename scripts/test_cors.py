#!/usr/bin/env python3
"""Tester les headers CORS retournes par Appwrite"""
import requests

URL = "https://appwrite.benga.live/v1/health"
ORIGIN = "https://wimruxapp.vercel.app"

print(f"=== Test CORS avec Origin: {ORIGIN} ===\n")

# Preflight OPTIONS
resp_opt = requests.options(URL, headers={
    "Origin": ORIGIN,
    "Access-Control-Request-Method": "GET",
    "Access-Control-Request-Headers": "X-Appwrite-Project",
})
print("OPTIONS Status:", resp_opt.status_code)
print("OPTIONS Headers:")
for k, v in resp_opt.headers.items():
    if 'cors' in k.lower() or 'access-control' in k.lower() or 'origin' in k.lower():
        print(f"  {k}: {v}")

# GET avec Origin
resp_get = requests.get(URL, headers={
    "Origin": ORIGIN,
    "X-Appwrite-Project": "6a29285200015cd421c7",
})
print("\nGET Status:", resp_get.status_code)
print("GET CORS Headers:")
for k, v in resp_get.headers.items():
    if 'cors' in k.lower() or 'access-control' in k.lower() or 'origin' in k.lower():
        print(f"  {k}: {v}")

print("\nGET Body (first 200 chars):", resp_get.text[:200])
