import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

build_dir = '/var/lib/docker/volumes/appwrite-main_appwrite-builds/_data/app-6a29285200015cd421c7'
func_dir = '/var/lib/docker/volumes/appwrite-main_appwrite-functions/_data/app-6a29285200015cd421c7'

# Lister les backups
stdin, stdout, stderr = client.exec_command(
    f"ls -la {build_dir}/*.bak* 2>/dev/null || echo 'no backups in builds'"
)
print("Build backups:")
print(stdout.read().decode())

stdin, stdout, stderr = client.exec_command(
    f"ls -la {func_dir}/*.bak* 2>/dev/null || echo 'no backups in functions'"
)
print("\nFunction backups:")
print(stdout.read().decode())

# Vérifier le contenu du dernier build backup
stdin, stdout, stderr = client.exec_command(
    f"tar -tzf {build_dir}/6a2b1487e5f00.gz.bak_build 2>/dev/null | head -20 || echo 'cannot list backup'"
)
print("\nBackup build contents:")
print(stdout.read().decode())

client.close()
