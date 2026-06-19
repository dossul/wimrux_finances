import paramiko
import time

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Lancer un watch sur docker ps en arrière-plan
stdin, stdout, stderr = client.exec_command(
    "(while true; do docker ps -a --format '{{.Names}} {{.Image}} {{.Status}}' | grep -i runtime; sleep 0.5; done) > /tmp/runtime_watch.log 2>&1 & echo $!"
)
watch_pid = stdout.read().decode().strip()
print(f"Watch PID: {watch_pid}")

# Appeler la fonction
endpoint = "https://appwrite.benga.live/v1"
project = "6a29285200015cd421c7"

stdin, stdout, stderr = client.exec_command(
    f"curl -s -X POST {endpoint}/account/sessions/email "
    f"-H 'Content-Type: application/json' "
    f"-H 'X-Appwrite-Project: {project}' "
    f"-d '{{\"email\":\"admin@wimrux.app\",\"password\":\"WimruxAdmin2026!\"}}' "
    f"-D /tmp/login_headers4.txt"
)
stdout.read().decode()

stdin, stdout, stderr = client.exec_command(
    "cat /tmp/login_headers4.txt | grep -i '^set-cookie: a_session' | head -1 | sed 's/set-cookie: //i' | sed 's/;.*//'"
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
    print(f"Result: {result}")

time.sleep(3)

# Arrêter le watch
stdin, stdout, stderr = client.exec_command(f"kill {watch_pid} 2>/dev/null; cat /tmp/runtime_watch.log")
print(f"\nRuntime containers captured:\n{stdout.read().decode()}")

client.close()
