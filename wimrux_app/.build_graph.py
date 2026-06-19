import json, sys
from pathlib import Path
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json, to_html

ast = json.loads(Path('graphify-out/.graphify_ast.json').read_text(encoding='utf-8'))

audit_nodes = [
    {"id":"audit_insforge_leak_1","label":"InsForge Leak: pdf-to-images URL","file_type":"rationale","source_file":"src/composables/useSupplierInvoiceOcr.ts","source_location":"162","source_url":None,"captured_at":None,"author":None,"contributor":None},
    {"id":"audit_insforge_leak_2","label":"InsForge Leak: webhook endpoint URL","file_type":"rationale","source_file":"src/pages/wallets/WalletSyncSettingsPage.vue","source_location":"223","source_url":None,"captured_at":None,"author":None,"contributor":None},
    {"id":"audit_env_leak","label":"InsForge Leak: VITE_MCF_API_BASE_URL","file_type":"rationale","source_file":".env.production","source_location":"6","source_url":None,"captured_at":None,"author":None,"contributor":None},
    {"id":"appwrite_backend","label":"Appwrite Backend","file_type":"rationale","source_file":"src/boot/appwrite.ts","source_location":None,"source_url":None,"captured_at":None,"author":None,"contributor":None},
    {"id":"migration_plan","label":"Migration Plan: InsForge -> Appwrite 100%","file_type":"rationale","source_file":"GRAPH_REPORT.md","source_location":None,"source_url":None,"captured_at":None,"author":None,"contributor":None},
]

audit_edges = [
    {"source":"audit_insforge_leak_1","target":"appwrite_backend","relation":"must_migrate_to","confidence":"EXTRACTED","confidence_score":1.0,"source_file":"src/composables/useSupplierInvoiceOcr.ts","source_location":"162","weight":1.0},
    {"source":"audit_insforge_leak_2","target":"appwrite_backend","relation":"must_migrate_to","confidence":"EXTRACTED","confidence_score":1.0,"source_file":"src/pages/wallets/WalletSyncSettingsPage.vue","source_location":"223","weight":1.0},
    {"source":"audit_env_leak","target":"appwrite_backend","relation":"must_migrate_to","confidence":"EXTRACTED","confidence_score":1.0,"source_file":".env.production","source_location":"6","weight":1.0},
    {"source":"migration_plan","target":"audit_insforge_leak_1","relation":"addresses","confidence":"INFERRED","confidence_score":0.95,"source_file":"GRAPH_REPORT.md","source_location":None,"weight":1.0},
    {"source":"migration_plan","target":"audit_insforge_leak_2","relation":"addresses","confidence":"INFERRED","confidence_score":0.95,"source_file":"GRAPH_REPORT.md","source_location":None,"weight":1.0},
    {"source":"migration_plan","target":"audit_env_leak","relation":"addresses","confidence":"INFERRED","confidence_score":0.95,"source_file":"GRAPH_REPORT.md","source_location":None,"weight":1.0},
]

all_nodes = ast.get('nodes', []) + audit_nodes
all_edges = ast.get('edges', []) + audit_edges

extraction = {'nodes': all_nodes, 'edges': all_edges, 'hyperedges': [], 'input_tokens': 0, 'output_tokens': 0}
Path('.graphify_extract.json').write_text(json.dumps(extraction, indent=2, ensure_ascii=False), encoding='utf-8')

G = build_from_json(extraction)
communities = cluster(G)
cohesion = score_all(G, communities)
gods = god_nodes(G)
surprises = surprising_connections(G, communities)
labels = {cid: 'Community ' + str(cid) for cid in communities}

detection = {'total_files': 168, 'total_words': 163426, 'needs_graph': True, 'warning': None, 'files': {'code': 167, 'document': 0, 'paper': 0, 'image': 1, 'video': 0}}
tokens = {'input': 0, 'output': 0}

report = generate(G, communities, cohesion, labels, gods, surprises, detection, tokens, 'wimrux_app/src', suggested_questions=suggest_questions(G, communities, labels))
Path('graphify-out/GRAPH_REPORT.md').write_text(report, encoding='utf-8')

to_json(G, communities, 'graphify-out/graph.json')

if G.number_of_nodes() <= 5000:
    to_html(G, communities, 'graphify-out/graph.html', community_labels=labels)
    print('graph.html written')
else:
    print('Graph too large for HTML')

print(f'Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges, {len(communities)} communities')
print('Report: graphify-out/GRAPH_REPORT.md')
