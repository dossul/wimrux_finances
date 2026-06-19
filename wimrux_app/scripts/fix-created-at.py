#!/usr/bin/env python3
"""
Fix created_at -> $createdAt in Appwrite queries
and consented_at/requested_at -> $createdAt where missing from schema
"""
import os, re, sys

SRC_DIR = os.path.abspath(r'c:\wamp64\www\wimrux_finances\wimrux_app\src')

REPLACEMENTS = [
    # .order('created_at', ...)  ->  .order('$createdAt', ...)
    (re.compile(r"\.order\(['\"]created_at['\"]"), ".order('$createdAt'"),

    # .gte('created_at', ...)   ->  .gte('$createdAt', ...)
    (re.compile(r"\.gte\(['\"]created_at['\"]"), ".gte('$createdAt'"),

    # .lte('created_at', ...)   ->  .lte('$createdAt', ...)
    (re.compile(r"\.lte\(['\"]created_at['\"]"), ".lte('$createdAt'"),

    # Query.orderDesc('created_at')  ->  Query.orderDesc('$createdAt')
    (re.compile(r"Query\.orderDesc\(['\"]created_at['\"]\)"), "Query.orderDesc('$createdAt')"),

    # Query.orderAsc('created_at')   ->  Query.orderAsc('$createdAt')
    (re.compile(r"Query\.orderAsc\(['\"]created_at['\"]\)"), "Query.orderAsc('$createdAt')"),

    # Query.greaterThanEqual('created_at', ...)  ->  Query.greaterThanEqual('$createdAt', ...)
    (re.compile(r"Query\.greaterThanEqual\(['\"]created_at['\"]"), "Query.greaterThanEqual('$createdAt'"),

    # Query.lessThanEqual('created_at', ...)     ->  Query.lessThanEqual('$createdAt', ...)
    (re.compile(r"Query\.lessThanEqual\(['\"]created_at['\"]"), "Query.lessThanEqual('$createdAt'"),

    # Query.equal('created_at', ...)  ->  Query.equal('$createdAt', ...)
    (re.compile(r"Query\.equal\(['\"]created_at['\"]"), "Query.equal('$createdAt'"),

    # Custom timestamps that don't exist in Appwrite schema -> $createdAt
    # .order('consented_at', ...)  ->  .order('$createdAt', ...)
    (re.compile(r"\.order\(['\"]consented_at['\"]"), ".order('$createdAt'"),

    # .order('requested_at', ...)  ->  .order('$createdAt', ...)
    (re.compile(r"\.order\(['\"]requested_at['\"]"), ".order('$createdAt'"),
]

total_files = 0
changes_log = []

for root, dirs, files in os.walk(SRC_DIR):
    # Skip cache/graphify dirs
    dirs[:] = [d for d in dirs if d not in ('graphify-out', 'cache')]

    for fname in files:
        if not fname.endswith(('.ts', '.vue')):
            continue
        path = os.path.join(root, fname)
        try:
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
        except (UnicodeDecodeError, PermissionError):
            continue

        original = content
        file_changes = []

        for pattern, replacement in REPLACEMENTS:
            matches = list(pattern.finditer(content))
            if matches:
                content = pattern.sub(replacement, content)
                for m in matches:
                    file_changes.append(f"  {m.group()} -> {replacement}")

        if content != original:
            total_files += 1
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
            rel = os.path.relpath(path, SRC_DIR)
            changes_log.append(f"{rel} ({len(file_changes)} changes)")
            for ch in file_changes:
                changes_log.append(ch)

# Summary
print(f"Modified {total_files} files")
for line in changes_log:
    print(line)
