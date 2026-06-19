#!/usr/bin/env python3
"""Audit Appwrite - écrit dans un fichier sur le serveur"""
import paramiko

HOST = "167.86.69.104"
USER = "root"
PWD = "JVQ9UU3G7nrm"

cmds = [
    ("Containers Appwrite", "docker ps --format '{{.Names}}\\t{{.Status}}' | grep appwrite | sort"),
    ("Queue v1-databases", "docker exec appwrite-redis redis-cli LLEN v1-databases"),
    ("Queue v1-builds", "docker exec appwrite-redis redis-cli LLEN v1-builds"),
    ("Queue v1-functions", "docker exec appwrite-redis redis-cli LLEN v1-functions"),
    ("Queue v1-deletes", "docker exec appwrite-redis redis-cli LLEN v1-deletes"),
    ("Queue v1-mails", "docker exec appwrite-redis redis-cli LLEN v1-mails"),
    ("Redis keys v1-*", "docker exec appwrite-redis redis-cli KEYS 'v1-*'"),
    ("Logs worker-databases (20l)", "docker logs appwrite-worker-databases --tail 20 2>&1"),
    ("Logs appwrite-main (20l)", "docker logs appwrite-main --tail 20 2>&1"),
    ("Compose date", "ls -la /opt/stacks/appwrite-main/docker-compose.yml"),
    ("Disk usage root", "df -h /"),
    ("Memory", "free -h"),
    ("Uptime", "uptime"),
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD, timeout=15)

lines = [f"Audit Appwrite — {HOST} — {__import__('datetime').datetime.now().isoformat()}", "="*60]
for label, cmd in cmds:
    lines.append(f"\n=== {label} ===")
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out:
        lines.append(out)
    if err:
        lines.append(f"STDERR: {err}")

report = "\n".join(lines)

# Écrire sur le serveur
stdin, stdout, stderr = client.exec_command("cat > /tmp/appwrite_audit_report.txt")
stdin.write(report)
stdin.channel.shutdown_write()
stdout.read()
stderr.read()

print("Rapport écrit sur le serveur : /tmp/appwrite_audit_report.txt")
print("Longueur :", len(report))

# Afficher aussi localement
print("\n" + report)
client.close()
