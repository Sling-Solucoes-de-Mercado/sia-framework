'use strict';

/**
 * sia validate [--squad nome] [--strict] [--json]
 * Valida agentes, tasks, templates, workflows, workflow-chains, regras, skills e squads.
 * Erros falham sempre; avisos só falham com --strict.
 */

const path = require('path');
const { readText, readJson, listDir, isDir, isFile, walkFiles, toPosix } = require('../lib/fsutil');
const { tryLoad } = require('../lib/yaml');
const { projectPath } = require('../lib/config');
const agentsLib = require('../lib/agents');
const tasksLib = require('../lib/tasks');
const catalog = require('../lib/catalog');
const { validate: validateSchema } = require('../lib/schema-validator');
const { EXIT, SiaError } = require('../lib/errors');

const GROUPS = Object.freeze([
  ['agents', 'Agentes'],
  ['tasks', 'Tasks'],
  ['templates', 'Templates'],
  ['checklists', 'Checklists'],
  ['workflows', 'Workflows'],
  ['chains', 'workflow-chains.yaml'],
  ['rules', 'Regras'],
  ['skills', 'Skills'],
  ['squads', 'Squads'],
]);

function createReport(strict) {
  const groups = {};
  for (const [type, label] of GROUPS) groups[type] = { type, label, checked: 0, errors: 0, warnings: 0, issues: [] };
  return { strict: Boolean(strict), groups };
}

function issueAdder(report, root) {
  return (type, level, file, message) => {
    const group = report.groups[type];
    group.issues.push({ level, file: file ? toPosix(path.relative(root, file)) : null, message });
    if (level === 'error') group.errors += 1;
    else group.warnings += 1;
  };
}

/** Resolve dependências {type}/{name} nas bases, em ordem (squad antes do .sia-core). */
function resolver(bases) {
  return (type, name) => bases.some((base) => catalog.depExists(base, type, name));
}

// ── Agentes ───────────────────────────────────────────────────

function validateAgentDef(parsed, opts, add) {
  const file = parsed.file;
  const error = (message) => add('error', file, message);
  const warn = (message) => add('warning', file, message);
  if (parsed.error) {
    error(parsed.error);
    return;
  }
  const agent = parsed.agent;
  if (!agent) {
    error('bloco agent ausente no YAML');
    return;
  }
  for (const field of agentsLib.REQUIRED_AGENT_FIELDS) {
    if (agent[field] === undefined || agent[field] === null || !String(agent[field]).trim()) error(`campo obrigatório ausente: agent.${field}`);
  }
  if (agent.id && String(agent.id) !== parsed.id) error(`agent.id (${agent.id}) diferente do nome do arquivo (${parsed.id})`);
  if (opts.core && !agentsLib.AGENT_IDS.includes(parsed.id)) warn(`agente fora dos 5 agentes do SIA: ${parsed.id}`);

  const byName = new Map();
  for (const cmd of parsed.commands) {
    if (cmd.malformed || !cmd.name) {
      error(`comando #${cmd.index + 1} sem name`);
      continue;
    }
    if (byName.has(cmd.name)) error(`comando duplicado: *${cmd.name}`);
    else byName.set(cmd.name, cmd);
    for (const [field, type] of Object.entries(agentsLib.COMMAND_REF_TYPES)) {
      const ref = cmd[field];
      if (!ref) continue;
      if (!agentsLib.dependencyList(parsed, type).includes(ref)) error(`*${cmd.name}: ${field} ${ref} não está em dependencies.${type}`);
    }
    if (!cmd.task && !agentsLib.BUILTIN_COMMANDS.includes(cmd.name)) warn(`*${cmd.name}: comando sem task (os embutidos são help, guide, yolo e exit)`);
    if (cmd.extraKeys.length > 0) warn(`*${cmd.name}: campos não reconhecidos: ${cmd.extraKeys.join(', ')}`);
    if (cmd.visibility) {
      const bad = cmd.visibility.filter((value) => !agentsLib.VISIBILITY_VALUES.includes(value));
      if (bad.length > 0) warn(`*${cmd.name}: visibility inválida: ${bad.join(', ')}`);
    }
  }

  for (const [type, list] of Object.entries(parsed.dependencies)) {
    if (!agentsLib.DEP_TYPES.includes(type)) {
      warn(`tipo de dependência desconhecido: ${type}`);
      continue;
    }
    if (!Array.isArray(list)) {
      error(`dependencies.${type} deve ser uma lista`);
      continue;
    }
    for (const name of list) {
      if (typeof name !== 'string' || !name.trim()) {
        error(`dependencies.${type}: entrada inválida (${JSON.stringify(name)})`);
        continue;
      }
      if (!opts.depExists(type, name)) error(`dependência ausente: ${type}/${name}`);
    }
  }

  const hats = new Map();
  for (const hat of parsed.hats) {
    if (!hat.id) {
      error('chapéu sem id em hats');
      continue;
    }
    hats.set(hat.id, hat);
  }
  for (const cmd of byName.values()) {
    if (!cmd.hat) continue;
    const hat = hats.get(cmd.hat);
    if (!hat) error(`*${cmd.name}: chapéu ${cmd.hat} não existe em hats`);
    else if (Array.isArray(hat.commands) && !hat.commands.includes(cmd.name)) warn(`*${cmd.name} declara hat: ${cmd.hat}, mas o chapéu não lista o comando`);
  }
  for (const hat of hats.values()) {
    if (hat.commands !== undefined && !Array.isArray(hat.commands)) {
      error(`chapéu ${hat.id}: commands deve ser uma lista`);
      continue;
    }
    for (const name of hat.commands || []) {
      const cmd = byName.get(name);
      if (!cmd) error(`chapéu ${hat.id}: comando *${name} não existe em commands`);
      else if (cmd.hat && cmd.hat !== hat.id) warn(`chapéu ${hat.id} lista *${name}, mas o comando declara hat: ${cmd.hat}`);
    }
  }
}

// ── Tasks ─────────────────────────────────────────────────────

function hatsFor(agentId, opts) {
  const parsed = opts.agentsById.get(agentId);
  if (parsed && parsed.hats.length > 0) return parsed.hats.map((hat) => hat.id);
  return tasksLib.HATS[agentId] || [];
}

function validateTaskDef(task, opts, add) {
  const file = task.file;
  const error = (message) => add('error', file, message);
  const warn = (message) => add('warning', file, message);
  if (!task.hasFrontmatter) {
    error('frontmatter YAML ausente');
    return;
  }
  if (task.error) {
    error(`frontmatter inválido: ${task.error}`);
    return;
  }
  const fm = task.frontmatter || {};
  if (fm.id === undefined) error('id ausente no frontmatter');
  else if (String(fm.id) !== task.id) error(`id (${fm.id}) diferente do nome do arquivo (${task.id})`);
  if (!fm.title || !String(fm.title).trim()) error('title ausente');
  const agent = fm.agent === undefined || fm.agent === null ? '' : String(fm.agent);
  if (!opts.taskAgents.includes(agent)) error(`agent inválido: ${agent || '(vazio)'} (use ${opts.taskAgents.join(', ')})`);
  if (agent === 'pm' || agent === 'dev') {
    const valid = hatsFor(agent, opts);
    if (!fm.hat) error(`hat obrigatório quando agent é ${agent} (${valid.join(', ')})`);
    else if (!valid.includes(String(fm.hat))) error(`hat inválido para @${agent}: ${fm.hat} (use ${valid.join(', ')})`);
  } else if (fm.hat && agentsLib.AGENT_IDS.includes(agent)) {
    warn(`hat ${fm.hat} informado para @${agent}, que não tem chapéus`);
  }
  if (typeof fm.elicit !== 'boolean') error(`elicit deve ser booleano (true ou false); atual: ${fm.elicit === undefined ? 'ausente' : JSON.stringify(fm.elicit)}`);
  if (fm.modes !== undefined) {
    if (!Array.isArray(fm.modes)) warn('modes deve ser uma lista');
    else {
      const bad = fm.modes.filter((mode) => !tasksLib.TASK_MODES.includes(mode));
      if (bad.length > 0) warn(`modes inválidos: ${bad.join(', ')} (use ${tasksLib.TASK_MODES.join(', ')})`);
    }
  }
  if (fm.depends_on !== undefined && fm.depends_on !== null) {
    if (typeof fm.depends_on !== 'object' || Array.isArray(fm.depends_on)) error('depends_on deve ser um objeto {tipo: [arquivos]}');
    else {
      for (const [type, list] of Object.entries(fm.depends_on)) {
        if (!agentsLib.DEP_TYPES.includes(type)) {
          warn(`depends_on: tipo desconhecido ${type}`);
          continue;
        }
        if (list === null || list === undefined) continue;
        if (!Array.isArray(list)) {
          error(`depends_on.${type} deve ser uma lista`);
          continue;
        }
        for (const name of list) {
          if (typeof name !== 'string' || !name.trim()) error(`depends_on.${type}: entrada inválida (${JSON.stringify(name)})`);
          else if (!opts.depExists(type, name)) error(`depends_on: ${type}/${name} não existe`);
        }
      }
    }
  }
  if (fm.next !== undefined && fm.next !== null) {
    const list = Array.isArray(fm.next) ? fm.next : [fm.next];
    for (const entry of list) {
      const name = tasksLib.nextCommandName(entry);
      if (name && !opts.commandNames.has(name)) warn(`next: comando *${name} não existe em nenhum agente`);
    }
  }
  for (const section of tasksLib.missingSections(task)) error(`seção obrigatória ausente: ## ${section}`);
}

// ── Workflows ─────────────────────────────────────────────────

function validateWorkflowFile(file, opts, add) {
  const error = (message) => add('error', file, message);
  const warn = (message) => add('warning', file, message);
  const parsed = tryLoad(readText(file) || '');
  if (parsed.error) {
    error(`YAML inválido: ${parsed.error}`);
    return;
  }
  const wf = parsed.data && parsed.data.workflow;
  if (!wf || typeof wf !== 'object') {
    error('chave workflow ausente');
    return;
  }
  const id = path.basename(file).replace(/\.ya?ml$/, '');
  if (String(wf.id || '') !== id) error(`workflow.id (${wf.id || 'ausente'}) diferente do nome do arquivo (${id})`);
  if (!Array.isArray(wf.sequence)) {
    error('workflow.sequence ausente ou não é uma lista');
    return;
  }
  const ids = new Set();
  const steps = wf.sequence.filter((step) => step && typeof step === 'object' && !Array.isArray(step));
  if (steps.length < wf.sequence.length) warn('há passos em sequence que não são objetos');
  for (const step of steps) {
    const stepId = step.id || step.step;
    if (!stepId) continue;
    if (ids.has(String(stepId))) error(`id de passo duplicado: ${stepId}`);
    ids.add(String(stepId));
    if (step.step && step.id) ids.add(String(step.step));
  }
  for (const step of steps) {
    const label = step.id || step.step || '(sem id)';
    if (step.agent === undefined) {
      // Passos meta (end, guidance) são marcadores informativos, sem agente.
      if (!step.meta) warn(`passo ${label}: agent ausente`);
    }
    else {
      const agent = String(step.agent).replace(/^@/, '').trim();
      if (!opts.workflowAgents.includes(agent)) error(`passo ${label}: agent inválido (${step.agent})`);
      else if (step.hat && (agent === 'pm' || agent === 'dev') && !hatsFor(agent, opts).includes(String(step.hat))) {
        warn(`passo ${label}: hat ${step.hat} não existe em @${agent}`);
      }
    }
    if (step.task !== undefined && step.task !== null) {
      if (!opts.depExists('tasks', String(step.task))) error(`passo ${label}: task inexistente (${step.task})`);
    }
    if (step.requires !== undefined && step.requires !== null) {
      const requires = Array.isArray(step.requires) ? step.requires : [step.requires];
      for (const ref of requires) if (!ids.has(String(ref))) error(`passo ${label}: requires aponta para passo inexistente (${ref})`);
    }
  }
}

// ── workflow-chains.yaml ──────────────────────────────────────

function chainCommandName(command) {
  const text = String(command || '').trim();
  const star = text.match(/\*([A-Za-z0-9][\w-]*)/);
  if (star) return star[1];
  return (text.split(/\s+/)[0] || '').replace(/^[*/#]/, '');
}

function validateChains(file, opts, add) {
  const error = (message) => add('error', file, message);
  const warn = (message) => add('warning', file, message);
  const parsed = tryLoad(readText(file) || '');
  if (parsed.error) {
    error(`YAML inválido: ${parsed.error}`);
    return 0;
  }
  const workflows = parsed.data && (parsed.data.workflows || parsed.data.chains);
  if (!Array.isArray(workflows)) {
    warn('formato inesperado: esperado workflows: [{id, chain: [{agent, command}]}]');
    return 0;
  }
  let checked = 0;
  const checkStep = (wfId, step, label) => {
    if (!step || typeof step !== 'object') return;
    checked += 1;
    const agent = String(step.agent || '').replace(/^@/, '').trim();
    if (!opts.agentCommands.has(agent)) {
      error(`${wfId} ${label}: agente inválido (${step.agent || 'ausente'})`);
      return;
    }
    const command = chainCommandName(step.command);
    if (!command) error(`${wfId} ${label}: command ausente`);
    else if (!opts.agentCommands.get(agent).has(command)) error(`${wfId} ${label}: @${agent} não tem o comando *${command}`);
  };
  for (const wf of workflows) {
    if (!wf || typeof wf !== 'object') continue;
    const wfId = wf.id || '(sem id)';
    const chain = wf.chain || wf.steps || [];
    if (!Array.isArray(chain)) {
      warn(`${wfId}: chain não é uma lista`);
      continue;
    }
    chain.forEach((step, index) => {
      const label = `passo ${step && step.step !== undefined ? step.step : index + 1}`;
      checkStep(wfId, step, label);
      if (step && Array.isArray(step.alternatives)) step.alternatives.forEach((alt) => checkStep(wfId, alt, `${label} (alternativa)`));
    });
  }
  return checked;
}

// ── Squads ────────────────────────────────────────────────────

const COMPONENT_DIRS = Object.freeze(['agents', 'tasks', 'workflows', 'checklists', 'templates', 'data', 'scripts', 'tools']);

function validateSquad(squadDir, name, ctx, add) {
  const error = (file, message) => add('error', file, message);
  const warn = (file, message) => add('warning', file, message);
  const manifestFile = ['squad.yaml', 'squad.yml'].map((f) => path.join(squadDir, f)).find((f) => isFile(f));
  if (!manifestFile) {
    error(squadDir, 'squad.yaml ausente');
    return;
  }
  const parsed = tryLoad(readText(manifestFile) || '');
  if (parsed.error) {
    error(manifestFile, `YAML inválido: ${parsed.error}`);
    return;
  }
  const manifest = parsed.data || {};
  if (ctx.schema) {
    for (const issue of validateSchema(ctx.schema, manifest)) error(manifestFile, `schema: ${issue.path}: ${issue.message}`);
  }
  if (manifest.name && manifest.name !== name) warn(manifestFile, `name (${manifest.name}) diferente da pasta do squad (${name})`);
  const components = manifest.components && typeof manifest.components === 'object' ? manifest.components : {};
  for (const [type, list] of Object.entries(components)) {
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      if (typeof entry !== 'string') continue;
      const target = path.join(squadDir, type, entry);
      if (!isFile(target) && !isDir(target)) error(manifestFile, `components.${type}: ${type}/${entry} não existe`);
    }
  }
  for (const type of Object.keys(components)) {
    if (!COMPONENT_DIRS.includes(type)) warn(manifestFile, `components: tipo desconhecido ${type}`);
  }

  const squadAgents = agentsLib.loadAgents(path.join(squadDir, 'agents'));
  const squadAgentIds = squadAgents.filter((a) => !a.error).map((a) => a.id);
  const depExists = resolver([squadDir, ctx.coreDir]);
  const agentsById = new Map([...ctx.coreAgents.map((a) => [a.id, a]), ...squadAgents.map((a) => [a.id, a])]);
  const commandNames = new Set(ctx.commandNames);
  for (const agent of squadAgents) for (const cmd of agent.commands) if (cmd.name) commandNames.add(cmd.name);
  const opts = {
    core: false,
    depExists,
    agentsById,
    commandNames,
    taskAgents: [...tasksLib.TASK_AGENTS, ...squadAgentIds],
    workflowAgents: [...agentsLib.AGENT_IDS, ...squadAgentIds],
  };
  for (const agent of squadAgents) validateAgentDef(agent, opts, (level, file, message) => add(level, file, message));
  for (const name2 of catalog.markdownFiles(path.join(squadDir, 'tasks'))) {
    validateTaskDef(tasksLib.parseTaskFile(path.join(squadDir, 'tasks', name2)), opts, (level, file, message) => add(level, file, message));
  }
  for (const name3 of catalog.yamlFiles(path.join(squadDir, 'workflows'))) {
    validateWorkflowFile(path.join(squadDir, 'workflows', name3), opts, (level, file, message) => add(level, file, message));
  }
}

/**
 * Executa a validação.
 * @param {{ root: string, coreDir: string, config: object, squad?: string, strict?: boolean }} options
 */
function runValidation(options) {
  const { root, coreDir, config } = options;
  const report = createReport(options.strict);
  const add = issueAdder(report, root);
  const coreAgents = agentsLib.loadAgents(path.join(coreDir, 'agents'));
  const agentsById = new Map(coreAgents.map((agent) => [agent.id, agent]));
  const commandNames = new Set();
  const agentCommands = new Map();
  for (const agent of coreAgents) {
    const names = new Set(agent.commands.filter((cmd) => cmd.name).map((cmd) => cmd.name));
    agentCommands.set(agent.id, names);
    for (const name of names) commandNames.add(name);
  }
  const coreOpts = {
    core: true,
    depExists: resolver([coreDir]),
    agentsById,
    commandNames,
    taskAgents: [...tasksLib.TASK_AGENTS],
    workflowAgents: [...agentsLib.AGENT_IDS],
    agentCommands,
  };

  if (!options.squad) {
    for (const agent of coreAgents) {
      report.groups.agents.checked += 1;
      validateAgentDef(agent, coreOpts, (level, file, message) => add('agents', level, file, message));
    }
    for (const id of agentsLib.AGENT_IDS) {
      if (!agentsById.has(id)) add('agents', 'error', path.join(coreDir, 'agents'), `agente ausente: ${id}.md`);
    }

    const tasksDir = path.join(coreDir, 'tasks');
    for (const name of catalog.markdownFiles(tasksDir)) {
      report.groups.tasks.checked += 1;
      validateTaskDef(tasksLib.parseTaskFile(path.join(tasksDir, name)), coreOpts, (level, file, message) => add('tasks', level, file, message));
    }

    const templatesDir = path.join(coreDir, 'templates');
    for (const rel of walkFiles(templatesDir, { filter: (r) => !path.posix.basename(r).startsWith('.') })) {
      report.groups.templates.checked += 1;
      if (!/\.ya?ml$/.test(rel)) continue;
      const file = path.join(templatesDir, rel);
      const parsed = tryLoad(readText(file) || '');
      if (parsed.error) {
        add('templates', 'error', file, `YAML inválido: ${parsed.error}`);
        continue;
      }
      const data = parsed.data;
      if (data && typeof data === 'object' && Object.prototype.hasOwnProperty.call(data, 'template')) {
        if (!data.template || typeof data.template !== 'object' || !data.template.id) add('templates', 'error', file, 'template.id ausente');
        if (!Array.isArray(data.sections)) add('templates', 'error', file, 'sections ausente ou não é uma lista');
      }
    }

    report.groups.checklists.checked = catalog.markdownFiles(path.join(coreDir, 'checklists')).length;

    const workflowsDir = path.join(coreDir, 'workflows');
    for (const name of catalog.yamlFiles(workflowsDir)) {
      report.groups.workflows.checked += 1;
      validateWorkflowFile(path.join(workflowsDir, name), coreOpts, (level, file, message) => add('workflows', level, file, message));
    }

    const chainsFile = path.join(coreDir, 'data', 'workflow-chains.yaml');
    if (isFile(chainsFile)) {
      report.groups.chains.checked = validateChains(chainsFile, coreOpts, (level, file, message) => add('chains', level, file, message));
    }

    for (const rule of catalog.loadRules(coreDir)) {
      report.groups.rules.checked += 1;
      if (rule.error) add('rules', 'error', rule.file, `frontmatter inválido: ${rule.error}`);
      else if (!rule.hasFrontmatter) add('rules', 'warning', rule.file, 'frontmatter ausente (description, paths)');
      else {
        if (!rule.frontmatter.description) add('rules', 'warning', rule.file, 'description ausente no frontmatter');
        if (rule.frontmatter.paths !== undefined && rule.frontmatter.paths !== null && !Array.isArray(rule.frontmatter.paths)) {
          add('rules', 'warning', rule.file, 'paths deve ser uma lista');
        }
      }
    }

    for (const skill of catalog.loadSkills(coreDir)) {
      report.groups.skills.checked += 1;
      if (!skill.exists) {
        add('skills', 'error', path.dirname(skill.file), 'SKILL.md ausente');
        continue;
      }
      if (!skill.hasFrontmatter) {
        add('skills', 'error', skill.file, 'frontmatter YAML ausente');
        continue;
      }
      if (skill.error) {
        add('skills', 'error', skill.file, `frontmatter inválido: ${skill.error}`);
        continue;
      }
      const fm = skill.frontmatter || {};
      if (String(fm.name || '') !== skill.dirName) add('skills', 'error', skill.file, `name (${fm.name || 'ausente'}) diferente do diretório (${skill.dirName})`);
      if (!fm.description || !String(fm.description).trim()) add('skills', 'error', skill.file, 'description ausente');
      if (fm.agent && !agentsLib.AGENT_IDS.includes(String(fm.agent))) add('skills', 'warning', skill.file, `agent desconhecido: ${fm.agent}`);
      for (const ref of catalog.skillSourceTasks(skill.body)) {
        const target = ref.startsWith('.sia-core/') ? path.join(coreDir, ref.slice('.sia-core/'.length)) : path.join(coreDir, 'tasks', ref);
        if (!isFile(target)) add('skills', 'error', skill.file, `Task fonte da verdade inexistente: ${ref}`);
      }
    }
  }

  const squadsDir = projectPath(root, config, 'squads');
  const squadNames = options.squad ? [options.squad] : listDir(squadsDir).filter((name) => !name.startsWith('.') && isDir(path.join(squadsDir, name)));
  if (options.squad && !isDir(path.join(squadsDir, options.squad))) {
    throw new SiaError(`Squad não encontrado: ${toPosix(path.relative(root, path.join(squadsDir, options.squad)))}`, { code: 'SQUAD_NOT_FOUND' });
  }
  if (squadNames.length > 0) {
    const schemaFile = path.join(coreDir, 'schemas', 'squad-schema.json');
    const schemaRead = readJson(schemaFile);
    let schema = null;
    if (!schemaRead.exists) add('squads', 'warning', schemaFile, 'schema ausente; validação de schema do squad.yaml pulada');
    else if (schemaRead.error) add('squads', 'warning', schemaFile, `schema ilegível (${schemaRead.error}); validação de schema pulada`);
    else schema = schemaRead.data;
    const ctx = { coreDir, schema, coreAgents, commandNames };
    for (const name of squadNames) {
      report.groups.squads.checked += 1;
      validateSquad(path.join(squadsDir, name), name, ctx, (level, file, message) => add('squads', level, file, message));
    }
  }

  let errors = 0;
  let warnings = 0;
  let checked = 0;
  for (const group of Object.values(report.groups)) {
    errors += group.errors;
    warnings += group.warnings;
    checked += group.checked;
  }
  report.summary = { checked, errors, warnings };
  report.ok = errors === 0 && (!report.strict || warnings === 0);
  report.scope = options.squad ? `squad ${options.squad}` : 'core e squads';
  return report;
}

function print(report, out) {
  const { c } = out;
  out.heading(`sia validate (${report.scope}${report.strict ? ', --strict' : ''})`);
  for (const [type] of GROUPS) {
    const group = report.groups[type];
    if (report.scope.startsWith('squad') && type !== 'squads') continue;
    const level = group.errors > 0 ? 'error' : group.warnings > 0 ? 'warn' : 'ok';
    const counts = [];
    if (group.errors) counts.push(c.red(`${group.errors} erro(s)`));
    if (group.warnings) counts.push(c.yellow(`${group.warnings} aviso(s)`));
    out.line(`${out.mark(level)} ${c.bold(group.label)} ${c.gray(`(${group.checked})`)}${counts.length ? `: ${counts.join(', ')}` : ''}`);
    for (const issue of group.issues) {
      const mark = issue.level === 'error' ? c.red(out.sym.fail) : c.yellow(out.sym.warn);
      out.line(`    ${mark} ${issue.file ? `${c.gray(issue.file)}: ` : ''}${issue.message}`);
    }
  }
  out.line('');
  const summary = `${report.summary.errors} erro(s), ${report.summary.warnings} aviso(s) em ${report.summary.checked} artefato(s)`;
  if (report.ok) out.ok(`Validação concluída: ${summary}.`);
  else out.fail(`Validação falhou: ${summary}.${report.summary.errors === 0 ? ' Avisos contam como falha com --strict.' : ''}`);
}

module.exports = {
  name: 'validate',
  summary: 'Valida agentes, tasks, templates, workflows, regras, skills e squads',
  usage: 'sia validate [--squad nome] [--strict] [--json]',
  options: { squad: { type: 'string' }, strict: { type: 'boolean' } },
  needsRoot: true,
  run(ctx) {
    if (ctx.positionals.length > 0) ctx.usage(`argumento inesperado: ${ctx.positionals[0]}`);
    const report = runValidation({
      root: ctx.root.root,
      coreDir: ctx.root.coreDir,
      config: ctx.config,
      squad: ctx.values.squad,
      strict: ctx.values.strict,
    });
    if (ctx.out.json) ctx.out.printJson(report);
    else print(report, ctx.out);
    return report.ok ? EXIT.OK : EXIT.FAILURE;
  },
  runValidation,
  validateAgentDef,
  validateTaskDef,
};
