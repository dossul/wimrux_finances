#!/usr/bin/env python3
"""
Audit Appwrite serveur via SSH (Paramiko)
Serveur: 167.86.69.104
"""
import paramiko
import sys

HOST = "167.86.69.104"
USER = "root"
PWD = "JVQ9UU3G7nrm"

def run_cmd(ssh, cmd, label):
    print(f"\n=== {label} ===")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out:
        print(out)
    if err:
        print(f"STDERR: {err}")
    return out, err

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PWD, timeout=15)
        print(f"✅ Connecté à {HOST}")

        # 1. Containers Appwrite
        run_cmd(client, "docker ps --format '{{.Names}}\\t{{.Status}}' | grep appwrite | sort", "Containers Appwrite")

        # 2. Queues Redis
        run_cmd(client, "docker exec appwrite-redis redis-cli LLEN v1-databases", "Queue v1-databases (0 = OK)")
        run_cmd(client, "docker exec appwrite-redis redis-cli LLEN v1-builds", "Queue v1-builds (0 = OK)")
        run_cmd(client, "docker exec appwrite-redis redis-cli LLEN v1-functions", "Queue v1-functions (0 = OK)")

        # 3. Logs workers
        run_cmd(client, "docker logs appwrite-worker-databases --tail 20 2>&1", "Logs worker-databases")
        run_cmd(client, "docker logs appwrite-main --tail 20 2>&1", "Logs appwrite-main")

        # 4. Disk / health
        run_cmd(client, "df -h | grep -E '(/$|/opt|/var)'", "Disk usage")
        run_cmd(client, "free -h", "Memory")

        # 5. Compose file location
        run_cmd(client, "ls -la /opt/stacks/appwrite-main/docker-compose.yml 2>/dev/null || echo 'Compose not found at expected path'", "Compose file")

        # 6. Appwrite API health (local)
        run_cmd(client, "curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/v1/health", "Appwrite API health (local)")

        # 7. Database check
        run_cmd(client, "docker exec appwrite-mariadb mysql -uroot -p\"${MYSQL_ROOT_PASSWORD}\" -e 'SHOW DATABASES;' 2>/dev/null || echo 'MariaDB access failed'", "MariaDB databases")

        print("\n✅ Audit terminé")
    except Exception as e:
        print(f"❌ Erreur: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
