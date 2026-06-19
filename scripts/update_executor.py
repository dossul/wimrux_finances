import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Sauvegarder le docker-compose
stdin, stdout, stderr = client.exec_command(
    "cp /opt/stacks/appwrite-main/docker-compose.yml /opt/stacks/appwrite-main/docker-compose.yml.bak && echo 'backup done'"
)
print("Backup:", stdout.read().decode())

# Modifier l'image de l'executor
stdin, stdout, stderr = client.exec_command(
    "sed -i 's|openruntimes/executor:0.4.8|openruntimes/executor:0.11.4|g' /opt/stacks/appwrite-main/docker-compose.yml && echo 'updated'"
)
print("Update:", stdout.read().decode())

# Vérifier le changement
stdin, stdout, stderr = client.exec_command(
    "grep 'openruntimes/executor' /opt/stacks/appwrite-main/docker-compose.yml"
)
print("Verify:", stdout.read().decode())

# Redémarrer l'executor
stdin, stdout, stderr = client.exec_command(
    "cd /opt/stacks/appwrite-main && docker compose stop appwrite-executor && docker compose rm -f appwrite-executor && docker compose up -d appwrite-executor"
)
print("Restart:", stdout.read().decode())

# Vérifier les logs
import time
time.sleep(5)

stdin, stdout, stderr = client.exec_command(
    "docker logs appwrite-executor --tail 20 2>&1"
)
print("\nLogs:", stdout.read().decode())

client.close()
