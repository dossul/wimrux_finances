import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Tester le démarrage du runtime Open Runtimes v3 manuellement
stdin, stdout, stderr = client.exec_command(
    "docker run -d --rm --network executor_runtimes --name test-runtime -v /var/lib/docker/volumes/appwrite-main_appwrite-functions/_data/app-6a29285200015cd421c7:/usr/local/server/src/function openruntimes/node:v3-18.0 sh -c 'cd /usr/local/server && node server.js'"
)
container_id = stdout.read().decode().strip()
print(f"Container ID: {container_id}")

import time
time.sleep(3)

# Vérifier les logs du runtime
stdin, stdout, stderr = client.exec_command(
    f"docker logs {container_id} --tail 20 2>&1"
)
print(f"\nRuntime logs:\n{stdout.read().decode()}")

# Vérifier si le runtime écoute
stdin, stdout, stderr = client.exec_command(
    f"docker exec {container_id} netstat -tlnp 2>/dev/null || docker exec {container_id} ss -tlnp 2>/dev/null || echo 'no netstat'"
)
print(f"\nListening ports:\n{stdout.read().decode()}")

# Essayer de contacter le runtime depuis l'executor
stdin, stdout, stderr = client.exec_command(
    f"docker exec appwrite-executor wget -qO- http://{container_id}:3000 2>&1 || echo 'failed from executor'"
)
print(f"\nContact from executor:\n{stdout.read().decode()}")

# Essayer de contacter par IP
stdin, stdout, stderr = client.exec_command(
    f"docker inspect {container_id} --format '{{.NetworkSettings.Networks.executor_runtimes.IPAddress}}'"
)
runtime_ip = stdout.read().decode().strip()
print(f"\nRuntime IP: {runtime_ip}")

if runtime_ip:
    stdin, stdout, stderr = client.exec_command(
        f"docker exec appwrite-executor wget -qO- http://{runtime_ip}:3000 2>&1 || echo 'failed by IP'"
    )
    print(f"Contact by IP:\n{stdout.read().decode()}")

# Nettoyer
stdin, stdout, stderr = client.exec_command(f"docker stop {container_id} 2>/dev/null || true")
print(f"\nCleanup: {stdout.read().decode()}")

client.close()
