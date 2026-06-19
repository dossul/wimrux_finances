import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Vérifier les documents dans la table otp_codes
stdin, stdout, stderr = client.exec_command(
    "docker exec appwrite-mariadb mysql -u root -p'appwrite-db-pass-2024' appwrite -e 'SELECT _uid, _id FROM _6a2da44cf145a74d6595 ORDER BY _createdAt DESC LIMIT 10'"
)
print("Recent OTP documents:")
print(stdout.read().decode())

client.close()
