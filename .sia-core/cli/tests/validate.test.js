'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { makeProject, cleanup, runCli, write, read } = require('./_helpers');
const { runValidation } = require('../commands/validate');
const { loadConfig } = require('../lib/config');

function validateProject(root, options = {}) {
  const coreDir = path.join(root, '.sia-core');
  const { config } = loadConfig(path.join(coreDir, 'core-config.yaml'));
  return runValidation({ root, coreDir, config, ...options });
}

function messages(report, type) {
  return report.groups[type].issues.map((issue) => `${issue.level}: ${issue.message}`);
}

test('validate: mini-core de fixture passa sem erros nem avisos', (t) => {
  const root = makeProject();
  t.after(() => cleanup(root));
  const report = validateProject(root);
  assert.equal(report.summary.errors, 0, JSON.stringify(report.groups, null, 2));
  assert.equal(report.summary.warnings, 0);
  assert.equal(report.ok, true);
  assert.equal(report.groups.agents.checked, 5);
  assert.equal(report.groups.squads.checked, 1);
  const cli = runCli(['validate', '--json'], { cwd: root });
  assert.equal(cli.code, 0);
  assert.equal(cli.json.ok, true);
});

test('validate: dependência ausente é erro e comando duplicado também', (t) => {
  const root = makeProject();
  t.after(() => cleanup(root));
  fs.unlinkSync(path.join(root, '.sia-core', 'tasks', 'close-story.md'));
  const pm = read(root, '.sia-core/agents/pm.md').replace(
    "  - name: exit\n    description: 'Sai do modo pm'",
    "  - name: exit\n    description: 'Sai do modo pm'\n  - name: help\n    description: 'Duplicado'",
  );
  write(root, '.sia-core/agents/pm.md', pm);
  const report = validateProject(root);
  const agentMessages = messages(report, 'agents');
  assert.ok(agentMessages.includes('error: dependência ausente: tasks/close-story.md'), agentMessages.join('\n'));
  assert.ok(agentMessages.includes('error: comando duplicado: *help'));
  assert.equal(report.ok, false);
  const cli = runCli(['validate'], { cwd: root });
  assert.equal(cli.code, 1);
  assert.match(cli.stdout, /dependência ausente: tasks\/close-story\.md/);
});

test('validate: comando cita template fora de dependencies e chapéu inexistente', (t) => {
  const root = makeProject();
  t.after(() => cleanup(root));
  const dev = read(root, '.sia-core/agents/dev.md')
    .replace("    task: apply-qa-fixes.md\n", "    task: apply-qa-fixes.md\n    template: inexistente-tmpl.yaml\n")
    .replace('  - name: develop\n    hat: dev', '  - name: develop\n    hat: ux');
  write(root, '.sia-core/agents/dev.md', dev);
  const agentMessages = messages(validateProject(root), 'agents');
  assert.ok(agentMessages.includes('error: *apply-qa-fixes: template inexistente-tmpl.yaml não está em dependencies.templates'));
  assert.ok(agentMessages.includes('error: *develop: chapéu ux não existe em hats'));
});

test('validate: task sem seção, com hat inválido, sem elicit e com next desconhecido', (t) => {
  const root = makeProject();
  t.after(() => cleanup(root));
  const file = '.sia-core/tasks/qa-gate.md';
  const text = read(root, file)
    .replace('hat: quality', 'hat: data')
    .replace('elicit: false\n', '')
    .replace('next: [close-story]', 'next: [comando-fantasma]')
    .replace('## Saída', '## Resultado');
  write(root, file, text);
  const report = validateProject(root);
  const taskMessages = messages(report, 'tasks');
  assert.ok(taskMessages.some((m) => m.startsWith('error: hat inválido para @pm: data')), taskMessages.join('\n'));
  assert.ok(taskMessages.some((m) => m.startsWith('error: elicit deve ser booleano')));
  assert.ok(taskMessages.includes('error: seção obrigatória ausente: ## Saída'));
  assert.ok(taskMessages.includes('warning: next: comando *comando-fantasma não existe em nenhum agente'));
});

test('validate: avisos só falham com --strict', (t) => {
  const root = makeProject();
  t.after(() => cleanup(root));
  const file = '.sia-core/tasks/push.md';
  write(root, file, read(root, file).replace('next: []', 'next: [inexistente]'));
  assert.equal(runCli(['validate'], { cwd: root }).code, 0);
  assert.equal(runCli(['validate', '--strict'], { cwd: root }).code, 1);
});

test('validate: workflow com agent inválido, task inexistente e requires quebrado', (t) => {
  const root = makeProject();
  t.after(() => cleanup(root));
  const file = '.sia-core/workflows/story-development-cycle.yaml';
  const text = read(root, file)
    .replace('      agent: dev\n', '      agent: qa\n')
    .replace('task: validate-story.md', 'task: nao-existe.md')
    .replace('requires: [validate]', 'requires: [fantasma]');
  write(root, file, text);
  const wf = messages(validateProject(root), 'workflows');
  assert.ok(wf.includes('error: passo develop: agent inválido (qa)'), wf.join('\n'));
  assert.ok(wf.includes('error: passo validate: task inexistente (nao-existe.md)'));
  assert.ok(wf.includes('error: passo develop: requires aponta para passo inexistente (fantasma)'));
});

test('validate: workflow-chains com comando que o agente não tem', (t) => {
  const root = makeProject();
  t.after(() => cleanup(root));
  const file = '.sia-core/data/workflow-chains.yaml';
  write(root, file, read(root, file).replace("command: '*push'", "command: '*deploy-magico'"));
  const chains = messages(validateProject(root), 'chains');
  assert.ok(chains.includes('error: sdc passo 5: @devops não tem o comando *deploy-magico'), chains.join('\n'));
});

test('validate: skill com name diferente do diretório e task fonte inexistente', (t) => {
  const root = makeProject();
  t.after(() => cleanup(root));
  const file = '.sia-core/skills/sia-develop-story/SKILL.md';
  write(root, file, read(root, file).replace('name: sia-develop-story', 'name: outro-nome').replace('develop-story.md`', 'sumida.md`'));
  const skills = messages(validateProject(root), 'skills');
  assert.ok(skills.includes('error: name (outro-nome) diferente do diretório (sia-develop-story)'), skills.join('\n'));
  assert.ok(skills.includes('error: Task fonte da verdade inexistente: .sia-core/tasks/sumida.md'));
});

test('validate --squad: schema, componentes e agentes do squad', (t) => {
  const root = makeProject();
  t.after(() => cleanup(root));
  write(
    root,
    'squads/demo/squad.yaml',
    'name: Demo X\nversion: "1.0"\nlicense: GPL\ncomponents:\n  agents: [demo-agent.md]\n  tasks: [demo-task.md, sumida.md]\n',
  );
  const report = validateProject(root, { squad: 'demo' });
  const squad = messages(report, 'squads');
  assert.ok(squad.some((m) => m.startsWith('error: schema: name: não corresponde ao padrão')), squad.join('\n'));
  assert.ok(squad.some((m) => m.startsWith('error: schema: version')));
  assert.ok(squad.some((m) => m.startsWith('error: schema: license: valor fora do enum')));
  assert.ok(squad.includes('error: components.tasks: tasks/sumida.md não existe'));
  assert.equal(report.groups.agents.checked, 0);
  const cli = runCli(['validate', '--squad', 'demo'], { cwd: root });
  assert.equal(cli.code, 1);
  assert.equal(runCli(['validate', '--squad', 'nao-existe'], { cwd: root }).code, 1);
});

test('validate --squad: dependências resolvem no squad e depois no .sia-core; schema ausente vira aviso', (t) => {
  const root = makeProject();
  t.after(() => cleanup(root));
  fs.unlinkSync(path.join(root, '.sia-core', 'schemas', 'squad-schema.json'));
  const report = validateProject(root, { squad: 'demo' });
  assert.equal(report.summary.errors, 0, JSON.stringify(report.groups.squads.issues));
  assert.ok(messages(report, 'squads').some((m) => m.startsWith('warning: schema ausente')));
  write(root, 'squads/demo/agents/demo-agent.md', read(root, 'squads/demo/agents/demo-agent.md').replace('next.md]', 'sem-arquivo.md]'));
  const broken = messages(validateProject(root, { squad: 'demo' }), 'squads');
  assert.ok(broken.includes('error: dependência ausente: tasks/sem-arquivo.md'), broken.join('\n'));
});
