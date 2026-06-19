import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Vérifier si le tar existe
stdin, stdout, stderr = client.exec_command("ls -la /tmp/build.tar.gz")
print("Tar file:")
print(stdout.read().decode())

# Vérifier le contenu avec tar directement
stdin, stdout, stderr = client.exec_command("tar -tzf /tmp/build.tar.gz")
print("\nTar listing:")
print(stdout.read().decode())

# Vérifier le fichier local index.js
stdin, stdout, stderr = client.exec_command("cat /var/lib/docker/volumes/appwrite-main_appwrite-functions/_data/app-6a29285200015cd421c7/index.js | head -60")
print("\nLocal index.js:")
print(stdout.read().decode())

client.close()
