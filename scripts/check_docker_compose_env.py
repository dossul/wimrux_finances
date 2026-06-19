import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Vérifier toutes les variables d'env liées aux fonctions
stdin, stdout, stderr = client.exec_command(
    "cat /opt/stacks/appwrite-main/docker-compose.yml | grep -E '_APP_FUNCTION|_APP_EXECUTION|TIMEOUT|timeout'"
)
print("Function/env related lines:")
print(stdout.read().decode())

# Vérifier les variables dans le conteneur appwrite-main
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-main env | grep -E 'FUNCTION|EXECUTION|TIMEOUT'"
)
print("\nAppwrite-main env:")
print(stdout.read().decode())

client.close()
