#!/usr/bin/env python3
"""Verify a public IELTS .app without launching it. Usage: python3 FILE APP_PATH"""
from pathlib import Path
import re, sqlite3, sys
app = Path(sys.argv[1])
resources = app / "Contents/Resources"
assert (resources / "app/server.js").is_file()
assert (resources / "node").is_file()
assert (resources / "app.asar").is_file()
for path in resources.rglob("*"):
    if not path.is_file():
        continue
    rel = str(path.relative_to(resources))
    assert not path.name.startswith(".env"), f"Environment file: {rel}"
    assert not re.search(r"audio/listening/c(?:[4-9]|1[1-6])-", rel), f"Restricted audio: {rel}"
    assert not rel.startswith(("app/content/parsed/", "app/content/cambridge-pdfs/")), rel
    if "node_modules/" not in rel and path.suffix in {".js", ".json", ".asar", ".map"}:
        assert not re.search(rb"[\"\'](?:sk[-_][A-Za-z0-9_-]{24,}|gh[pousr]_[A-Za-z0-9]{30,})[\"\']", path.read_bytes()), f"Embedded credential: {rel}"
db = sqlite3.connect(f"file:{resources / 'template.db'}?mode=ro", uri=True)
assert db.execute("PRAGMA integrity_check").fetchone() == ("ok",)
assert not list(db.execute("PRAGMA foreign_key_check"))
content = {"Word", "Passage", "Question", "WritingPrompt", "SpeakingPrompt", "WordBook", "WordChapter", "ChapterWord"}
for (table,) in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"):
    if table not in content:
        assert db.execute('SELECT COUNT(*) FROM "' + table + '"').fetchone()[0] == 0, f"Personal records: {table}"
assert all(row[0].startswith("seed-") for row in db.execute("SELECT source FROM Passage"))
print("PASS: no .env, embedded credentials, restricted content or personal records; database integrity OK.")
print("Sample content:", {table: db.execute('SELECT COUNT(*) FROM "' + table + '"').fetchone()[0] for table in sorted(content)})
