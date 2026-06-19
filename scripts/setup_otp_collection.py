import paramiko
import json

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# 1. Créer une clé API via la console Appwrite en utilisant l'API interne
# D'abord, on va créer la collection otp_codes via curl depuis le serveur

# Vérifier si la collection existe déjà
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-main sh -c 'curl -s -H \"X-Appwrite-Project: 6a29285200015cd421c7\" http://localhost/v1/databases/wimrux_finances/collections' | head -c 500"
)
print("Collections existantes:")
print(stdout.read().decode())

# 2. Créer la collection otp_codes
# On a besoin d'une clé API. Utilisons l'API key de l'admin
# En Appwrite 1.5.7, on peut créer une clé via l'API avec les permissions admin

# Essayons de trouver une clé existante dans les variables d'environnement
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-main sh -c 'env | grep -i \"_APP_KEY\|API_KEY\" | head -10'"
)
print("\nEnv API keys:")
print(stdout.read().decode())

# Essayons de créer une clé API via le conteneur appwrite-main en utilisant le CLI interne
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-main sh -c 'cd /usr/src/code && php vendor/bin/appwrite project createKey --projectId=6a29285200015cd421c7 --name=\"Server Functions\" --scopes=\"databases.documents\" 2>&1'"
)
print("\nCréation clé API:")
print(stdout.read().decode())

client.close()
