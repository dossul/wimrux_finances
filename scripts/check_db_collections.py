import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# 1. Lister toutes les tables de la DB appwrite
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SHOW TABLES' | wc -l"
)
print(f"Nombre de tables: {stdout.read().decode().strip()}")

# 2. Chercher les tables liées à otp ou collections
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SHOW TABLES' | grep -i 'otp\|collection\|document' | head -20"
)
print(f"\nTables OTP/collections:\n{stdout.read().decode()}")

# 3. Chercher les tables du project wimrux
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SHOW TABLES' | grep 'wimrux' | head -20"
)
print(f"\nTables wimrux:\n{stdout.read().decode()}")

# 4. Chercher dans la base de données principale les collections
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SELECT _uid, name FROM _1_collections LIMIT 20'"
)
print(f"\nCollections:\n{stdout.read().decode()}")

# 5. Chercher spécifiquement otp_codes
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SELECT _uid, name, databaseId FROM _1_collections WHERE name LIKE \"%otp%\"'"
)
print(f"\nCollections OTP:\n{stdout.read().decode()}")

# 6. Vérifier la DB wimrux_finances
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SELECT _uid, name FROM _1_databases'"
)
print(f"\nDatabases:\n{stdout.read().decode()}")

client.close()
