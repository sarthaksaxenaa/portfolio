"""Export what the "What I build" demos need from a CareNexus checkout.

The AI demo runs CareNexus's rule-based triage path in the browser. Rather than re-typing its
knowledge base, this script builds the index with CareNexus's own code and writes it as data, so
the browser only has to embed a query and compare. It also writes:
  - golden answers from the Python code, which the portfolio's unit tests compare against, and
  - the name of every test CareNexus runs, for the test replay.

Run it with CareNexus's backend environment (it imports `app.*`), from the portfolio root:
    python scripts/demos/export_carenexus.py ../carenexus \
        --tests-backend backend.txt --tests-unit unit.txt --tests-e2e e2e.txt
where the three lists come from `pytest --collect-only -q`, `vitest list` and
`playwright test --list` in that checkout.
"""

import argparse
import ast
import inspect
import json
import re
import subprocess
import sys
from pathlib import Path

OUT = Path("public/demos")
GOLDEN = Path("tests/fixtures/carenexus-golden.json")

# Questions the golden file pins: everyday phrasings, durations, escalations, red flags, nonsense.
GOLDEN_QUERIES = [
    "chest pain spreading to my left arm",
    "I can't breathe properly",
    "my face is drooping on one side",
    "she passed out and won't wake up",
    "coughing up blood since yesterday",
    "I want to die",
    "runny nose and sneezing",
    "runny nose and sneezing for 10 days",
    "sore throat for 3 days",
    "headache",
    "headache for 2 weeks",
    "tummy ache after eating",
    "burning when I pee",
    "itchy red rash on my arm",
    "fever, chills and body aches",
    "fever, cough, fatigue and sore throat",
    "back pain after lifting weights",
    "ear pain and fever in my child",
    "feeling dizzy when I stand up",
    "toothache for a week",
    "I twisted my ankle playing football",
    "heartburn after spicy food",
    "can't sleep at night",
    "my blood looks weird",
    "pain",
    "I feel tired all the time",
    "what is the capital of France",
    "",
]


def first_line_title(message: str) -> str:
    """'**EMERGENCY — Possible Cardiac Event**\\n...' -> 'Possible Cardiac Event'."""
    line = message.strip().splitlines()[0].strip("* ")
    return line.split("—", 1)[1].strip() if "—" in line else line


def fallback_keywords(fn) -> dict[str, list[str]]:
    """The keyword lists _fallback_response uses when retrieval finds nothing (local variables, so read
    from its source rather than copied by hand)."""
    found: dict[str, list[str]] = {}
    for node in ast.walk(ast.parse(inspect.getsource(fn).lstrip())):
        if isinstance(node, ast.Assign) and isinstance(node.value, ast.List):
            name = getattr(node.targets[0], "id", "")
            if name.endswith("_keywords"):
                found[name.removesuffix("_keywords")] = [ast.literal_eval(e) for e in node.value.elts]
    if set(found) != {"severe", "moderate", "mild"}:
        sys.exit(f"unexpected fallback keyword lists: {sorted(found)}")
    return found


def git(repo: Path, *args: str) -> str:
    return subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True, check=True).stdout.strip()


def tests_payload(backend: Path, unit: Path, e2e: Path, stats: dict) -> dict:
    files: list[str] = []
    tests: list[list] = []

    def fid(f: str) -> int:
        if f not in files:
            files.append(f)
        return files.index(f)

    for line in backend.read_text().splitlines():
        if "::" in line:
            f, name = line.strip().split("::", 1)
            tests.append([0, fid("backend/" + f), name.replace("_", " ")])
    for line in unit.read_text().splitlines():
        parts = [p.strip() for p in line.split(" > ")]
        if len(parts) > 1:
            tests.append([1, fid("frontend/" + parts[0]), " › ".join(parts[1:])])
    for line in e2e.read_text().splitlines():
        m = re.match(r"\s*\[\w+\] › ([^:]+):\d+:\d+ › (.*)", line)
        if m:
            tests.append([2, fid("frontend/e2e/" + m.group(1)), m.group(2).strip()])
    counts = [sum(1 for t in tests if t[0] == s) for s in range(3)]
    expected = [stats["tests"]["backend"], stats["tests"]["unit"], stats["tests"]["e2e"]]
    if counts != expected:
        sys.exit(f"test lists {counts} do not match CareNexus's stats {expected}; collect them again")
    return {
        "suites": ["backend · pytest", "frontend · vitest", "end to end · playwright"],
        "coverage": stats["coverage"],
        "lastGreen": stats["updated"][:10],
        "files": files,
        "tests": tests,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("carenexus", type=Path)
    ap.add_argument("--tests-backend", type=Path, required=True)
    ap.add_argument("--tests-unit", type=Path, required=True)
    ap.add_argument("--tests-e2e", type=Path, required=True)
    a = ap.parse_args()
    repo = a.carenexus.resolve()
    sys.path.insert(0, str(repo / "backend"))

    from app.core.triage.engine import _fallback_response
    from app.core.triage.red_flags import RED_FLAG_PATTERNS, check_red_flags
    from app.core.triage.symptom_parser import _DURATION_PATTERNS, _SYMPTOM_KEYWORDS
    from app.rag.synonyms import _SYNONYM_MAP
    from app.rag.vectorizer import STOP_WORDS, get_vectorizer

    v = get_vectorizer()
    terms = sorted(v._idf)
    index = {t: i for i, t in enumerate(terms)}
    conditions = []
    for doc, vec in zip(v._documents, v._tfidf_vectors):
        c = v._condition_map[doc.condition_id]
        pairs = sorted((index[t], round(w, 6)) for t, w in vec.items())
        conditions.append({
            "id": c.id, "name": c.name, "category": c.category, "severity": c.severity,
            "sex": c.sex, "symptoms": [s.lower() for s in c.symptoms],
            "t": [p[0] for p in pairs], "w": [p[1] for p in pairs],
        })
    commit = git(repo, "rev-parse", "--short", "HEAD")
    triage = {
        "source": f"github.com/sarthaksaxenaa/carenexus@{commit}",
        "stopWords": sorted(STOP_WORDS),
        "synonyms": {k: sorted(vs) for k, vs in sorted(_SYNONYM_MAP.items())},
        "terms": terms,
        "idf": [round(v._idf[t], 6) for t in terms],
        "conditions": conditions,
        "redFlags": [
            {"title": first_line_title(p["message"]), "crisis": "Not Alone" in p["message"], "patterns": p["patterns"]}
            for p in RED_FLAG_PATTERNS
        ],
        "symptomKeywords": list(_SYMPTOM_KEYWORDS),
        "durations": [[p.pattern, m] for p, _, m in _DURATION_PATTERNS],
        "fallbackKeywords": fallback_keywords(_fallback_response),
    }

    golden = []
    for q in GOLDEN_QUERIES:
        flag = check_red_flags(q)
        if flag:
            golden.append({"q": q, "level": "red", "redFlag": first_line_title(flag["message"]), "top": None})
            continue
        top = v.search(q, top_k=3, threshold=0.08)
        level = _fallback_response(q, None, None, None)["triage_level"].value
        golden.append({"q": q, "level": level, "redFlag": None,
                       "top": [{"id": c.id, "score": s} for c, s in top]})

    stats = json.loads((repo / "docs/assets/stats.json").read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    GOLDEN.parent.mkdir(parents=True, exist_ok=True)
    (OUT / "carenexus-triage.json").write_text(json.dumps(triage, separators=(",", ":"), ensure_ascii=False))
    (OUT / "carenexus-tests.json").write_text(json.dumps(
        tests_payload(a.tests_backend, a.tests_unit, a.tests_e2e, stats), separators=(",", ":"), ensure_ascii=False))
    GOLDEN.write_text(json.dumps({"source": triage["source"], "cases": golden}, indent=1, ensure_ascii=False) + "\n")
    print(f"{len(conditions)} conditions, {len(terms)} terms, {len(golden)} golden cases from {commit}")


if __name__ == "__main__":
    main()
