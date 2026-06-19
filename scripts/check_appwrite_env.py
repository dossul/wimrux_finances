#!/usr/bin/env python3
"""Vérifier les variables d'env CORS/domaine dans le compose Appwrite"""
import paramiko

HOST = "167.86.69.104"
USER = "root"
PWD = "JVQ9UU3G7nrm"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PWD, timeout=15)

# Lire le compose
stdin, stdout, stderr = client.exec_command("cat /opt/stacks/appwrite-main/docker-compose.yml")
compose = stdout.read().decode('utf-8', errors='replace')

# Variables critiques
vars_to_check = [
    "_APP_DOMAIN",
    "_APP_DOMAIN_TARGET",
    "_APP_CONSOLE_WHITELIST_ROOT",
    "_APP_CONSOLE_WHITELIST_EMAILS",
    "_APP_OPTIONS_FORCE_HTTPS",
    "_APP_OPTIONS_CORS_MAX_AGE",
]

print("=== Variables CORS/Domaine dans docker-compose.yml ===\n")
for var in vars_to_check:
    for line in compose.split('\n'):
        if var in line:
            print(line.strip())

# Chercher aussi toutes les lignes avec CORS
print("\n=== Toutes les lignes contenant 'CORS' ou 'domain' ===")
for line in compose.split('\n'):
    if 'CORS' in line.upper() or 'DOMAIN' in line.upper():
        print(line.strip())

client.close()
