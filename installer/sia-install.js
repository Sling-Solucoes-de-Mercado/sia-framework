#!/usr/bin/env node
'use strict';

/**
 * Instalador e ponto de entrada único do SIA (Sling Inteligência Artificial).
 *
 * Funciona de três jeitos, com o mesmo código:
 *   1. Executável (Node single executable): o .sia-core vem embutido como asset.
 *   2. `npx github:Sling-Solucoes-de-Mercado/sia-framework`: lê o .sia-core do pacote.
 *   3. `node installer/sia-install.js` num clone do repositório.
 *
 * Usa só módulos nativos do Node: o executável não pode carregar arquivos do pacote.
 * Depois de instalar, os comandos da CLI (doctor, sync, story...) rodam a CLI do
 * próprio projeto via createRequire.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');
const { spawnSync } = require('child_process');
const { createRequire } = require('module');
const { parseArgs } = require('util');

const REPO = 'Sling-Solucoes-de-Mercado/sia-framework';
const BUNDLE_ASSET = 'sia-core.bundle.json';
const CORE_DIR = '.sia-core';
const CONFIG_FILE = 'core-config.yaml';
const MIN_NODE_MAJOR = 22;

const IDES = [
  { id: 'claude-code', label: 'Claude Code' },
  { id: 'codex', label: 'Codex (ChatGPT)' },
  { id: 'gemini', label: 'Gemini CLI' },
  { id: 'grok', label: 'Grok Build' },
];

/** Comandos repassados para a CLI do projeto instalado. */
const CLI_COMMANDS = new Set(['doctor', 'validate', 'sync', 'story', 'sdc', 'mcp', 'squad', 'agent']);

/** Arquivos do projeto que uma atualização nunca sobrescreve (personalizados por projeto). */
const PRESERVED = [/^core-config\.yaml$/, /^agents\/[^/]+\/MEMORY\.md$/, /^data\/technical-preferences\.md$/];

/** O que não vai para o projeto. */
const SKIP_DIRS = new Set(['node_modules', '.git']);
const SKIP_PREFIXES = ['cli/tests/'];

const DOC_DIRS = ['docs/prd', 'docs/architecture', 'docs/stories', 'docs/qa/gates', 'docs/qa/inspections', 'docs/qa/assessments'];

// ─── Saída ──────────────────────────────────────────────────────────────

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code) => (text) => (useColor ? `\x1b[${code}m${text}\x1b[0m` : String(text));
const c = { bold: paint('1'), green: paint('32'), yellow: paint('33'), red: paint('31'), gray: paint('90'), cyan: paint('36') };
const log = (msg = '') => process.stdout.write(`${msg}\n`);
const warn = (msg) => process.stderr.write(`${c.yellow('⚠')} ${msg}\n`);

class InstallError extends Error {
  constructor(message, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
  }
}

// ─── Framework (fonte dos arquivos) ─────────────────────────────────────

function isSea() {
  try {
    return require('node:sea').isSea();
  } catch {
    return false;
  }
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function shouldSkip(rel) {
  return SKIP_PREFIXES.some((prefix) => rel.startsWith(prefix));
}

/** Lê os arquivos do .sia-core local (clone ou pacote npx). */
function collectLocalFiles(coreDir) {
  const files = new Map();
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const abs = path.join(dir, entry.name);
      const rel = toPosix(path.relative(coreDir, abs));
      if (entry.isDirectory()) {
        if (!shouldSkip(`${rel}/`)) walk(abs);
      } else if (entry.isFile() && !shouldSkip(rel)) {
        files.set(rel, fs.readFileSync(abs));
      }
    }
  };
  walk(coreDir);
  return files;
}

function readPackageVersion() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')).version;
  } catch {
    return '0.0.0';
  }
}

/** @returns {{ version: string, files: Map<string, Buffer>, source: string }} */
function loadFramework() {
  if (isSea()) {
    const bundle = JSON.parse(require('node:sea').getAsset(BUNDLE_ASSET, 'utf8'));
    const files = new Map(Object.entries(bundle.files).map(([rel, b64]) => [rel, Buffer.from(b64, 'base64')]));
    return { version: bundle.version, files, source: 'executável' };
  }
  const coreDir = path.resolve(__dirname, '..', CORE_DIR);
  if (!fs.existsSync(path.join(coreDir, CONFIG_FILE))) {
    throw new InstallError(`não encontrei ${CORE_DIR}/${CONFIG_FILE} ao lado do instalador (${coreDir}).`);
  }
  return { version: readPackageVersion(), files: collectLocalFiles(coreDir), source: coreDir };
}

/** Monta o bundle embutido no executável (usado por scripts/build-bundle.js). */
function buildBundle() {
  const coreDir = path.resolve(__dirname, '..', CORE_DIR);
  const files = {};
  for (const [rel, buf] of [...collectLocalFiles(coreDir)].sort(([a], [b]) => a.localeCompare(b))) {
    files[rel] = buf.toString('base64');
  }
  return { version: readPackageVersion(), files };
}

// ─── Utilidades ─────────────────────────────────────────────────────────

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function isSymlink(p) {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

function writeFile(abs, content) {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-');
}

function findProjectRoot(start) {
  let dir = path.resolve(start);
  for (;;) {
    if (exists(path.join(dir, CORE_DIR, CONFIG_FILE))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function nodeStatus() {
  const result = spawnSync('node', ['--version'], { encoding: 'utf8', shell: process.platform === 'win32' });
  if (result.status !== 0 || !result.stdout) return { ok: false, version: null };
  const version = result.stdout.trim();
  const major = Number(version.replace(/^v/, '').split('.')[0]);
  return { ok: major >= MIN_NODE_MAJOR, version };
}

function looksBrownfield(target) {
  return ['package.json', 'src', 'app', 'pyproject.toml', 'go.mod', 'composer.json'].some((name) => exists(path.join(target, name)));
}

// ─── core-config ────────────────────────────────────────────────────────

function yamlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

/** Ajusta o core-config por texto, preservando os comentários do arquivo. */
function patchConfig(text, { name, type, ides }) {
  let out = text;
  out = out.replace(/^( {2}name: ).*?(\s+#.*)?$/m, (_, key, comment) => `${key}${yamlString(name)}${comment || ''}`);
  out = out.replace(/^( {2}type: )\S+(\s+#.*)?$/m, (_, key, comment) => `${key}${type}${comment || ''}`);
  out = out.replace(/^( {2}targets:\n)((?: {4}- .*\n)+)/m, (_, head) => `${head}${ides.map((id) => `    - ${id}\n`).join('')}`);
  return out;
}

// ─── Perguntas ──────────────────────────────────────────────────────────

function createPrompter(enabled) {
  if (!enabled) return null;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (question) => new Promise((resolve) => rl.question(question, (answer) => resolve(answer.trim())));
  return { ask, close: () => rl.close() };
}

async function askChoices(prompter, defaults) {
  if (!prompter) return defaults;
  const name = (await prompter.ask(`${c.cyan('?')} Nome do projeto ${c.gray(`(${defaults.name})`)}: `)) || defaults.name;

  log(`${c.cyan('?')} Tipo de projeto:`);
  log('  1. greenfield (produto novo)');
  log('  2. brownfield (sistema existente)');
  const typeDefault = defaults.type === 'brownfield' ? '2' : '1';
  const typeAnswer = (await prompter.ask(`  Escolha ${c.gray(`(${typeDefault})`)}: `)) || typeDefault;
  const type = typeAnswer === '2' || /^b/i.test(typeAnswer) ? 'brownfield' : 'greenfield';

  log(`${c.cyan('?')} Para quais IDEs gerar a integração?`);
  IDES.forEach((ide, i) => log(`  ${i + 1}. ${ide.label}`));
  const ideAnswer = await prompter.ask(`  Números separados por vírgula ${c.gray('(todas)')}: `);
  let ides = defaults.ides;
  if (ideAnswer) {
    const picked = ideAnswer
      .split(/[\s,]+/)
      .map((token) => IDES[Number(token) - 1] || IDES.find((ide) => ide.id === token))
      .filter(Boolean)
      .map((ide) => ide.id);
    if (picked.length > 0) ides = [...new Set(picked)];
  }
  return { name, type, ides };
}

function parseIdes(value) {
  if (!value) return null;
  const ids = value.split(',').map((v) => v.trim()).filter(Boolean);
  const valid = new Set(IDES.map((ide) => ide.id));
  for (const id of ids) {
    const normalized = id === 'claude' ? 'claude-code' : id;
    if (!valid.has(normalized)) throw new InstallError(`IDE desconhecida: ${id}. Use: ${[...valid].join(', ')}.`, 2);
  }
  return ids.map((id) => (id === 'claude' ? 'claude-code' : id));
}

// ─── Instalação ─────────────────────────────────────────────────────────

/**
 * Instala ou atualiza o SIA em `target`.
 * @param {string} target
 * @param {{ yes?: boolean, name?: string, type?: string, ides?: string[]|null, framework?: object, quiet?: boolean }} options
 */
async function install(target, options = {}) {
  const framework = options.framework || loadFramework();
  const root = path.resolve(target);
  fs.mkdirSync(root, { recursive: true });
  const coreDir = path.join(root, CORE_DIR);

  if (isSymlink(coreDir)) {
    throw new InstallError(`${CORE_DIR} neste projeto é um link simbólico (sandbox de desenvolvimento). Remova o link antes de instalar.`);
  }
  const updating = exists(path.join(coreDir, CONFIG_FILE));

  const interactive = !options.yes && process.stdin.isTTY;
  const prompter = createPrompter(interactive && !updating);
  let choices;
  try {
    const defaults = {
      name: options.name || path.basename(root),
      type: options.type || (looksBrownfield(root) ? 'brownfield' : 'greenfield'),
      ides: options.ides || IDES.map((ide) => ide.id),
    };
    if (defaults.type !== 'greenfield' && defaults.type !== 'brownfield') {
      throw new InstallError(`tipo inválido: ${defaults.type}. Use greenfield ou brownfield.`, 2);
    }
    choices = updating ? null : options.name && options.type && options.ides ? defaults : await askChoices(prompter, defaults);
  } finally {
    if (prompter) prompter.close();
  }

  const report = { mode: updating ? 'update' : 'install', root, version: framework.version, written: 0, preserved: [], removed: 0, backup: null };

  if (updating) {
    // Cópia de segurança do .sia-core atual antes de atualizar.
    const backup = path.join(root, '.sia', 'backups', `install-${timestamp()}`, CORE_DIR);
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    fs.cpSync(coreDir, backup, { recursive: true, filter: (src) => !src.split(path.sep).includes('node_modules') });
    report.backup = backup;
    // Remove arquivos que saíram do framework (exceto os personalizados).
    for (const rel of collectLocalFiles(coreDir).keys()) {
      if (framework.files.has(rel) || PRESERVED.some((re) => re.test(rel))) continue;
      fs.rmSync(path.join(coreDir, rel), { force: true });
      report.removed += 1;
    }
  }

  for (const [rel, content] of framework.files) {
    const abs = path.join(coreDir, rel);
    if (updating && PRESERVED.some((re) => re.test(rel)) && exists(abs)) {
      report.preserved.push(rel);
      continue;
    }
    let data = content;
    if (!updating && rel === CONFIG_FILE) data = Buffer.from(patchConfig(content.toString('utf8'), choices), 'utf8');
    writeFile(abs, data);
    report.written += 1;
  }

  for (const rel of ['cli/sia.js', 'hooks/enforce-git-push-authority.cjs', 'hooks/track-active-agent.cjs']) {
    try {
      fs.chmodSync(path.join(coreDir, rel), 0o755);
    } catch {
      // Windows ou arquivo ausente: sem efeito.
    }
  }

  for (const dir of DOC_DIRS) {
    const abs = path.join(root, dir);
    if (!exists(abs)) {
      fs.mkdirSync(abs, { recursive: true });
      fs.writeFileSync(path.join(abs, '.gitkeep'), '');
    }
  }

  const gitignore = path.join(root, '.gitignore');
  const current = exists(gitignore) ? fs.readFileSync(gitignore, 'utf8') : '';
  if (!/^\.sia\/?$/m.test(current)) {
    fs.writeFileSync(gitignore, `${current}${current && !current.endsWith('\n') ? '\n' : ''}\n# SIA: estado local (handoffs, ciclo de story, agente ativo)\n.sia/\n`);
  }

  report.sync = runProjectCli(root, ['sync'], { capture: Boolean(options.quiet) });
  return report;
}

/** Executa a CLI instalada no projeto (funciona também dentro do executável). */
function runProjectCli(root, argv, { capture = false } = {}) {
  const cliPath = path.join(root, CORE_DIR, 'cli', 'sia.js');
  if (!exists(cliPath)) throw new InstallError(`CLI do SIA não encontrada em ${cliPath}.`);
  const cli = createRequire(cliPath)(cliPath);
  if (!capture) return cli.main(argv, { cwd: root });
  let output = '';
  const sink = { write: (chunk) => ((output += chunk), true), isTTY: false };
  const code = cli.main(argv, { cwd: root, stdout: sink, stderr: sink });
  return { code, output };
}

// ─── Comandos ───────────────────────────────────────────────────────────

function printHelp(version) {
  log(`${c.bold('SIA')}: Sling Inteligência Artificial ${c.gray(`v${version}`)}

${c.bold('Instalar ou atualizar num projeto')}
  sia install [pasta] [--yes] [--name nome] [--type greenfield|brownfield] [--ide claude-code,codex,gemini,grok]
  sia update [pasta]          atualiza o .sia-core preservando core-config, memórias e preferências

${c.bold('Comandos do projeto')} (rodam a CLI instalada no projeto)
  sia doctor | validate | sync | story | sdc | mcp | squad | agent  (use --help em cada um)

${c.bold('Outros')}
  sia version                 mostra a versão
  sia help                    mostra esta ajuda

Sem argumentos, instala no diretório atual com perguntas.
Repositório: https://github.com/${REPO}`);
}

function printSummary(report) {
  const verb = report.mode === 'update' ? 'atualizado' : 'instalado';
  log('');
  log(`${c.green('✓')} SIA ${report.version} ${verb} em ${report.root}`);
  log(`  ${report.written} arquivo(s) gravado(s) em ${CORE_DIR}/`);
  if (report.preserved.length) log(`  ${report.preserved.length} arquivo(s) do projeto preservado(s) (core-config, memórias, preferências)`);
  if (report.removed) log(`  ${report.removed} arquivo(s) obsoleto(s) removido(s)`);
  if (report.backup) log(c.gray(`  cópia anterior: ${report.backup}`));
  const node = nodeStatus();
  if (!node.ok) {
    warn(
      node.version
        ? `Node ${node.version} encontrado; os hooks de governança precisam do Node ${MIN_NODE_MAJOR}+.`
        : `Node não encontrado. Os hooks de governança (push só pelo @devops) usam "node"; instale o Node ${MIN_NODE_MAJOR}+ em https://nodejs.org.`,
    );
  }
  log('');
  log(c.bold('Próximos passos'));
  log('  1. Abra o projeto na sua IDE (Claude Code, Codex, Gemini ou Grok).');
  log('  2. Ative um agente: /sia-pm (ou @pm). Comece por *help.');
  log('  3. Projeto novo: @pm *create-project-brief. Projeto existente: @dev *document-project.');
  log(`  4. Diagnóstico a qualquer momento: ${c.cyan('sia doctor')}`);
}

async function main(argv = process.argv.slice(2)) {
  const first = argv[0];

  if (first && CLI_COMMANDS.has(first)) {
    const root = findProjectRoot(process.cwd());
    if (!root) {
      throw new InstallError(`este diretório não tem o SIA instalado. Rode ${c.cyan('sia install')} primeiro.`, 2);
    }
    return runProjectCli(root, argv);
  }

  const command = first && !first.startsWith('-') ? first : 'install';
  const rest = command === first ? argv.slice(1) : argv;
  const { values, positionals } = parseArgs({
    args: rest,
    allowPositionals: true,
    options: {
      yes: { type: 'boolean', short: 'y' },
      name: { type: 'string' },
      type: { type: 'string' },
      ide: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
  });

  if (values.version || command === 'version') {
    log(loadFramework().version);
    return 0;
  }
  if (values.help || command === 'help') {
    printHelp(loadFramework().version);
    return 0;
  }
  if (command !== 'install' && command !== 'update') {
    throw new InstallError(`comando desconhecido: ${command}. Veja: sia help`, 2);
  }

  const target = path.resolve(positionals[0] || process.cwd());
  if (command === 'update' && !exists(path.join(target, CORE_DIR, CONFIG_FILE))) {
    throw new InstallError(`não há SIA instalado em ${target}. Use sia install.`, 2);
  }
  const framework = loadFramework();
  log(`${c.bold('SIA')} ${c.gray(`v${framework.version}`)} → ${target}`);
  const report = await install(target, {
    yes: values.yes,
    name: values.name,
    type: values.type,
    ides: parseIdes(values.ide),
    framework,
  });
  printSummary(report);
  return report.sync === 0 || report.sync === undefined ? 0 : 1;
}

if (require.main === module) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      if (error && error.code && String(error.code).startsWith('ERR_PARSE_ARGS')) {
        process.stderr.write(`${c.red('✗')} ${error.message}\nVeja: sia help\n`);
        process.exitCode = 2;
        return;
      }
      process.stderr.write(`${c.red('✗')} ${error && error.message ? error.message : error}\n`);
      process.exitCode = error && error.exitCode ? error.exitCode : 1;
    });
}

module.exports = { main, install, loadFramework, buildBundle, collectLocalFiles, patchConfig, parseIdes, findProjectRoot };
