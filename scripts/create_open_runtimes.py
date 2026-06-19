import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

func_dir = '/var/lib/docker/volumes/appwrite-main_appwrite-functions/_data/app-6a29285200015cd421c7'
build_dir = '/var/lib/docker/volumes/appwrite-main_appwrite-builds/_data/app-6a29285200015cd421c7'

# Créer un .open-runtimes vide
stdin, stdout, stderr = client.exec_command(
    f"echo '#!/bin/sh' > {func_dir}/.open-runtimes && echo '.open-runtimes created'"
)
print("Create .open-runtimes:", stdout.read().decode())

# Recréer le tar.gz avec le .open-runtimes
stdin, stdout, stderr = client.exec_command(
    f"cd {func_dir} && tar -czf /tmp/build2.tar.gz index.js .open-runtimes && echo 'tar created'"
)
print("Create tar:", stdout.read().decode())

# Vérifier le contenu du tar
stdin, stdout, stderr = client.exec_command(
    "tar -tzf /tmp/build2.tar.gz"
)
print("Tar contents:", stdout.read().decode())

# Remplacer tous les builds
stdin, stdout, stderr = client.exec_command(
    f"for f in {func_dir}/*.gz; do cp /tmp/build2.tar.gz \"$f\" && echo \"Replaced $f\"; done"
)
print("\nFunctions builds:")
print(stdout.read().decode())

stdin, stdout, stderr = client.exec_command(
    f"for f in {build_dir}/*.gz; do cp /tmp/build2.tar.gz \"$f\" && echo \"Replaced build $f\"; done"
)
print("\nBuilds dir:")
print(stdout.read().decode())

# Restart executor
stdin, stdout, stderr = client.exec_command("docker restart appwrite-executor")
print("\nRestart:", stdout.read().decode())

client.close()
