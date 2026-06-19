import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Trouver la table qui correspond à otp_codes
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e \""
    "SELECT t.TABLE_NAME FROM INFORMATION_SCHEMA.TABLES t "
    "JOIN _1_collections c ON t.TABLE_NAME = CONCAT('_1_database_', c.databaseId, '_collection_', c._uid) "
    "WHERE c.id = 'otp_codes';\""
)
print("OTP table:")
print(stdout.read().decode())

client.close()
