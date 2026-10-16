#!/usr/bin/env node
'use strict';

// Gera dist/sia-core.bundle.json: o .sia-core inteiro (sem testes) embutido no executável.
const fs = require('fs');
const path = require('path');
const { buildBundle } = require('../installer/sia-install.js');

const out = path.join(__dirname, '..', 'dist', 'sia-core.bundle.json');
const bundle = buildBundle();
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(bundle));
console.log(`bundle: ${Object.keys(bundle.files).length} arquivos, v${bundle.version} → ${path.relative(process.cwd(), out)}`);
