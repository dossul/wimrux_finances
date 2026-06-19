import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Lister les collections de la DB wimrux_finances
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SELECT _uid, name, databaseId FROM _1_collections WHERE databaseId=\"wimrux_finances\"'"
)
print("Collections wimrux_finances:")
print(stdout.read().decode())

# Chercher otp_codes
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SELECT _uid, name, databaseId FROM _1_collections WHERE name LIKE \"%otp%\" OR name LIKE \"%code%\"'"
)
print("\nCollections OTP/codes:")
print(stdout.read().decode())

# Vérifier les attributs d'une collection otp si elle existe
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SELECT _uid, name FROM _1_collections WHERE name=\"otp_codes\"'"
)
print("\nCollection otp_codes:")
print(stdout.read().decode())

# Vérifier si la table _1_database_1_collection_X correspond à otp_codes
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SELECT table_name FROM information_schema.tables WHERE table_schema=\"appwrite\" AND table_name LIKE \"%otp%\"'"
)
print("\nTables SQL avec OTP:")
print(stdout.read().decode())

client.close()
