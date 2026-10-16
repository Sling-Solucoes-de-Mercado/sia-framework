'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { makeProject, cleanup, runCli, write, writeStory, qaBlock } = require('./_helpers');
const sdc = require('../lib/sdc');
const storyLib = require('../lib/story');
const { loadConfig } = require('../lib/config');
const { UsageError } = require('../lib/errors');

function ctxOf(root) {
  const { config } = loadConfig(path.join(root, '.sia-core', 'core-config.yaml'));
  return { root, config };
}

function verify(root, id, phase, options = {}) {
  const { config } = ctxOf(root);
  const loaded = storyLib.loadStory(root, config, id);
  return sdc.verifyPhase(root, config, loaded, phase, options);
}

test('máquina de fases: caminho feliz até completed', () => {
  const state = sdc.createState({ storyId: '1.1', maxQgIterations: 5 });
  assert.equal(state.currentPhase, 'validate');
  sdc.markPhase(state, 'validate', 'passed');
  assert.equal(state.currentPhase, 'develop');
  sdc.markPhase(state, 'develop', 'passed');
  assert.equal(state.currentPhase, 'inspect');
  sdc.markPhase(state, 'inspect', 'passed');
  assert.equal(state.currentPhase, 'review');
  sdc.markPhase(state, 'review', 'passed', { outcome: 'approved' });
  assert.equal(state.currentPhase, 'close');
  sdc.markPhase(state, 'close', 'passed');
  assert.equal(state.currentPhase, null);
  assert.equal(state.status, 'completed');
  assert.equal(state.history.length, 5);
});

test('máquina de fases: changes_requested → apply_qa_fixes → reinspeção', () => {
  const state = sdc.createState({ storyId: '1.1', maxQgIterations: 5 });
  for (const phase of ['validate', 'develop', 'inspect']) sdc.markPhase(state, phase, 'passed');
  sdc.markPhase(state, 'review', 'passed', { outcome: 'changes_requested' });
  assert.equal(state.currentPhase, 'apply_qa_fixes');
  const { message } = sdc.markPhase(state, 'apply_qa_fixes', 'passed');
  assert.match(message, /Reinspeção obrigatória/);
  assert.equal(state.qgIterations, 1);
  assert.equal(state.currentPhase, 'inspect');
  assert.equal(state.phases.inspect.status, 'pending');
  assert.equal(state.phases.review.status, 'pending');
  assert.ok(state.inspectNotBefore);
  sdc.markPhase(state, 'inspect', 'passed');
  assert.equal(state.currentPhase, 'review');
});

test('máquina de fases: circuit breaker com qgIterations ≥ máximo', () => {
  const state = sdc.createState({ storyId: '1.1', maxQgIterations: 2 });
  for (const phase of ['validate', 'develop', 'inspect']) sdc.markPhase(state, phase, 'passed');
  for (let i = 0; i < 2; i += 1) {
    sdc.markPhase(state, 'review', 'passed', { outcome: 'changes_requested' });
    sdc.markPhase(state, 'apply_qa_fixes', 'passed');
    sdc.markPhase(state, 'inspect', 'passed');
  }
  assert.equal(state.qgIterations, 2);
  const { message } = sdc.markPhase(state, 'review', 'passed', { outcome: 'changes_requested' });
  assert.equal(state.status, 'halted');
  assert.equal(state.phases.review.status, 'halted');
  assert.match(message, /Circuit breaker/);
  assert.match(message, /Escale para um humano/);
});

test('máquina de fases: erros de uso', () => {
  const state = sdc.createState({ storyId: '1.1' });
  assert.throws(() => sdc.markPhase(state, 'deploy', 'passed'), UsageError);
  assert.throws(() => sdc.markPhase(state, 'review', 'passed'), UsageError);
  assert.throws(() => sdc.markPhase(state, 'validate', 'ok'), UsageError);
  sdc.markPhase(state, 'validate', 'failed', { notes: 'NO-GO' });
  assert.equal(state.status, 'failed');
  assert.equal(state.currentPhase, 'validate');
});

test('plan: retoma pelo status da story', () => {
  const seed = (status, extra = {}) => sdc.seedFromStory(sdc.createState({ storyId: '1.1' }), { status, ...extra });
  assert.equal(seed('Draft').currentPhase, 'validate');
  assert.equal(seed('Ready').currentPhase, 'develop');
  assert.equal(seed('InProgress').phases.validate.status, 'passed');
  assert.equal(seed('InReview').currentPhase, 'inspect');
  const done = seed('Done', { closeOk: true });
  assert.equal(done.status, 'completed');
  const doneWithoutGate = seed('Done', { closeOk: false, hasInspection: false });
  assert.equal(doneWithoutGate.currentPhase, 'review');
  assert.equal(doneWithoutGate.phases.inspect.status, 'skipped');
  assert.throws(() => seed(null, { statusRaw: 'Pronto' }), /Status da story inválido/);
});

test('verify validate e develop', (t) => {
  const root = makeProject();
  t.after(() => cleanup(root));
  writeStory(root, '2.1', { status: 'Draft' });
  assert.equal(verify(root, '2.1', 'validate').ok, false);
  writeStory(root, '2.1', { status: 'Ready' });
  assert.equal(verify(root, '2.1', 'validate').ok, true);
  assert.equal(verify(root, '2.1', 'develop').ok, false);
  writeStory(root, '2.1', { status: 'InReview', tasks: ['- [x] 1. A', '- [ ] 2. B'] });
  const develop = verify(root, '2.1', 'develop');
  assert.equal(develop.ok, true);
  assert.ok(develop.checks.some((c) => !c.ok && c.level === 'warning'));
  writeStory(root, '2.1', { status: 'InReview', files: [] });
  assert.equal(verify(root, '2.1', 'develop').ok, false);
});

test('verify inspect: relatório com story == id e reinspeção depois das correções', (t) => {
  const root = makeProject();
  t.after(() => cleanup(root));
  assert.equal(verify(root, '1.1', 'inspect').ok, true);
  writeStory(root, '3.1', { status: 'InReview' });
  assert.equal(verify(root, '3.1', 'inspect').ok, false);
  const later = { inspectNotBefore: '2026-10-17T00:00:00.000Z' };
  const reinspect = verify(root, '1.1', 'inspect', { state: later });
  assert.equal(reinspect.ok, false);
  assert.match(reinspect.failures[0], /posterior às correções/);
  write(
    root,
    'docs/qa/inspections/2026-10-18-0900-revisar-feature-1.1.md',
    "---\ncommand: revisar-feature\nstory: '1.1'\nverdict: aprovado\ndate: '2026-10-18T09:00:00-03:00'\nrevision: 9999999\n---\n",
  );
  assert.equal(verify(root, '1.1', 'inspect', { state: later }).ok, true);
});

test('verify review: PASS, FAIL, campos obrigatórios, arquivo do gate e WAIVED', (t) => {
  const root = makeProject();
  t.after(() => cleanup(root));
  writeStory(root, '4.1', { status: 'Done', qa: qaBlock({ gate: 'PASS' }) });
  const pass = verify(root, '4.1', 'review');
  assert.equal(pass.ok, true, pass.failures.join('; '));
  assert.equal(pass.outcome, 'approved');

  writeStory(root, '4.1', { status: 'InProgress', qa: qaBlock({ gate: 'FAIL' }) });
  const fail = verify(root, '4.1', 'review');
  assert.equal(fail.ok, true);
  assert.equal(fail.outcome, 'changes_requested');

  writeStory(root, '4.1', { status: 'Done', qa: qaBlock({ gate: 'FAIL' }) });
  assert.equal(verify(root, '4.1', 'review').ok, false);

  writeStory(root, '4.1', { status: 'Done', qa: qaBlock({ gate: 'PASS', reviewer: null }) });
  assert.equal(verify(root, '4.1', 'review').ok, false);

  write(root, 'docs/qa/gates/4.1-teste.yml', "schema: 1\nstory: '4.1'\ngate: CONCERNS\n");
  writeStory(root, '4.1', { status: 'Done', qa: qaBlock({ gate: 'PASS', gateFile: 'docs/qa/gates/4.1-teste.yml' }) });
  const mismatch = verify(root, '4.1', 'review');
  assert.equal(mismatch.ok, false);
  assert.ok(mismatch.failures.some((f) => f.includes('arquivo do gate')));

  write(root, 'docs/qa/gates/4.1-teste.yml', "schema: 1\nstory: '4.1'\ngate: WAIVED\nwaiver: { active: false, reason: '', approved_by: '' }\n");
  writeStory(root, '4.1', { status: 'Done', qa: qaBlock({ gate: 'WAIVED', gateFile: 'docs/qa/gates/4.1-teste.yml' }) });
  assert.equal(verify(root, '4.1', 'review').ok, false);
  write(root, 'docs/qa/gates/4.1-teste.yml', "schema: 1\nstory: '4.1'\ngate: WAIVED\nwaiver: { active: true, reason: 'prazo regulatório', approved_by: 'Diretoria' }\n");
  assert.equal(verify(root, '4.1', 'review').ok, true);
});

test('verify apply_qa_fixes e close', (t) => {
  const root = makeProject();
  t.after(() => cleanup(root));
  writeStory(root, '5.1', { status: 'InReview', qa: qaBlock({ gate: 'FAIL' }) });
  assert.equal(verify(root, '5.1', 'apply_qa_fixes').ok, true);
  writeStory(root, '5.1', { status: 'InProgress', qa: qaBlock({ gate: 'FAIL' }) });
  assert.equal(verify(root, '5.1', 'apply_qa_fixes').ok, false);
  writeStory(root, '5.1', { status: 'Done', qa: qaBlock({ gate: 'CONCERNS' }) });
  assert.equal(verify(root, '5.1', 'close').ok, true);
  writeStory(root, '5.1', { status: 'Done', qa: qaBlock({ gate: 'FAIL' }) });
  assert.equal(verify(root, '5.1', 'close').ok, false);
});

test('CLI sdc: plan, next, verify --mark, sequence lock e status', (t) => {
  const root = makeProject();
  t.after(() => cleanup(root));
  const plan = runCli(['sdc', 'plan', '1.1', '--json'], { cwd: root });
  assert.equal(plan.code, 0, plan.stderr);
  assert.equal(plan.json.state.currentPhase, 'inspect');
  assert.equal(plan.json.state.maxQgIterations, 2);
  assert.ok(fs.existsSync(path.join(root, '.sia', 'sdc', '1.1', 'state.json')));

  const next = runCli(['sdc', 'next', '1.1', '--json'], { cwd: root });
  assert.equal(next.json.next.agent, '@validator');
  assert.equal(next.json.next.command, '*revisar-feature 1.1');
  assert.equal(next.json.next.skill, 'revisar-feature');

  const locked = runCli(['sdc', 'verify', '1.1', 'validate', '--mark'], { cwd: root });
  assert.equal(locked.code, 1);
  assert.match(locked.stderr, /Sequence lock/);

  const inspect = runCli(['sdc', 'verify', '1.1', 'inspect', '--mark', '--json'], { cwd: root });
  assert.equal(inspect.code, 0, inspect.stdout);
  assert.equal(inspect.json.marked.currentPhase, 'review');

  const review = runCli(['sdc', 'verify', '1.1', 'review', '--mark'], { cwd: root });
  assert.equal(review.code, 1);
  const status = runCli(['sdc', 'status', '1.1', '--json'], { cwd: root });
  assert.equal(status.json.state.status, 'failed');
  assert.equal(status.json.state.currentPhase, 'review');

  const resumed = runCli(['sdc', 'plan', '1.1', '--json'], { cwd: root });
  assert.equal(resumed.json.resumed, true);
  assert.equal(runCli(['sdc', 'next', '9.9'], { cwd: root }).code, 1);
  assert.equal(runCli(['sdc', 'verify', '1.1', 'deploy'], { cwd: root }).code, 2);
  assert.equal(runCli(['sdc', 'mark', '1.1', 'review', '--status', 'passed'], { cwd: root }).code, 2);
});

test('CLI sdc mark: circuit breaker sai com 1 e mensagem de escalada', (t) => {
  const root = makeProject();
  t.after(() => cleanup(root));
  runCli(['sdc', 'plan', '1.1'], { cwd: root });
  const mark = (phase, status, outcome) =>
    runCli(['sdc', 'mark', '1.1', phase, '--status', status, ...(outcome ? ['--outcome', outcome] : [])], { cwd: root });
  assert.equal(mark('inspect', 'passed').code, 0);
  for (let i = 0; i < 2; i += 1) {
    assert.equal(mark('review', 'passed', 'changes_requested').code, 0);
    assert.equal(mark('apply_qa_fixes', 'passed').code, 0);
    assert.equal(mark('inspect', 'passed').code, 0);
  }
  const halted = mark('review', 'passed', 'changes_requested');
  assert.equal(halted.code, 1);
  assert.match(halted.stdout, /Circuit breaker/);
  const next = runCli(['sdc', 'next', '1.1', '--json'], { cwd: root });
  assert.equal(next.json.halted, true);
});

function executorStory(root, id, status, executor, extra = {}) {
  const { storyText } = require('./_helpers');
  const text = storyText(id, { status, ...extra }).replace('## Tasks / Subtasks', `## Executor\n- Executor: ${executor}\n- Gate de qualidade: @pm [Qualidade]\n\n## Tasks / Subtasks`);
  return write(root, `docs/stories/${id}-teste.story.md`, text);
}

test('executor declarado: pesquisa pula a inspeção e devops usa *develop', (t) => {
  const root = makeProject();
  t.after(() => cleanup(root));
  executorStory(root, '6.1', 'Ready', '@pm [Análise]');
  const plan = runCli(['sdc', 'plan', '6.1', '--json'], { cwd: root });
  assert.equal(plan.json.state.skipInspection, true);
  assert.equal(plan.json.state.phases.inspect.status, 'skipped');
  assert.equal(plan.json.next.command, '*execute-research-story 6.1');
  assert.equal(plan.json.next.agent, '@pm');

  executorStory(root, '6.1', 'InReview', '@pm [Análise]');
  const review = runCli(['sdc', 'plan', '6.1', '--force', '--json'], { cwd: root });
  assert.equal(review.json.state.currentPhase, 'review');
  assert.equal(verify(root, '6.1', 'inspect').ok, true);

  executorStory(root, '6.2', 'Ready', '@devops [Infraestrutura]');
  const devops = runCli(['sdc', 'plan', '6.2', '--json'], { cwd: root });
  assert.equal(devops.json.next.agent, '@devops');
  assert.equal(devops.json.next.command, '*develop 6.2');
  assert.equal(devops.json.state.skipInspection, false);

  const state = sdc.createState({ storyId: '6.1', executor: { agent: 'pm', hat: 'Análise' } });
  sdc.seedFromStory(state, { status: 'InReview' });
  sdc.markPhase(state, 'review', 'passed', { outcome: 'changes_requested' });
  assert.equal(sdc.nextAction(state).command, '*execute-research-story 6.1');
  sdc.markPhase(state, 'apply_qa_fixes', 'passed');
  assert.equal(state.currentPhase, 'review', 'sem reinspeção em story de pesquisa');
});

test('inspeção reprovada antes do gate: apply_qa_fixes com a story em InReview e reinspeção', (t) => {
  const root = makeProject();
  t.after(() => cleanup(root));
  write(root, 'docs/qa/inspections/2026-10-16-1430-revisar-feature-1.1.md', "---\ncommand: revisar-feature\nstory: '1.1'\nverdict: reprovado\ndate: '2026-10-16T14:30:00-03:00'\nrevision: '0123456'\n---\n");
  const plan = runCli(['sdc', 'plan', '1.1', '--json'], { cwd: root });
  assert.equal(plan.json.state.currentPhase, 'inspect');
  const inspect = runCli(['sdc', 'verify', '1.1', 'inspect', '--mark', '--json'], { cwd: root });
  assert.equal(inspect.code, 0, inspect.stdout);
  assert.equal(inspect.json.outcome, 'changes_requested');
  assert.equal(inspect.json.marked.currentPhase, 'apply_qa_fixes');
  const next = runCli(['sdc', 'next', '1.1', '--json'], { cwd: root });
  assert.equal(next.json.next.command, '*apply-qa-fixes 1.1');
  const fixes = runCli(['sdc', 'verify', '1.1', 'apply_qa_fixes', '--mark', '--json'], { cwd: root });
  assert.equal(fixes.code, 0, fixes.stdout);
  assert.equal(fixes.json.marked.currentPhase, 'inspect');
  assert.equal(fixes.json.marked.qgIterations, 1);
  const stale = runCli(['sdc', 'verify', '1.1', 'inspect'], { cwd: root });
  assert.equal(stale.code, 1, 'o relatório antigo não serve para a reinspeção');

  const state = sdc.createState({ storyId: '1.1', maxQgIterations: 1 });
  sdc.seedFromStory(state, { status: 'InReview' });
  sdc.markPhase(state, 'inspect', 'passed', { outcome: 'changes_requested' });
  sdc.markPhase(state, 'apply_qa_fixes', 'passed');
  const { message } = sdc.markPhase(state, 'inspect', 'passed', { outcome: 'changes_requested' });
  assert.equal(state.status, 'halted');
  assert.match(message, /Circuit breaker/);
  assert.throws(() => sdc.markPhase(sdc.createState({ storyId: 'x' }), 'develop', 'passed', { outcome: 'approved' }), UsageError);
});

test('gate com reviewed_revision entre aspas e ### Revisão (iteração N)', (t) => {
  const root = makeProject();
  t.after(() => cleanup(root));
  write(root, 'docs/qa/gates/4.2-teste.yml', "schema: 1\nstory: '4.2'\ngate: PASS\nreviewer: '@pm (Mira) [Qualidade]'\nreviewed_revision: '0012345'\niteration: 2\n");
  writeStory(root, '4.2', {
    status: 'Done',
    qa: [
      ...qaBlock({ gate: 'FAIL', revision: '0000001' }),
      '',
      '### Pedido de correção (iteração 1)',
      '1. Corrigir',
      '',
      '### Revisão (iteração 2)',
      ...qaBlock({ gate: 'PASS', revision: '0012345', gateFile: 'docs/qa/gates/4.2-teste.yml' }),
    ],
  });
  const result = verify(root, '4.2', 'review');
  assert.equal(result.ok, true, result.failures.join('; '));
  assert.equal(result.outcome, 'approved');
  const { config } = ctxOf(root);
  assert.equal(storyLib.loadGateFile(root, config, '4.2', storyLib.loadStory(root, config, '4.2').story.qa).reviewedRevision, '0012345');
});
