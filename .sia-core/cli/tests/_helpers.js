'use strict';

/**
 * Utilitários dos testes: cópia da fixture para diretório temporário, execução da CLI e dos hooks.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const CLI_DIR = path.resolve(__dirname, '..');
const SIA_JS = path.join(CLI_DIR, 'sia.js');
const HOOKS_DIR = path.resolve(CLI_DIR, '..', 'hooks');
const FIXTURES = path.join(__dirname, 'fixtures');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else if (entry.isFile()) fs.copyFileSync(from, to);
  }
}

function tempDir(prefix = 'sia-test-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/** Copia a fixture `mini` para um diretório temporário e devolve a raiz. */
function makeProject(name = 'mini') {
  const root = tempDir();
  copyDir(path.join(FIXTURES, name), root);
  return root;
}

function cleanup(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // ignorado
  }
}

/** Executa a CLI como processo filho. */
function runCli(args, options = {}) {
  const env = { ...process.env, NO_COLOR: '1', ...(options.env || {}) };
  delete env.FORCE_COLOR;
  const result = spawnSync(process.execPath, [SIA_JS, ...args], {
    cwd: options.cwd,
    env,
    encoding: 'utf8',
    input: options.input,
  });
  let json = null;
  if (args.includes('--json')) {
    try {
      json = JSON.parse(result.stdout);
    } catch {
      json = null;
    }
  }
  return { code: result.status, stdout: result.stdout, stderr: result.stderr, json };
}

/** Executa um hook com o payload no stdin. */
function runHook(name, input, options = {}) {
  const env = { ...process.env, ...(options.env || {}) };
  for (const key of ['SIA_ACTIVE_AGENT', 'CLAUDE_PROJECT_DIR', 'GEMINI_PROJECT_DIR', 'GROK_WORKSPACE_ROOT']) {
    if (!options.env || !(key in options.env)) delete env[key];
  }
  const result = spawnSync(process.execPath, [path.join(HOOKS_DIR, name)], {
    cwd: options.cwd,
    env,
    encoding: 'utf8',
    input: typeof input === 'string' ? input : JSON.stringify(input),
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

function write(root, rel, content) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
  return file;
}

function read(root, rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

/**
 * Story no formato canônico (guia de autoria, seção 6.1).
 * @param {{ status: string, files?: string[], tasks?: string[], qa?: string[], title?: string }} spec
 */
function storyText(id, spec) {
  const tasks = spec.tasks || ['- [x] 1. Implementar (CA: 1)'];
  const files = spec.files === undefined ? ['- `src/app.ts`'] : spec.files;
  return [
    `# Story ${id}: ${spec.title || 'Story de teste'}`,
    '',
    '## Status',
    spec.status,
    '',
    '## Tasks / Subtasks',
    ...tasks,
    '',
    '## Registro do Dev',
    '### File List',
    ...files,
    '',
    '## Resultado do QA',
    ...(spec.qa || []),
    '',
    '## Change Log',
    '| Data | Agente | Mudança |',
    '|------|--------|---------|',
    '',
  ].join('\n');
}

function writeStory(root, id, spec) {
  return write(root, `docs/stories/${id}-teste.story.md`, storyText(id, spec));
}

function qaBlock({ gate, reviewer = '@pm (Mira) [Qualidade]', revision = 'abc1234', gateFile }) {
  const lines = [`- **Gate:** ${gate}`];
  if (reviewer) lines.push(`- **Revisor:** ${reviewer}`);
  if (revision) lines.push(`- **Revisão:** ${revision}`);
  lines.push('- **Data:** 2026-10-16');
  if (gateFile) lines.push(`- **Arquivo do gate:** ${gateFile}`);
  lines.push('- **Resumo:** teste');
  return lines;
}

module.exports = {
  CLI_DIR,
  SIA_JS,
  HOOKS_DIR,
  FIXTURES,
  copyDir,
  tempDir,
  makeProject,
  cleanup,
  runCli,
  runHook,
  write,
  read,
  storyText,
  writeStory,
  qaBlock,
};
