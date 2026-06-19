import paramiko
import time

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Restart executor et capturer le conteneur warm-up
stdin, stdout, stderr = client.exec_command("docker restart appwrite-executor")
stdout.read().decode()

time.sleep(10)

# Voir les conteneurs
stdin, stdout, stderr = client.exec_command(
    "docker ps -a --format '{{.Names}} {{.Image}} {{.Status}}' | grep -i runtime | head -10"
)
print("Runtime containers after warmup:")
print(stdout.read().decode())

# Chercher un conteneur avec le nom commençant par le hostname
stdin, stdout, stderr = client.exec_command(
    "docker ps -a --format '{{.Names}} {{.Image}} {{.Status}}' | grep 'node:v3' | head -5"
)
print("\nNode v3 containers:")
print(stdout.read().decode())

# Regarder les logs de l'executor pendant le warm-up
stdin, stdout, stderr = client.exec_command(
    "docker logs appwrite-executor --tail 30 2>&1 | head -30"
)
print("\nExecutor logs:")
print(stdout.read().decode())

client.close()
