import paramiko
import time

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
    f"-D /tmp/login_headers6.txt"
)
stdout.read().decode()

stdin, stdout, stderr = client.exec_command(
    "cat /tmp/login_headers6.txt | grep -i '^set-cookie: a_session' | head -1 | sed 's/set-cookie: //i' | sed 's/;.*//'"
)
session_cookie = stdout.read().decode().strip()

if session_cookie:
    # Vider les logs de l'executor avant l'appel
    client.exec_command("docker logs appwrite-executor > /tmp/executor_before.log 2>&1")
    
    # Appeler la fonction
    stdin, stdout, stderr = client.exec_command(
        f"curl -s -X POST {endpoint}/functions/send-otp-whatsapp/executions "
        f"-H 'Content-Type: application/json' "
        f"-H 'X-Appwrite-Project: {project}' "
        f"-b '{session_cookie}' "
        f"-d '{{\"data\":\"{{\\\"phone\\\":\\\"+22665599195\\\"}}\",\"async\":false}}'"
    )
    result = stdout.read().decode()
    print("Result:", result[:200])
    
    time.sleep(2)
    
    # Capturer les logs après l'appel
    stdin, stdout, stderr = client.exec_command(
        "docker logs appwrite-executor > /tmp/executor_after.log 2>&1 && tail -n +$(wc -l < /tmp/executor_before.log) /tmp/executor_after.log"
    )
    logs = stdout.read().decode()
    print(f"\nExecutor logs during call:\n{logs}")

client.close()
