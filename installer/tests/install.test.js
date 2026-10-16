'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { patchConfig, parseIdes, buildBundle } = require('../sia-install.js');

const INSTALLER = path.join(__dirname, '..', 'sia-install.js');
const run = (args, cwd) => spawnSync(process.execPath, [INSTALLER, ...args], { cwd, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });
const tmp = (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sia-install-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
};

test('install --yes cria .sia-core, docs, .gitignore e projeções das IDEs escolhidas', (t) => {
  const dir = tmp(t);
  const target = path.join(dir, 'meu-app');
  const result = run(['install', target, '--yes', '--name', 'Meu App', '--type', 'brownfield', '--ide', 'claude-code,grok'], dir);
  assert.equal(result.status, 0, result.stderr + result.stdout);
  const config = fs.readFileSync(path.join(target, '.sia-core/core-config.yaml'), 'utf8');
  assert.match(config, /^ {2}name: 'Meu App'/m);
  assert.match(config, /^ {2}type: brownfield/m);
  assert.match(config, /targets:\n {4}- claude-code\n {4}- grok\n {2}slashPrefix/);
  assert.ok(fs.existsSync(path.join(target, '.claude/skills/sia-pm/SKILL.md')));
  assert.ok(fs.existsSync(path.join(target, '.grok/skills/sia-dev/SKILL.md')));
  assert.ok(!fs.existsSync(path.join(target, '.agents')), 'Codex não foi escolhido');
  assert.ok(!fs.existsSync(path.join(target, '.sia-core/cli/tests')), 'testes da CLI não vão para o projeto');
  assert.ok(fs.existsSync(path.join(target, 'docs/stories/.gitkeep')));
  assert.match(fs.readFileSync(path.join(target, '.gitignore'), 'utf8'), /^\.sia\/$/m);
});

test('update preserva core-config, memórias e preferências e remove arquivos obsoletos', (t) => {
  const dir = tmp(t);
  assert.equal(run(['install', dir, '--yes', '--name', 'x', '--type', 'greenfield', '--ide', 'claude-code'], dir).status, 0);
  const memory = path.join(dir, '.sia-core/agents/pm/MEMORY.md');
  fs.appendFileSync(memory, '\nnota do projeto\n');
  const obsolete = path.join(dir, '.sia-core/tasks/obsoleta.md');
  fs.writeFileSync(obsolete, 'velha');
  const result = run(['update', dir], dir);
  assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.match(fs.readFileSync(memory, 'utf8'), /nota do projeto/);
  assert.match(fs.readFileSync(path.join(dir, '.sia-core/core-config.yaml'), 'utf8'), /^ {2}name: 'x'/m);
  assert.ok(!fs.existsSync(obsolete));
  const backups = fs.readdirSync(path.join(dir, '.sia/backups'));
  assert.equal(backups.length, 1);
  assert.match(fs.readFileSync(path.join(dir, '.gitignore'), 'utf8').match(/^\.sia\/$/gm).join(''), /^\.sia\/$/);
});

test('comandos da CLI são repassados para o projeto instalado', (t) => {
  const dir = tmp(t);
  assert.equal(run(['install', dir, '--yes', '--name', 'x', '--type', 'greenfield', '--ide', 'claude-code'], dir).status, 0);
  const sub = path.join(dir, 'docs');
  const result = run(['validate'], sub);
  assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.match(result.stdout, /Validação concluída/);
  const outside = run(['doctor'], tmp(t));
  assert.equal(outside.status, 2);
  assert.match(outside.stderr, /sia install/);
});

test('patchConfig, parseIdes e bundle', () => {
  const text = "project:\n  name: ''                    # nome\n  type: greenfield            # tipo\nide:\n  targets:\n    - claude-code\n    - codex                   # x\n  slashPrefix: SIA\n";
  const out = patchConfig(text, { name: "O'Brien", type: 'brownfield', ides: ['gemini'] });
  assert.match(out, /name: 'O''Brien' {20}# nome/);
  assert.match(out, /type: brownfield {12}# tipo/);
  assert.match(out, /targets:\n {4}- gemini\n {2}slashPrefix/);
  assert.deepEqual(parseIdes('claude,codex'), ['claude-code', 'codex']);
  assert.throws(() => parseIdes('cursor'), /IDE desconhecida/);
  const bundle = buildBundle();
  assert.ok(bundle.files['core-config.yaml']);
  assert.ok(bundle.files['cli/sia.js']);
  assert.ok(!Object.keys(bundle.files).some((rel) => rel.startsWith('cli/tests/')));
});
