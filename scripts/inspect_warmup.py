import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Lancer manuellement le warm-up pour voir ce qui se passe
stdin, stdout, stderr = client.exec_command(
    "docker run -d --rm --network executor_runtimes --name warmup-test -v /var/lib/docker/volumes/appwrite-main_appwrite-functions/_data/app-6a29285200015cd421c7:/usr/local/server/src/function openruntimes/node:v3-18.0 sh -c 'cat /usr/local/server/src/function/.open-runtimes 2>/dev/null || echo NO_FILE; ls -la /usr/local/server/src/function/'"
)
container_id = stdout.read().decode().strip()
print(f"Container: {container_id}")

import time
time.sleep(2)

stdin, stdout, stderr = client.exec_command(f"docker logs {container_id} 2>&1 || docker logs warmup-test 2>&1")
print(f"\nLogs:\n{stdout.read().decode()}")

stdin, stdout, stderr = client.exec_command(f"docker stop {container_id} 2>/dev/null; docker stop warmup-test 2>/dev/null; echo done")
print(f"Cleanup: {stdout.read().decode()}")

# Regarder le start.sh du runtime
stdin, stdout, stderr = client.exec_command(
    "docker run --rm openruntimes/node:v3-18.0 cat /usr/local/server/src/function/helpers/start.sh"
)
print(f"\nstart.sh:\n{stdout.read().decode()}")

client.close()
