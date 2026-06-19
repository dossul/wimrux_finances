import os, re

SRC = r"c:\wamp64\www\wimrux_finances\wimrux_app\src"

# Find all collection names used in the code
col_pattern = re.compile(r"['\"]([a-z][a-z_]{3,40})['\"]")
collections_found = set()

for dp, dirs, files in os.walk(SRC):
    dirs[:] = [d for d in dirs if d not in {"node_modules", ".git", "dist"}]
    for f in files:
        if not f.endswith((".ts", ".vue")): continue
        content = open(os.path.join(dp, f), encoding="utf-8", errors="ignore").read()
        # Look for COLLECTIONS.X patterns and direct string collections
        for m in re.finditer(r"COLLECTIONS\.(\w+)", content):
            collections_found.add(m.group(1).lower())

# Also check COLLECTIONS constant definition
for dp, dirs, files in os.walk(SRC):
    for f in files:
        if not f.endswith(".ts"): continue
        content = open(os.path.join(dp, f), encoding="utf-8", errors="ignore").read()
        for m in re.finditer(r"(\w+):\s*['\"]([a-z][a-z_]+)['\"]", content):
            if len(m.group(2)) > 4:
                collections_found.add(m.group(2))

print("Collections référencées dans le code:")
for c in sorted(collections_found):
    print(f"  {c}")
