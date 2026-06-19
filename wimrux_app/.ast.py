import json, sys
from graphify.extract import collect_files, extract
from pathlib import Path

code_files = collect_files(Path('src'))
if code_files:
    result = extract(code_files, parallel=False)
    Path('graphify-out/.graphify_ast.json').write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f'AST: {len(result["nodes"])} nodes, {len(result["edges"])} edges')
else:
    print('No code files')
