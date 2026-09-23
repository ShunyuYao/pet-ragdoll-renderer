#!/usr/bin/env python3
"""Deterministic, source-only ZIP. No dependency install or private input."""
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_STORED

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'dist'

def runtime_files():
    files = {name: ROOT / name for name in ['manifest.json', 'README.md', 'LICENSE', 'NOTICE.md']}
    for path in sorted((ROOT / 'src').rglob('*')):
        if path.is_symlink():
            raise ValueError('Symlinks are not distributable')
        if path.is_file():
            files[path.relative_to(ROOT / 'src').as_posix()] = path
    return files

def build():
    OUTPUT.mkdir(exist_ok=True)
    with ZipFile(OUTPUT / 'plugin.zip', 'w') as package:
        for name, source in sorted(runtime_files().items()):
            info = ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_STORED
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            package.writestr(info, source.read_bytes())
    digest = hashlib.sha256((OUTPUT / 'plugin.zip').read_bytes()).hexdigest()
    (OUTPUT / 'sha256.txt').write_text(digest + '  plugin.zip\n')
    manifest = json.loads((ROOT / 'manifest.json').read_text())
    print(json.dumps({'version': manifest['version'], 'sha256': digest, 'bytes': (OUTPUT / 'plugin.zip').stat().st_size}))

if __name__ == '__main__':
    build()
