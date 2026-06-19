import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Vérifier le contenu du tar.gz
stdin, stdout, stderr = client.exec_command(
    "zcat /tmp/build.tar.gz | tar -tzf -"
)
print("Tar contents:")
print(stdout.read().decode())

# Vérifier le contenu de index.js dans le tar
stdin, stdout, stderr = client.exec_command(
    "zcat /tmp/build.tar.gz | tar -xzf - -O index.js | grep -n 'bodyRawPreview\|bodyType\|hasBody' | head -5"
)
print("\nDebug lines in index.js:")
print(stdout.read().decode())

# Vérifier le fichier local
stdin, stdout, stderr = client.exec_command(
    "grep -n 'bodyRawPreview\|bodyType\|hasBody' /var/lib/docker/volumes/appwrite-main_appwrite-functions/_data/app-6a29285200015cd421c7/index.js | head -5"
)
print("\nLocal index.js debug lines:")
print(stdout.read().decode())

client.close()
