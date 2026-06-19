import paramiko
import requests
import json

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

endpoint = "https://appwrite.benga.live/v1"
project = "6a29285200015cd421c7"

# 1. Login avec l'admin
login_url = f"{endpoint}/account/sessions/email"
login_payload = {
    "email": "admin@wimrux.app",
    "password": "admin123"
}

headers = {
    "Content-Type": "application/json",
    "X-Appwrite-Project": project
}

# Faire le login depuis le serveur avec curl
stdin, stdout, stderr = client.exec_command(
    f"curl -s -X POST {login_url} "
    f"-H 'Content-Type: application/json' "
    f"-H 'X-Appwrite-Project: {project}' "
    f"-d '{{\"email\":\"admin@wimrux.app\",\"password\":\"admin123\"}}' "
    f"-D - | grep -i 'set-cookie'"
)
cookies = stdout.read().decode().strip()
print(f"Cookies: {cookies}")

# Extraire le cookie de session
session_cookie = ""
for line in cookies.split('\n'):
    if 'set-cookie' in line.lower():
        session_cookie = line.split(':')[1].strip().split(';')[0]
        break

print(f"Session cookie: {session_cookie}")

if session_cookie:
    # 2. Créer la collection otp_codes
    collection_url = f"{endpoint}/databases/wimrux_finances/collections"
    collection_payload = {
        "collectionId": "otp_codes",
        "name": "OTP Codes",
        "permissions": ["create("any")", "read("any")", "update("any")", "delete("any")"],
        "documentSecurity": False
    }
    
    stdin, stdout, stderr = client.exec_command(
        f"curl -s -X POST {collection_url} "
        f"-H 'Content-Type: application/json' "
        f"-H 'X-Appwrite-Project: {project}' "
        f"-b '{session_cookie}' "
        f"-d '{json.dumps(collection_payload)}'"
    )
    result = stdout.read().decode()
    print(f"\nCreate collection result:\n{result}")
    
    # 3. Créer les attributs
    attributes = [
        {"key": "user_id", "size": 255, "required": True, "type": "string"},
        {"key": "phone", "size": 50, "required": True, "type": "string"},
        {"key": "code", "size": 10, "required": True, "type": "string"},
        {"key": "purpose", "size": 50, "required": True, "type": "string", "default": "login_2fa"},
        {"key": "used", "required": True, "type": "boolean", "default": False},
        {"key": "expires_at", "required": True, "type": "string"},  # datetime as string
    ]
    
    for attr in attributes:
        attr_url = f"{endpoint}/databases/wimrux_finances/collections/otp_codes/attributes/string"
        if attr.get("type") == "boolean":
            attr_url = f"{endpoint}/databases/wimrux_finances/collections/otp_codes/attributes/boolean"
        
        # Simplify - just create string attributes for all
        attr_payload = {
            "key": attr["key"],
            "size": attr.get("size", 255),
            "required": attr.get("required", False),
            "default": attr.get("default", None)
        }
        
        stdin, stdout, stderr = client.exec_command(
            f"curl -s -X POST {attr_url} "
            f"-H 'Content-Type: application/json' "
            f"-H 'X-Appwrite-Project: {project}' "
            f"-b '{session_cookie}' "
            f"-d '{json.dumps(attr_payload)}'"
        )
        attr_result = stdout.read().decode()
        print(f"\nCreate attribute {attr['key']}: {attr_result}")

client.close()
