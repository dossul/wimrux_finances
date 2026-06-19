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

# Login
stdin, stdout, stderr = client.exec_command(
    f"curl -s -X POST {endpoint}/account/sessions/email "
    f"-H 'Content-Type: application/json' "
    f"-H 'X-Appwrite-Project: {project}' "
    f"-d '{{\"email\":\"admin@wimrux.app\",\"password\":\"WimruxAdmin2026!\"}}' "
    f"-D /tmp/login_headers5.txt"
)
stdout.read().decode()

stdin, stdout, stderr = client.exec_command(
    "cat /tmp/login_headers5.txt | grep -i '^set-cookie: a_session' | head -1 | sed 's/set-cookie: //i' | sed 's/;.*//'"
)
session_cookie = stdout.read().decode().strip()

if session_cookie:
    stdin, stdout, stderr = client.exec_command(
        f"curl -s -X POST {endpoint}/functions/send-otp-whatsapp/executions "
        f"-H 'Content-Type: application/json' "
        f"-H 'X-Appwrite-Project: {project}' "
        f"-b '{session_cookie}' "
        f"-d '{{\"data\":\"{{\\\"phone\\\":\\\"+22665599195\\\"}}\",\"async\":false}}'"
    )
    result = stdout.read().decode()
    
    try:
        res = json.loads(result)
        print("=== responseBody ===")
        print(res.get('responseBody'))
        print("\n=== logs ===")
        print(res.get('logs'))
        print("\n=== errors ===")
        print(res.get('errors'))
        print("\n=== duration ===")
        print(res.get('duration'))
    except Exception as e:
        print(f"Parse error: {e}")
        print("Raw:", result)

client.close()
