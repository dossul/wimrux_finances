import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Vérifier les paramètres de la fonction
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SELECT _uid, name, timeout, runtime, entrypoint FROM _1_functions WHERE id=\"send-otp-whatsapp\"'"
)
print("Function params:")
print(stdout.read().decode())

# Vérifier les paramètres de l'executor
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-executor env | grep -i 'timeout\|time' | head -10"
)
print("\nExecutor env:")
print(stdout.read().decode())

# Vérifier le docker-compose pour le timeout
stdin, stdout, stderr = client.exec_command(
    "cat /opt/stacks/appwrite-main/docker-compose.yml | grep -i 'timeout\|FUNCTIONS' | head -10"
)
print("\nDocker-compose timeouts:")
print(stdout.read().decode())

client.close()
