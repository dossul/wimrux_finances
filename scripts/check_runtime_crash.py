import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Vérifier les logs du dernier conteneur runtime
stdin, stdout, stderr = client.exec_command(
    "docker ps -a --filter 'ancestor=openruntimes/node:v3-18.0' --format '{{.Names}}' | head -1"
)
runtime_name = stdout.read().decode().strip()
print(f"Runtime name: {runtime_name}")

if runtime_name:
    stdin, stdout, stderr = client.exec_command(
        f"docker logs {runtime_name} --tail 50 2>&1"
    )
    print(f"\nRuntime logs:\n{stdout.read().decode()}")
    
    stdin, stdout, stderr = client.exec_command(
        f"docker inspect {runtime_name} --format '{{json .Config.Env}}' | python3 -m json.tool 2>/dev/null"
    )
    print(f"\nRuntime env:\n{stdout.read().decode()}")
    
    stdin, stdout, stderr = client.exec_command(
        f"docker inspect {runtime_name} --format '{{json .HostConfig.Binds}}' | python3 -m json.tool 2>/dev/null"
    )
    print(f"\nRuntime mounts:\n{stdout.read().decode()}")

client.close()
