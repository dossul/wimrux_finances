import paramiko

HOST = '167.86.69.104'
USER = 'root'
PWD = 'JVQ9UU3G7nrm'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD)

# Vérifier si les fonctions ont accès au réseau interne
stdin, stdout, stderr = client.exec_command(
    "docker run --rm --network appwrite-main_default openruntimes/node:v3-18.0 sh -c 'wget -qO- http://appwrite-main:80/v1/health 2>&1 || echo failed'"
)
print("Accès appwrite-main depuis runtime (default network):")
print(stdout.read().decode())

# Vérifier depuis le réseau executor
stdin, stdout, stderr = client.exec_command(
    "docker run --rm --network executor_runtimes openruntimes/node:v3-18.0 sh -c 'wget -qO- http://appwrite-main:80/v1/health 2>&1 || echo failed'"
)
print("\nAccès appwrite-main depuis runtime (executor_runtimes):")
print(stdout.read().decode())

# Vérifier si on peut joindre mariadb depuis le runtime
stdin, stdout, stderr = client.exec_command(
    "docker run --rm --network appwrite-main_default openruntimes/node:v3-18.0 sh -c 'wget -qO- http://appwrite-mariadb:3306 2>&1 || echo failed'"
)
print("\nAccès mariadb depuis runtime:")
print(stdout.read().decode())

# Vérifier les networks connectés à appwrite-main
stdin, stdout, stderr = client.exec_command(
    "docker inspect appwrite-main --format '{{json .NetworkSettings.Networks}}' | python3 -m json.tool 2>/dev/null"
)
print("\nNetworks de appwrite-main:")
print(stdout.read().decode())

# Vérifier le docker-compose pour les networks
stdin, stdout, stderr = client.exec_command(
    "cat /opt/stacks/appwrite-main/docker-compose.yml | grep -A20 'networks:' | head -30"
)
print("\nNetworks dans docker-compose:")
print(stdout.read().decode())

client.close()
