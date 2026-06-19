import requests
import json

# Test direct de la fonction send-otp-whatsapp
endpoint = "https://appwrite.benga.live/v1"
project = "6a29285200015cd421c7"

# D'abord login pour obtenir une session
login_url = f"{endpoint}/account/sessions/email"
login_payload = {
    "email": "admin@wimrux.app",
    "password": "admin123"
}

headers = {
    "Content-Type": "application/json",
    "X-Appwrite-Project": project
}

print("=== 1. Login ===")
resp = requests.post(login_url, json=login_payload, headers=headers)
print(f"Status: {resp.status_code}")
print(f"Headers: {dict(resp.headers)}")

# Extraire le cookie de session
session_cookie = resp.headers.get('Set-Cookie', '')
print(f"Session cookie: {session_cookie[:100]}...")

# Maintenant appeler la fonction
func_url = f"{endpoint}/functions/send-otp-whatsapp/executions"
func_headers = {
    "Content-Type": "application/json",
    "X-Appwrite-Project": project,
    "Cookie": session_cookie
}
func_payload = {
    "data": json.dumps({"phone": "+22665599195"}),
    "async": False
}

print("\n=== 2. Appel fonction send-otp-whatsapp ===")
print(f"URL: {func_url}")
print(f"Headers: {func_headers}")
print(f"Payload: {func_payload}")

resp2 = requests.post(func_url, json=func_payload, headers=func_headers)
print(f"\nStatus: {resp2.status_code}")
print(f"Response: {resp2.text}")

# Si on a un execution ID, récupérer les logs
if resp2.status_code == 201:
    result = resp2.json()
    exec_id = result.get('$id')
    print(f"\nExecution ID: {exec_id}")
    print(f"Status: {result.get('status')}")
    print(f"ResponseStatusCode: {result.get('responseStatusCode')}")
    print(f"ResponseBody: {result.get('responseBody')}")
    print(f"Logs: {result.get('logs')}")
    print(f"Errors: {result.get('errors')}")
    print(f"Duration: {result.get('duration')}")
