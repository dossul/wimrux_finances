import paramiko
import json

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

endpoint = "https://appwrite.benga.live/v1"
project = "6a29285200015cd421c7"

# 1. Login avec l'admin - sauvegarder les headers dans un fichier
stdin, stdout, stderr = client.exec_command(
    f"curl -s -X POST {endpoint}/account/sessions/email "
    f"-H 'Content-Type: application/json' "
    f"-H 'X-Appwrite-Project: {project}' "
    f"-d '{{\"email\":\"admin@wimrux.app\",\"password\":\"admin123\"}}' "
    f"-D /tmp/headers.txt && cat /tmp/headers.txt | grep -i '^set-cookie:'"
)
cookies = stdout.read().decode().strip()
print(f"Raw cookies:\n{cookies}")

session_cookie = ""
for line in cookies.split('\n'):
    line = line.strip()
    if line.lower().startswith('set-cookie:'):
        cookie_val = line[11:].strip().split(';')[0]
        if 'a_session' in cookie_val:
            session_cookie = cookie_val
            break

print(f"\nSession cookie: {session_cookie}")

if not session_cookie:
    print("No session cookie found, trying with X-Appwrite-Key approach...")
    # Vérifier si le login a réussi
    stdin, stdout, stderr = client.exec_command(
        f"curl -s -w '%{{http_code}}' -X POST {endpoint}/account/sessions/email "
        f"-H 'Content-Type: application/json' "
        f"-H 'X-Appwrite-Project: {project}' "
        f"-d '{{\"email\":\"admin@wimrux.app\",\"password\":\"admin123\"}}'"
    )
    result = stdout.read().decode()
    print(f"Login response (last 3 chars = status): ...{result[-10:]}")
else:
    # 2. Créer la collection otp_codes
    collection_payload = '{"collectionId":"otp_codes","name":"OTP Codes","documentSecurity":false}'
    
    stdin, stdout, stderr = client.exec_command(
        f"curl -s -X POST {endpoint}/databases/wimrux_finances/collections "
        f"-H 'Content-Type: application/json' "
        f"-H 'X-Appwrite-Project: {project}' "
        f"-H 'Cookie: {session_cookie}' "
        f"-d '{collection_payload}'"
    )
    result = stdout.read().decode()
    print(f"\nCreate collection result:\n{result}")
    
    # 3. Créer les attributs
    attrs = [
        ('user_id', 'string', 255, True),
        ('phone', 'string', 50, True),
        ('code', 'string', 10, True),
        ('purpose', 'string', 50, True),
        ('used', 'boolean', None, True),
        ('expires_at', 'string', 255, True),
    ]
    
    for key, typ, size, req in attrs:
        if typ == 'boolean':
            attr_payload = f'{{"key":"{key}","required":{str(req).lower()},"default":false}}'
            attr_url = f"{endpoint}/databases/wimrux_finances/collections/otp_codes/attributes/boolean"
        else:
            attr_payload = f'{{"key":"{key}","size":{size},"required":{str(req).lower()}}}'
            attr_url = f"{endpoint}/databases/wimrux_finances/collections/otp_codes/attributes/string"
        
        stdin, stdout, stderr = client.exec_command(
            f"curl -s -X POST {attr_url} "
            f"-H 'Content-Type: application/json' "
            f"-H 'X-Appwrite-Project: {project}' "
            f"-H 'Cookie: {session_cookie}' "
            f"-d '{attr_payload}'"
        )
        attr_result = stdout.read().decode()
        print(f"\nCreate attribute {key}: {attr_result}")

client.close()
