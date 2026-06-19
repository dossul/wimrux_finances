import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

endpoint = "https://appwrite.benga.live/v1"
project = "6a29285200015cd421c7"

# Tester directement la fonction avec une session admin
# D'abord login
stdin, stdout, stderr = client.exec_command(
    f"curl -s -X POST {endpoint}/account/sessions/email "
    f"-H 'Content-Type: application/json' "
    f"-H 'X-Appwrite-Project: {project}' "
    f"-d '{{\"email\":\"admin@wimrux.app\",\"password\":\"WimruxAdmin2026!\"}}' "
    f"-D /tmp/login_headers.txt"
)
print("Login:")
print(stdout.read().decode()[:200])

# Extraire le cookie
stdin, stdout, stderr = client.exec_command(
    "cat /tmp/login_headers.txt | grep -i '^set-cookie: a_session' | head -1 | sed 's/set-cookie: //i' | sed 's/;.*//'"
)
session_cookie = stdout.read().decode().strip()
print(f"\nCookie: {session_cookie[:100]}...")

if session_cookie:
    # Appeler la fonction
    stdin, stdout, stderr = client.exec_command(
        f"curl -s -X POST {endpoint}/functions/send-otp-whatsapp/executions "
        f"-H 'Content-Type: application/json' "
        f"-H 'X-Appwrite-Project: {project}' "
        f"-b '{session_cookie}' "
        f"-d '{{\"data\":\"{{\\\"phone\\\":\\\"+22665599195\\\"}}\",\"async\":false}}'"
    )
    result = stdout.read().decode()
    print(f"\nFunction result:\n{result}")
    
    # Récupérer les logs de l'exécution
    import json
    try:
        res = json.loads(result)
        exec_id = res.get('$id')
        if exec_id:
            print(f"\nExecution ID: {exec_id}")
            print(f"Status: {res.get('status')}")
            print(f"ResponseStatusCode: {res.get('responseStatusCode')}")
            print(f"ResponseBody: {res.get('responseBody')}")
            print(f"Logs: {res.get('logs')}")
            print(f"Errors: {res.get('errors')}")
    except:
        pass

client.close()
