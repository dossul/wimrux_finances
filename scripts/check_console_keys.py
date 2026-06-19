import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Vérifier la structure de _console_keys
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'DESCRIBE _console_keys'"
)
print("Structure _console_keys:")
print(stdout.read().decode())

# Vérifier les clés existantes
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SELECT _uid, name, secret, projectInternalId FROM _console_keys LIMIT 10'"
)
print("\nClés existantes:")
print(stdout.read().decode())

# Vérifier le projectInternalId de notre projet
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SELECT _uid, _id, name FROM _console_projects WHERE _id=\"6a29285200015cd421c7\"'"
)
print("\nProjet:")
print(stdout.read().decode())

client.close()
