'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { makeProject, tempDir, cleanup, runCli, writeStory, qaBlock } = require('./_helpers');
const { colorEnabled } = require('../lib/output');
const { findRoot } = require('../lib/root');

test('CLI: ajuda, versão e erros de uso', () => {
  const help = runCli(['--help']);
  assert.equal(help.code, 0);
  assert.match(help.stdout, /Comandos/);
  assert.equal(runCli([]).code, 2);
  const version = runCli(['--version']);
  assert.equal(version.code, 0);
  assert.match(version.stdout.trim(), /^\d+\.\d+\.\d+$/);
  const unknown = runCli(['inexistente']);
  assert.equal(unknown.code, 2);
  assert.match(unknown.stderr, /comando desconhecido/);
  const badOption = runCli(['validate', '--naoexiste']);
  assert.equal(badOption.code, 2);
  assert.match(badOption.stderr, /opção desconhecida: --naoexiste/);
  assert.match(runCli(['story', '--help']).stdout, /sia story status/);
});

test('CLI: raiz não encontrada é erro de uso; --root aponta outro diretório', (t) => {
  const outside = tempDir('sia-out-');
  const root = makeProject();
  t.after(() => {
    cleanup(outside);
    cleanup(root);
  });
  const noRoot = runCli(['validate'], { cwd: outside });
  assert.equal(noRoot.code, 2);
  assert.match(noRoot.stderr, /Raiz do projeto SIA não encontrada/);
  const json = runCli(['validate', '--json'], { cwd: outside });
  assert.equal(json.json.ok, false);
  assert.equal(json.json.error.code, 'ROOT_NOT_FOUND');
  assert.equal(runCli(['--root', root, 'validate'], { cwd: outside }).code, 0);
  assert.equal(runCli(['validate', '--root', root], { cwd: outside }).code, 0);
  const nested = path.join(root, 'docs', 'stories');
  assert.equal(findRoot(nested), root);
});

test('CLI: .sia-core como link simbólico (sandbox)', (t) => {
  const real = makeProject();
  const sandbox = tempDir('sia-link-');
  t.after(() => {
    cleanup(real);
    cleanup(sandbox);
  });
  fs.symlinkSync(path.join(real, '.sia-core'), path.join(sandbox, '.sia-core'), process.platform === 'win32' ? 'junction' : 'dir');
  fs.mkdirSync(path.join(sandbox, 'docs', 'stories'), { recursive: true });
  writeStory(sandbox, '7.1', { status: 'Ready' });
  const status = runCli(['story', 'status', '7.1', '--json'], { cwd: sandbox });
  assert.equal(status.code, 0, status.stderr);
  assert.equal(status.json.status, 'Ready');
  assert.equal(status.json.path, 'docs/stories/7.1-teste.story.md');
});

test('CLI story status: campos e próximo passo por status', (t) => {
  const root = makeProject();
  t.after(() => cleanup(root));
  const inReview = runCli(['story', 'status', '1.1', '--json'], { cwd: root });
  assert.equal(inReview.code, 0);
  assert.equal(inReview.json.status, 'InReview');
  assert.deepEqual(inReview.json.tasks, { done: 2, total: 3, open: 1 });
  assert.equal(inReview.json.fileList.count, 2);
  assert.equal(inReview.json.inspection.verdict, 'aprovado com ressalvas');
  assert.deepEqual(inReview.json.next.map((s) => `${s.agent} ${s.command}`), ['@pm *qa-gate 1.1']);

  const byPath = runCli(['story', 'status', 'docs/stories/1.1-login.story.md', '--json'], { cwd: root });
  assert.equal(byPath.json.storyId, '1.1');

  const expectations = [
    ['Draft', '@pm *validate-story 8.1'],
    ['Ready', '@dev *develop 8.1'],
    ['InProgress', '@dev *develop 8.1'],
  ];
  for (const [status, next] of expectations) {
    writeStory(root, '8.1', { status });
    const step = runCli(['story', 'status', '8.1', '--json'], { cwd: root }).json.next[0];
    assert.equal(`${step.agent} ${step.command}`, next, status);
  }
  writeStory(root, '8.1', { status: 'InProgress', qa: qaBlock({ gate: 'FAIL' }) });
  assert.equal(runCli(['story', 'status', '8.1', '--json'], { cwd: root }).json.next[0].command, '*apply-qa-fixes 8.1');
  writeStory(root, '8.1', { status: 'InReview' });
  assert.equal(runCli(['story', 'status', '8.1', '--json'], { cwd: root }).json.next[0].command, '*revisar-feature 8.1');
  writeStory(root, '8.1', { status: 'Done', qa: qaBlock({ gate: 'PASS' }) });
  const done = runCli(['story', 'status', '8.1', '--json'], { cwd: root }).json.next.map((s) => `${s.agent} ${s.command}`);
  assert.deepEqual(done, ['@devops *push', '@devops *create-pr 8.1', '@pm *close-story 8.1']);
  writeStory(root, '8.1', { status: 'Pronto' });
  assert.equal(runCli(['story', 'status', '8.1'], { cwd: root }).code, 1);
  assert.equal(runCli(['story', 'status', '9.9'], { cwd: root }).code, 1);
  assert.equal(runCli(['story', 'status'], { cwd: root }).code, 2);
});

test('CLI agent use/current/clear', (t) => {
  const root = makeProject();
  t.after(() => cleanup(root));
  const use = runCli(['agent', 'use', 'lance', '--json'], { cwd: root });
  assert.equal(use.code, 0);
  assert.equal(use.json.id, 'devops');
  assert.equal(use.json.source, 'cli');
  const data = JSON.parse(fs.readFileSync(path.join(root, '.sia', 'active-agent.json'), 'utf8'));
  assert.deepEqual(Object.keys(data).sort(), ['at', 'id', 'source']);
  const current = runCli(['agent', 'current', '--json'], { cwd: root });
  assert.equal(current.json.id, 'devops');
  assert.equal(current.json.fresh, true);
  assert.equal(runCli(['agent', 'use', 'qa'], { cwd: root }).code, 2);
  assert.equal(runCli(['agent', 'clear'], { cwd: root }).code, 0);
  assert.equal(fs.existsSync(path.join(root, '.sia', 'active-agent.json')), false);
  assert.equal(runCli(['agent', 'current', '--json'], { cwd: root }).json.active, false);
});

test('CLI squad list e doctor', (t) => {
  const root = makeProject();
  t.after(() => cleanup(root));
  const list = runCli(['squad', 'list', '--json'], { cwd: root });
  assert.equal(list.code, 0);
  assert.deepEqual(list.json.squads.map((s) => [s.name, s.version]), [['demo', '1.0.0']]);
  const doctor = runCli(['doctor', '--json'], { cwd: root });
  assert.equal(doctor.code, 1, 'a fixture não tem hooks nem cli no .sia-core');
  const areas = doctor.json.checks.map((c) => `${c.level}:${c.area}`);
  assert.ok(areas.includes('ok:node'));
  assert.ok(doctor.json.checks.some((c) => c.level === 'fail' && /hooks\/enforce-git-push-authority\.cjs/.test(c.message)));
  assert.ok(doctor.json.checks.some((c) => c.area === 'projeções' && c.level === 'warn'));
  assert.ok(doctor.json.checks.some((c) => c.area === 'mcp'));
});

test('saída: NO_COLOR e não-TTY desligam cores', () => {
  assert.equal(colorEnabled({ isTTY: true }, { NO_COLOR: '1' }), false);
  assert.equal(colorEnabled({ isTTY: false }, {}), false);
  assert.equal(colorEnabled({ isTTY: true }, {}), true);
  assert.equal(colorEnabled({ isTTY: false }, { FORCE_COLOR: '1' }), true);
  assert.equal(runCli(['--help'], { env: { NO_COLOR: '1' } }).stdout.includes('\u001b['), false);
});

test('CLI story status: executor declarado e inspeção reprovada', (t) => {
  const root = makeProject();
  t.after(() => cleanup(root));
  const { storyText, write } = require('./_helpers');
  const withExecutor = (id, status, executor) =>
    write(root, `docs/stories/${id}-teste.story.md`, storyText(id, { status }).replace('## Tasks / Subtasks', `## Executor\n- Executor: ${executor}\n\n## Tasks / Subtasks`));
  withExecutor('9.1', 'Ready', '@pm [Análise]');
  let status = runCli(['story', 'status', '9.1', '--json'], { cwd: root }).json;
  assert.deepEqual(status.executor, { agent: 'pm', hat: 'Análise', declared: true, research: true });
  assert.equal(status.next[0].command, '*execute-research-story 9.1');
  withExecutor('9.1', 'InReview', '@pm [Análise]');
  assert.equal(runCli(['story', 'status', '9.1', '--json'], { cwd: root }).json.next[0].command, '*qa-gate 9.1');
  withExecutor('9.2', 'Ready', '@devops');
  assert.equal(runCli(['story', 'status', '9.2', '--json'], { cwd: root }).json.next[0].agent, '@devops');
  write(root, 'docs/qa/inspections/2026-10-17-1000-revisar-feature-1.1.md', "---\ncommand: revisar-feature\nstory: '1.1'\nverdict: reprovado\ndate: '2026-10-17T10:00:00-03:00'\nrevision: '7777777'\n---\n");
  status = runCli(['story', 'status', '1.1', '--json'], { cwd: root }).json;
  assert.equal(status.inspection.verdict, 'reprovado');
  assert.equal(status.next[0].command, '*apply-qa-fixes 1.1');
  assert.equal(status.executor.declared, true);
  const human = runCli(['story', 'status', '1.1'], { cwd: root });
  assert.match(human.stdout, /Executor\s+@dev \[dev\]/);
});
