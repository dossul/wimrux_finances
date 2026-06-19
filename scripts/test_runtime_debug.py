import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Tester avec un entrypoint différent pour voir ce qui se passe
stdin, stdout, stderr = client.exec_command(
    "docker run --rm --network executor_runtimes -v /var/lib/docker/volumes/appwrite-main_appwrite-functions/_data/app-6a29285200015cd421c7:/usr/local/server/src/function openruntimes/node:v3-18.0 sh -c 'ls -la /usr/local/server/src/function/'"
)
print("Files in function dir:")
print(stdout.read().decode())

# Vérifier l'entrypoint du runtime
stdin, stdout, stderr = client.exec_command(
    "docker inspect openruntimes/node:v3-18.0 --format '{{json .Config.Entrypoint}} {{json .Config.Cmd}}'"
)
print("\nRuntime entrypoint:")
print(stdout.read().decode())

# Essayer de démarrer manuellement avec le script de démarrage
stdin, stdout, stderr = client.exec_command(
    "docker run -d --rm --network executor_runtimes --name test-runtime2 -v /var/lib/docker/volumes/appwrite-main_appwrite-functions/_data/app-6a29285200015cd421c7:/usr/local/server/src/function openruntimes/node:v3-18.0"
)
container_id = stdout.read().decode().strip()
print(f"\nContainer ID: {container_id}")

import time
time.sleep(2)

stdin, stdout, stderr = client.exec_command(f"docker logs test-runtime2 --tail 30 2>&1 || docker logs {container_id} --tail 30 2>&1")
print(f"Logs:\n{stdout.read().decode()}")

stdin, stdout, stderr = client.exec_command(f"docker inspect test-runtime2 --format '{{.State.Status}} {{.State.ExitCode}} {{.State.Error}}' 2>/dev/null || docker inspect {container_id} --format '{{.State.Status}} {{.State.ExitCode}} {{.State.Error}}'")
print(f"State:\n{stdout.read().decode()}")

stdin, stdout, stderr = client.exec_command(f"docker stop test-runtime2 2>/dev/null; docker stop {container_id} 2>/dev/null; echo done")
print(f"Cleanup: {stdout.read().decode()}")

client.close()
