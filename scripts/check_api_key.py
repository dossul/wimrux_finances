import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# 1. Vérifier si la clé API est dans les variables d'env du container appwrite-main
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-main sh -c 'env | grep -i \"api_key\\|apikey\\|key\" | head -10'"
)
print("Env keys:")
print(stdout.read().decode())

# 2. Vérifier les variables de la fonction dans Appwrite
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SELECT _uid, name, value FROM _1_variables LIMIT 30'"
)
print("\nVariables (30):")
print(stdout.read().decode())

# 3. Chercher la clé API dans la DB (table _1_keys)
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SELECT _uid, name FROM _1_keys LIMIT 10'"
)
print("\nAPI Keys:")
print(stdout.read().decode())

# 4. Vérifier si le fichier .env du docker-compose contient des clés
stdin, stdout, stderr = client.exec_command(
    "cat /opt/stacks/appwrite-main/.env 2>/dev/null | grep -i 'key\|token' | head -10"
)
print("\nEnv file keys:")
print(stdout.read().decode())

client.close()
