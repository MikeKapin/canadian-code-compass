"""Diff the app's b149-2-clauses.json against the dev-tools master knowledge base.

Reports clause IDs present in the master but missing from the app (and vice
versa), per section, plus description text mismatches for shared IDs.
"""
import json
import re

KB = r"C:\LocalProjects\mcp-servers\dev-tools\csa_b149_2_knowledge_base.json"
APP = r"C:\LocalProjects\apps\canadian-code-compass\data\b149-2-clauses.json"


def norm_text(s):
    return re.sub(r"\s+", " ", (s or "")).strip().lower()


def walk(node, cid, out):
    """Collect (clause_id, title, description) recursively from master nodes."""
    out[cid] = (node.get("title", ""), node.get("description", ""))
    for key in ("subclauses", "subsubclauses", "clauses"):
        for k, v in (node.get(key) or {}).items():
            walk(v, k.replace("_", "."), out)


kb = json.load(open(KB, encoding="utf-8"))
app = json.load(open(APP, encoding="utf-8"))

master = {}          # clause id -> (title, desc), numbered clauses only
master_defs = {}     # section 3 definitions keyed by term
for sec_id, sec in kb["propane_code"]["sections"].items():
    for k, v in (sec.get("clauses") or {}).items():
        if sec_id == "section_3":
            master_defs[k] = (v.get("title", ""), v.get("description", ""))
        else:
            walk(v, k.replace("_", "."), master)

app_clauses = {r["clause"]: r for r in app if r["section"] != "3"}
app_defs = {r["clause"].split(".", 1)[1]: r for r in app if r["section"] == "3"}

missing_in_app = sorted(set(master) - set(app_clauses), key=lambda c: [int(n) for n in c.split(".")])
extra_in_app = sorted(set(app_clauses) - set(master), key=lambda c: [int(n) for n in c.split(".")])
defs_missing = sorted(set(master_defs) - set(app_defs))
defs_extra = sorted(set(app_defs) - set(master_defs))

print(f"master numbered clauses: {len(master)}  |  app numbered clauses: {len(app_clauses)}")
print(f"master definitions: {len(master_defs)}  |  app definitions: {len(app_defs)}")
print()

if missing_in_app:
    print(f"MISSING IN APP ({len(missing_in_app)}):")
    by_sec = {}
    for c in missing_in_app:
        by_sec.setdefault(c.split(".")[0], []).append(c)
    for sec, ids in sorted(by_sec.items()):
        print(f"  Section {sec}: {len(ids)} clauses")
        for c in ids:
            print(f"    {c}  {master[c][0]}")
else:
    print("MISSING IN APP: none")
print()
print(f"IN APP BUT NOT MASTER ({len(extra_in_app)}): {', '.join(extra_in_app) or 'none'}")
print(f"DEFS MISSING IN APP ({len(defs_missing)}): {', '.join(defs_missing) or 'none'}")
print(f"DEFS EXTRA IN APP ({len(defs_extra)}): {', '.join(defs_extra) or 'none'}")
print()

# text drift on shared ids
drift = []
for c in set(master) & set(app_clauses):
    if norm_text(master[c][1]) != norm_text(app_clauses[c].get("description")):
        drift.append(c)
print(f"DESCRIPTION DRIFT on shared clauses ({len(drift)}):")
for c in sorted(drift, key=lambda c: [int(n) for n in c.split(".")])[:20]:
    print(f"  {c}: master='{norm_text(master[c][1])[:90]}' app='{norm_text(app_clauses[c].get('description'))[:90]}'")
