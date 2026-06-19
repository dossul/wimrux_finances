import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Lister toutes les tables
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SHOW TABLES' | grep -i key"
)
print("Tables avec 'key':")
print(stdout.read().decode())

# Chercher dans toutes les tables
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SHOW TABLES' | head -50"
)
print("\nPremières tables:")
print(stdout.read().decode())

# Chercher les tables qui contiennent des clés API
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SHOW TABLES' | grep -E 'platform|project|key|token|auth' | head -20"
)
print("\nTables auth/key:")
print(stdout.read().decode())

client.close()
