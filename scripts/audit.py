#!/usr/bin/env python3
"""Fail closed if images, unknown files, private paths or changed vendors enter the ZIP."""
import hashlib
import json
import re
from pathlib import Path
from zipfile import ZipFile
from build import ROOT, OUTPUT, build, runtime_files

allowed = {
    'manifest.json', 'README.md', 'LICENSE', 'NOTICE.md', 'index.html',
    'appearance.mjs', 'doll-appearance.js', 'garment-rig.js', 'photo-head.js',
    'pose.mjs', 'ragdoll-adapter.js', 'recovery-pose.mjs', 'release-motion.mjs',
    'renderer.mjs', 'sdk-bridge.mjs', 'data-contract.mjs', 'texture-budget.mjs',
    'vendor/three.module.js', 'vendor/cannon-es.js', 'vendor/LICENSE.three',
    'upstream/LICENSE.cannon-es', 'upstream/provenance.json', 'upstream/ragdoll.html',
}
assert set(runtime_files()) == allowed, 'Unexpected runtime content'
with ZipFile(OUTPUT / 'plugin.zip') as z:
    assert set(z.namelist()) == allowed
    for name, source in runtime_files().items():
        assert z.read(name) == source.read_bytes(), 'Source/ZIP mismatch: ' + name
        content = z.read(name).decode('utf-8')
        assert not re.search(r'/Users/|file:///|codex-clipboard|data:image/[^;]+;base64,', content), name
        assert not name.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.glb', '.bin'))
provenance = json.loads((ROOT / 'src/upstream/provenance.json').read_text())
for name, expected in provenance['sha256'].items():
    assert hashlib.sha256((ROOT / 'src' / name).read_bytes()).hexdigest() == expected, name
manifest = json.loads((ROOT / 'manifest.json').read_text())
assert manifest['kind'] == ['appearance-renderer'] and manifest['permissions'] == ['appearance:render']
assert manifest['entry'] == {'renderer': {'src': 'index.html', 'apiVersion': 1, 'dataVersions': [2]}}
before = (OUTPUT / 'plugin.zip').read_bytes()
build()
assert before == (OUTPUT / 'plugin.zip').read_bytes(), 'Non-reproducible build'
print('PASS: source parity, exact file allowlist, zero character images, vendor checksums, deterministic rebuild')
