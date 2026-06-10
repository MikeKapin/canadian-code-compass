"""Import missing B149.2-25 Section 7 clauses from the dev-tools master
knowledge base into the app's data/b149-2-clauses.json.

Adds only clause IDs not already present, mirrors the app's record shape
exactly, and rewrites the section 7 block in numeric clause order. All other
sections are left byte-identical.
"""
import json

KB = r"C:\LocalProjects\mcp-servers\dev-tools\csa_b149_2_knowledge_base.json"
APP = r"C:\LocalProjects\apps\canadian-code-compass\data\b149-2-clauses.json"

kb = json.load(open(KB, encoding="utf-8"))
app = json.load(open(APP, encoding="utf-8"))

sec7 = kb["propane_code"]["sections"]["section_7"]
sec_title = sec7["title"]

# Flatten master section 7: parents (title only) + one level of subclauses
master = {}
for cid, node in sec7["clauses"].items():
    master[cid.replace("_", ".")] = node
    for sid, sub in (node.get("subclauses") or {}).items():
        master[sid.replace("_", ".")] = sub

existing = {r["clause"] for r in app if r["section"] == "7"}
new_records = []
for cid, node in master.items():
    if cid in existing:
        continue
    new_records.append({
        "clause": cid,
        "title": node.get("title", ""),
        "section": "7",
        "section_title": sec_title,
        "description": node.get("description", ""),
        "type": "clause",
    })

# Rebuild: non-section-7 records keep their original order; section 7 block
# (old + new) is sorted numerically and inserted where section 7 started.
sec7_records = [r for r in app if r["section"] == "7"] + new_records
sec7_records.sort(key=lambda r: [int(n) for n in r["clause"].split(".")])

out = []
inserted = False
for r in app:
    if r["section"] == "7":
        if not inserted:
            out.extend(sec7_records)
            inserted = True
        continue
    out.append(r)
if not inserted:
    out.extend(sec7_records)

json.dump(out, open(APP, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
print(f"imported {len(new_records)} new section 7 clauses")
print(f"section 7 now has {len(sec7_records)} records; file total {len(out)}")
