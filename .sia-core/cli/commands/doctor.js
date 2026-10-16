'use strict';

/**
 * sia doctor [--json]
 * Diagnóstico do ambiente: Node, estrutura do .sia-core, core-config, git, gh, projeções,
 * hooks, MCPs e pastas de docs. Mostra ✓/⚠/✗ com sugestão de correção.
 */

const path = require('path');
const { execFileSync } = require('child_process');
const { isDir, isFile, readText, readJson, toPosix } = require('../lib/fsutil');
const { resolveRoot } = require('../lib/root');
const { loadConfig, get, projectPaths, ideTargets } = require('../lib/config');
const { AGENT_IDS } = require('../lib/agents');
const { HOOK_COMMANDS } = require('../projections/common');
const projections = require('../projections');
const managed = require('../lib/managed-files');
const syncCommand = require('./sync');
const mcpCommand = require('./mcp');
const { EXIT } = require('../lib/errors');

const REQUIRED_ENTRIES = Object.freeze([
  ['core-config.yaml', 'file'],
  ['constitution.md', 'file'],
  ['agents', 'dir'],
  ['tasks', 'dir'],
  ['hooks/enforce-git-push-authority.cjs', 'file'],
  ['hooks/track-active-agent.cjs', 'file'],
  ['cli/sia.js', 'file'],
]);
const RECOMMENDED_ENTRIES = Object.freeze([
  ['templates', 'dir'],
  ['checklists', 'dir'],
  ['workflows', 'dir'],
  ['data', 'dir'],
  ['rules', 'dir'],
  ['skills', 'dir'],
  ['schemas', 'dir'],
  ['user-guide.md', 'file'],
]);
const CONFIG_KEYS = Object.freeze(['sia.version', 'project', 'paths', 'quality', 'ide.targets', 'boundary']);
const MIN_NODE_MAJOR = 22;

function run(cmd, args, cwd) {
  try {
    const stdout = execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 15000 });
    return { ok: true, stdout: String(stdout).trim(), missing: false };
  } catch (error) {
    return { ok: false, stdout: String(error.stdout || '').trim(), stderr: String(error.stderr || '').trim(), missing: error.code === 'ENOENT' };
  }
}

/** O objeto hooks tem um handler com o comando dado no evento? */
function hasHook(hooks, event, command) {
  const groups = hooks && Array.isArray(hooks[event]) ? hooks[event] : [];
  return groups.some((group) => group && Array.isArray(group.hooks) && group.hooks.some((h) => h && h.command === command));
}

const HOOK_FILES = {
  'claude-code': { file: '.claude/settings.json', push: 'PreToolUse', tracker: 'UserPromptSubmit' },
  codex: { file: '.codex/hooks.json', push: 'PreToolUse', tracker: 'UserPromptSubmit' },
  gemini: { file: '.gemini/settings.json', push: 'BeforeTool', tracker: 'BeforeAgent' },
};

function hookChecks(root, ides, add) {
  for (const ide of ides) {
    if (ide === 'grok') {
      const files = ['.grok/hooks/sia-git-push-authority.json', '.grok/hooks/sia-track-agent.json'];
      const missing = files.filter((f) => !isFile(path.join(root, f)));
      if (missing.length === 0) add('ok', 'hooks', 'Hooks do SIA no Grok (.grok/hooks/sia-*.json); ative com /hooks-trust no projeto');
      else add('warn', 'hooks', `Hooks do SIA ausentes no Grok: ${missing.join(', ')}`, 'sia sync --ide grok');
      continue;
    }
    const spec = HOOK_FILES[ide];
    if (!spec) continue;
    const read = readJson(path.join(root, spec.file));
    if (read.error) {
      add('fail', 'hooks', `${spec.file} com JSON inválido (${read.error})`, `corrija ${spec.file} e rode sia sync --ide ${ide}`);
      continue;
    }
    const hooks = read.data && read.data.hooks;
    const push = hasHook(hooks, spec.push, HOOK_COMMANDS.push);
    const tracker = hasHook(hooks, spec.tracker, HOOK_COMMANDS.tracker);
    if (push && tracker) add('ok', 'hooks', `Hooks do SIA registrados em ${spec.file} (${spec.push} e ${spec.tracker})`);
    else {
      const missing = [!push && `${spec.push} → enforce-git-push-authority`, !tracker && `${spec.tracker} → track-active-agent`].filter(Boolean);
      add('warn', 'hooks', `${spec.file}: falta ${missing.join(' e ')}`, `sia sync --ide ${ide}`);
    }
  }
}

/**
 * @returns {{ ok: boolean, checks: { level: string, area: string, message: string, fix: string|null }[], root: string|null }}
 */
function runDoctor(options = {}) {
  const checks = [];
  const add = (level, area, message, fix = null) => checks.push({ level, area, message, fix });

  const major = Number(process.versions.node.split('.')[0]);
  if (major >= MIN_NODE_MAJOR) add('ok', 'node', `Node.js v${process.versions.node} (mínimo ${MIN_NODE_MAJOR})`);
  else {
    add(
      'fail',
      'node',
      `Node.js v${process.versions.node}: a CLI exige ${MIN_NODE_MAJOR} ou superior (as versões 18 e 20 saíram de suporte)`,
      `instale o Node.js ${MIN_NODE_MAJOR} LTS ou mais novo (https://nodejs.org)`,
    );
  }

  let rootInfo;
  try {
    rootInfo = resolveRoot({ root: options.root, cwd: options.cwd });
  } catch (error) {
    add('fail', 'estrutura', error.message, 'rode na raiz de um projeto com .sia-core/ ou use --root {dir}');
    return { ok: false, checks, root: null };
  }
  const { root, coreDir } = rootInfo;
  add('ok', 'estrutura', `Raiz do projeto: ${root}${rootInfo.coreIsSymlink ? ` (.sia-core é link simbólico → ${rootInfo.coreRealPath})` : ''}`);

  const missingRequired = REQUIRED_ENTRIES.filter(([rel, type]) => (type === 'dir' ? !isDir(path.join(coreDir, rel)) : !isFile(path.join(coreDir, rel))));
  if (missingRequired.length === 0) add('ok', 'estrutura', 'Estrutura essencial do .sia-core presente');
  else add('fail', 'estrutura', `Faltam no .sia-core: ${missingRequired.map(([rel]) => rel).join(', ')}`, 'restaure os arquivos do framework (.sia-core/)');
  const missingAgents = AGENT_IDS.filter((id) => !isFile(path.join(coreDir, 'agents', `${id}.md`)));
  if (missingAgents.length > 0) add('fail', 'estrutura', `Agentes ausentes: ${missingAgents.map((id) => `${id}.md`).join(', ')}`, 'restaure .sia-core/agents/');
  const missingRecommended = RECOMMENDED_ENTRIES.filter(([rel, type]) => (type === 'dir' ? !isDir(path.join(coreDir, rel)) : !isFile(path.join(coreDir, rel))));
  if (missingRecommended.length > 0) {
    add('warn', 'estrutura', `Ausentes no .sia-core: ${missingRecommended.map(([rel]) => rel).join(', ')}`, 'complete o .sia-core e rode sia validate');
  }

  const loaded = loadConfig(rootInfo.configPath);
  const config = loaded.config;
  if (loaded.error) add('fail', 'config', `core-config.yaml inválido: ${loaded.error}`, 'corrija .sia-core/core-config.yaml');
  else {
    const missingKeys = CONFIG_KEYS.filter((key) => get(config, key) === undefined);
    if (missingKeys.length === 0) add('ok', 'config', `core-config.yaml válido (SIA ${get(config, 'sia.version', '?')})`);
    else add('warn', 'config', `core-config.yaml sem as chaves: ${missingKeys.join(', ')}`, 'compare com o core-config.yaml padrão do SIA');
  }

  const git = run('git', ['rev-parse', '--is-inside-work-tree'], root);
  const isGit = git.ok && git.stdout === 'true';
  if (git.missing) add('warn', 'git', 'git não instalado', 'instale o git');
  else if (isGit) add('ok', 'git', 'Repositório git detectado');
  else add('warn', 'git', 'A pasta não é um repositório git', '@devops *environment-bootstrap (git init, remoto e CI)');

  const gh = run('gh', ['--version'], root);
  if (gh.missing || !gh.ok) add('warn', 'gh', 'GitHub CLI (gh) não instalado', 'instale o gh (https://cli.github.com); usado por *create-pr e *release');
  else {
    const auth = run('gh', ['auth', 'status'], root);
    if (auth.ok) add('ok', 'gh', `GitHub CLI autenticado (${gh.stdout.split('\n')[0]})`);
    else add('warn', 'gh', 'GitHub CLI instalado, mas não autenticado', 'gh auth login');
  }

  const ides = (() => {
    try {
      return projections.resolveIdes(ideTargets(config));
    } catch (error) {
      add('warn', 'projeções', error.message, 'corrija ide.targets no core-config.yaml');
      return projections.resolveIdes(ideTargets({}));
    }
  })();
  if (!loaded.error) {
    try {
      const result = syncCommand.runSync({ root, coreDir, config, apply: false });
      for (const plan of result.plans) {
        const diffs = managed.planDifferences(plan);
        if (diffs.length === 0) add('ok', 'projeções', `${plan.ide}: projeção sincronizada`);
        else {
          const counts = {};
          for (const diff of diffs) counts[diff.category] = (counts[diff.category] || 0) + 1;
          const text = Object.entries(counts).map(([category, n]) => `${n} ${category}`).join(', ');
          add('warn', 'projeções', `${plan.ide}: projeção fora de sincronia (${text})`, `sia sync --ide ${plan.ide} (detalhes: sia sync --check)`);
        }
      }
    } catch (error) {
      add('warn', 'projeções', `não foi possível conferir as projeções: ${error.message}`, 'sia sync --check');
    }
  }

  hookChecks(root, ides, add);

  const mcpStatus = mcpCommand.collectStatus(root, coreDir, config);
  if (!mcpStatus.available) {
    add('warn', 'mcp', mcpStatus.error ? `mcp-servers.yaml inválido: ${mcpStatus.error}` : '.sia-core/data/mcp-servers.yaml ausente; sia mcp indisponível', 'restaure .sia-core/data/mcp-servers.yaml');
  } else {
    const enabled = Object.entries(mcpStatus.servers).filter(([, server]) => server.enabled);
    if (enabled.length === 0) add('ok', 'mcp', `Nenhuma integração habilitada (integrations.*.enabled); servidores disponíveis: ${Object.keys(mcpStatus.servers).join(', ')}`);
    for (const [serverId, server] of enabled) {
      const pending = ides.filter((ide) => server.ides[ide] && !server.ides[ide].unsupported && !server.ides[ide].configured);
      if (pending.length === 0) add('ok', 'mcp', `MCP ${serverId} configurado nas IDEs de ide.targets`);
      else add('warn', 'mcp', `MCP ${serverId} habilitado, mas não configurado em: ${pending.join(', ')}`, `sia mcp setup ${serverId} --ide ${pending.join(',')}`);
    }
  }

  const paths = projectPaths(config);
  const docs = ['stories', 'qaGates', 'inspections', 'qaAssessments'].map((key) => paths[key]);
  const missingDocs = docs.filter((rel) => !isDir(path.join(root, rel)));
  if (missingDocs.length === 0) add('ok', 'docs', `Pastas de docs presentes (${docs.join(', ')})`);
  else add('warn', 'docs', `Pastas de docs ausentes: ${missingDocs.join(', ')}`, `mkdir -p ${missingDocs.join(' ')} (ou @devops *environment-bootstrap)`);

  if (isGit) {
    const gitignore = readText(path.join(root, '.gitignore')) || '';
    const runtime = String(paths.runtime || '.sia').replace(/\/+$/, '');
    const ignored = gitignore.split(/\r?\n/).some((line) => [runtime, `${runtime}/`, `/${runtime}`, `/${runtime}/`].includes(line.trim()));
    if (ignored) add('ok', 'git', `Runtime ${runtime}/ fora do versionamento (.gitignore)`);
    else add('warn', 'git', `${runtime}/ não está no .gitignore (estado local do SIA)`, `echo '${runtime}/' >> .gitignore`);
  }

  return { ok: !checks.some((check) => check.level === 'fail'), checks, root };
}

function print(result, out) {
  const { c } = out;
  out.heading('sia doctor');
  for (const check of result.checks) {
    out.line(`${out.mark(check.level === 'fail' ? 'fail' : check.level)} ${c.gray(`[${check.area}]`)} ${check.message}`);
    if (check.fix && check.level !== 'ok') out.hint(check.fix);
  }
  const counts = { ok: 0, warn: 0, fail: 0 };
  for (const check of result.checks) counts[check.level] = (counts[check.level] || 0) + 1;
  out.line('');
  const summary = `${counts.ok} ok, ${counts.warn} aviso(s), ${counts.fail} falha(s)`;
  if (result.ok) out.ok(`Diagnóstico concluído: ${summary}.`);
  else out.fail(`Diagnóstico com falhas: ${summary}.`);
}

module.exports = {
  name: 'doctor',
  summary: 'Diagnóstico: Node, estrutura, config, git, gh, projeções, hooks, MCPs e docs',
  usage: 'sia doctor [--json]',
  options: {},
  needsRoot: false,
  run(ctx) {
    if (ctx.positionals.length > 0) ctx.usage(`argumento inesperado: ${ctx.positionals[0]}`);
    const result = runDoctor({ root: ctx.values.root, cwd: ctx.cwd });
    if (ctx.out.json) ctx.out.printJson({ ...result, root: result.root ? toPosix(result.root) : null });
    else print(result, ctx.out);
    return result.ok ? EXIT.OK : EXIT.FAILURE;
  },
  runDoctor,
  hasHook,
  MIN_NODE_MAJOR,
};
