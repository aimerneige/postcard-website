#!/usr/bin/env python3
"""Verify tracked fonts; restore missing files from pinned sources."""
from __future__ import annotations
import hashlib
import io
import json
from pathlib import Path
from urllib.request import Request, urlopen
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
SOURCES = json.loads((ROOT / 'public/licenses/font-sources.json').read_text())


def download(url: str) -> bytes:
    request = Request(url, headers={'User-Agent': 'postcard-website-build/1.0'})
    with urlopen(request, timeout=90) as response:
        return response.read()


def target(entry: dict) -> Path:
    return ROOT / 'src/assets/fonts' / entry['file']


def prepare(entry: dict) -> None:
    output = target(entry)
    expected = entry['sha256']
    if output.exists() and hashlib.sha256(output.read_bytes()).hexdigest() == expected:
        return
    if 'officialArchive' in entry:
        archive = download(entry['officialArchive'])
        archive_hash = hashlib.sha256(archive).hexdigest()
        if archive_hash != entry['archiveSha256']:
            raise RuntimeError(f"Official archive checksum mismatch: {archive_hash}")
        with ZipFile(io.BytesIO(archive)) as bundle:
            data = bundle.read(entry['archiveMember'])
    else:
        data = download(entry['source'])
    found = hashlib.sha256(data).hexdigest()
    if found != expected or len(data) != entry['bytes']:
        raise RuntimeError(f"Font verification failed for {entry['file']}: {found}")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(data)
    print(f"Prepared {entry['file']} ({len(data)} bytes)")


if __name__ == '__main__':
    for item in SOURCES:
        prepare(item)
