"""
Export the audited B149.2-25 clause data from the Canadian Code Compass app
into a master content folder mirroring the B149.1-25 Code Content layout.

Source : apps/canadian-code-compass/data/b149-2-clauses.json (303 records, verbatim-accurate)
Target : C:/LocalProjects/content/kevin-hvac/CSA B149.2-25 Code Content/
"""
import json
import os
import re

SRC = r"C:\LocalProjects\apps\canadian-code-compass\data\b149-2-clauses.json"
OUT = r"C:\LocalProjects\content\kevin-hvac\CSA B149.2-25 Code Content"

# Section -> filename stem (mirrors "B149.1-25 Sec 4 General.txt" convention)
FILE_STEMS = {
    "3": "B149.2-25 Sec 3 Definitions",
    "4": "B149.2-25 Sec 4 General",
    "5": "B149.2-25 Sec 5 General Requirements for Propane and Propane Equipment",
    "6": "B149.2-25 Sec 6 Cylinder Systems",
    "7": "B149.2-25 Sec 7 Tank Systems Filling Plants and Refill Centres",
    "8": "B149.2-25 Sec 8 Tank Trucks Tank Trailers and Cargo Liners",
    "9": "B149.2-25 Sec 9 Vaporizers",
}

os.makedirs(OUT, exist_ok=True)
data = json.load(open(SRC, encoding="utf-8"))


def sort_key(rec):
    """Numeric sort for X.Y.Z clauses; definitions (3.<term>) sort by title."""
    c = rec["clause"]
    nums = re.findall(r"\d+", c)
    if rec["section"] == "3":
        # definitions: keep alphabetical by title
        return (0,)
    return tuple(int(n) for n in nums) if nums else (9999,)


def render_clause(rec):
    """One clause block: number + title heading, then indented description."""
    c = rec["clause"]
    title = (rec.get("title") or "").strip()
    desc = (rec.get("description") or "").strip()
    if rec["section"] == "3":
        # Definition: term as heading, no clause number
        head = title
    else:
        head = f"{c}  {title}".rstrip()
    out = [head]
    if desc:
        for line in desc.splitlines():
            out.append("    " + line.rstrip())
    return "\n".join(out)


# Group by section
sections = {}
for r in data:
    sections.setdefault(r["section"], []).append(r)

EDITION_LINE = "CSA B149.2-25  Propane Storage and Handling Code (February 2025)"
PROVENANCE = (
    "Source: extracted from the Canadian Code Compass app data set\n"
    "(apps/canadian-code-compass/data/b149-2-clauses.json), verified\n"
    "verbatim-accurate against the dev-tools master (2026-06-01 audit;\n"
    "Section 7 completed 2026-06-10 from the post-sec7-fix master).\n"
    "Clause text is the code wording; no source PDF accompanies this export."
)

written = []
combined = [EDITION_LINE, "=" * len(EDITION_LINE), "", PROVENANCE, ""]

for sec in sorted(sections, key=lambda s: int(s)):
    recs = sections[sec]
    if sec == "3":
        recs = sorted(recs, key=lambda r: (r.get("title") or "").lower())
    else:
        recs = sorted(recs, key=sort_key)
    sec_title = recs[0].get("section_title", "")
    header = f"SECTION {sec} - {sec_title}"
    body = [EDITION_LINE, header, "=" * len(header), ""]
    for r in recs:
        body.append(render_clause(r))
        body.append("")
    text = "\n".join(body).rstrip() + "\n"

    stem = FILE_STEMS.get(sec, f"B149.2-25 Sec {sec}")
    path = os.path.join(OUT, stem + ".txt")
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    written.append((stem + ".txt", len(recs)))

    combined.append(header)
    combined.append("-" * len(header))
    combined.append("")
    for r in recs:
        combined.append(render_clause(r))
        combined.append("")

# Combined master text
with open(os.path.join(OUT, "B149.2-25 Full Code Text.txt"), "w", encoding="utf-8") as f:
    f.write("\n".join(combined).rstrip() + "\n")

# Structured JSON copy (native form, for future dev-tools ingestion)
with open(os.path.join(OUT, "b149-2-25-clauses.json"), "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Wrote {len(written)} section files + combined + JSON to:\n  {OUT}\n")
for name, n in written:
    print(f"  {name}  ({n} records)")
print(f"\nTotal records exported: {len(data)}")
