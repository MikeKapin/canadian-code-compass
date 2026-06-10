"""Merge new scenario batches into data/scenario-index.json with validation.

Validates before writing:
- unique ids across existing + new
- required fields present and non-empty
- severity is a known value
- primary_clause and related_clauses exist in the matching clause data file
- tssa_tag_citation matches code_standard + primary_clause
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REQUIRED = [
    "id", "violation_descriptions", "trade_synonyms", "primary_clause",
    "related_clauses", "code_standard", "plain_language_rule",
    "tssa_tag_citation", "severity", "last_verified",
]
SEVERITIES = {"immediate_hazard", "code_violation", "documentation"}


def load(p):
    return json.loads((ROOT / p).read_text(encoding="utf-8"))


def main():
    existing = load("data/scenario-index.json")
    new = load("scripts/new-scenarios-1.json") + load("scripts/new-scenarios-2.json")
    clauses = {
        "B149.1-25": {c["clause"] for c in load("data/b149-1-clauses.json")},
        "B149.2-25": {c["clause"] for c in load("data/b149-2-clauses.json")},
    }

    errors = []
    seen = {s["id"] for s in existing}
    for s in new:
        sid = s.get("id", "<missing id>")
        for f in REQUIRED:
            if f not in s or s[f] in ("", None):
                errors.append(f"{sid}: missing field {f}")
        if sid in seen:
            errors.append(f"{sid}: duplicate id")
        seen.add(sid)
        if s.get("severity") not in SEVERITIES:
            errors.append(f"{sid}: bad severity {s.get('severity')}")
        std = s.get("code_standard")
        pool = clauses.get(std)
        if pool is None:
            errors.append(f"{sid}: unknown code_standard {std}")
            continue
        if s["primary_clause"] not in pool:
            errors.append(f"{sid}: primary clause {s['primary_clause']} not in {std} data")
        for rc in s.get("related_clauses", []):
            if rc not in pool:
                errors.append(f"{sid}: related clause {rc} not in {std} data")
        expect = f"CSA {std} Clause {s['primary_clause']}"
        if s["tssa_tag_citation"] != expect:
            errors.append(f"{sid}: citation '{s['tssa_tag_citation']}' != '{expect}'")

    if errors:
        print("VALIDATION FAILED:")
        for e in errors:
            print("  " + e)
        sys.exit(1)

    merged = existing + new
    out = ROOT / "data/scenario-index.json"
    out.write_text(json.dumps(merged, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    by_std = {}
    for s in merged:
        by_std[s["code_standard"]] = by_std.get(s["code_standard"], 0) + 1
    print(f"OK: merged {len(new)} new scenarios, total {len(merged)} ({by_std})")


if __name__ == "__main__":
    main()
