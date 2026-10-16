'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { tempDir, cleanup, runHook, write } = require('./_helpers');
const authority = require('../../hooks/enforce-git-push-authority.cjs');
const tracker = require('../../hooks/track-active-agent.cjs');

const PUSH = 'enforce-git-push-authority.cjs';
const TRACK = 'track-active-agent.cjs';

/** Projeto mínimo: só precisa do .sia-core para ancorar a raiz. */
function project(t) {
  const root = tempDir('sia-hook-');
  fs.mkdirSync(path.join(root, '.sia-core'), { recursive: true });
  t.after(() => cleanup(root));
  return root;
}

function bridge(root, id, ageMs = 0) {
  const file = write(root, '.sia/active-agent.json', JSON.stringify({ id, source: 'hook', at: new Date().toISOString() }));
  const when = new Date(Date.now() - ageMs);
  fs.utimesSync(file, when, when);
  return file;
}

function decide(root, command, env = {}) {
  return authority.decide(JSON.stringify({ tool_input: { command }, cwd: root }), { env, cwd: root });
}

test('autoridade: padrões bloqueados e permitidos', (t) => {
  const root = project(t);
  const blocked = [
    'git push origin main',
    'git -C ../repo --no-pager push --force',
    'git -c core.x=1 push',
    'cd x && git push',
    'gh pr create --fill',
    'gh --repo o/r pr merge 12 --squash',
    'gh api repos/o/r/pulls -f title=x -f head=feat',
    'gh api -X PUT repos/o/r/pulls/1/merge',
    "gh api graphql -f query='mutation { createPullRequest(input: {}) { clientMutationId } }'",
    'gh release create v1.2.0 --notes x',
    'vercel --prod',
    'npx vercel deploy --prod --yes',
    'vercel deploy --target=production',
    'vercel promote https://app-abc.vercel.app',
    'vercel rollback',
    'vercel build\nvercel --prod',
  ];
  for (const command of blocked) {
    const result = decide(root, command);
    assert.equal(result.action, 'deny', `deveria bloquear: ${command}`);
  }
  const allowed = [
    'git status && git commit -m "push depois"',
    'git pull --rebase',
    'gh pr view 12',
    'gh api repos/o/r/pulls',
    'gh release list',
    'vercel deploy',
    'vercel build --prod',
    'vercel env pull --environment=production',
    'npm test',
  ];
  for (const command of allowed) {
    assert.equal(decide(root, command).action, 'allow', `deveria permitir: ${command}`);
  }
});

test('autoridade: identidade pelo arquivo fresco, env e prefixo', (t) => {
  const root = project(t);
  assert.equal(decide(root, 'git push').action, 'deny');
  assert.equal(decide(root, 'git push', { SIA_ACTIVE_AGENT: 'devops' }).action, 'allow');
  assert.equal(decide(root, 'git push', { SIA_ACTIVE_AGENT: '@lance' }).action, 'allow');
  assert.equal(decide(root, 'git push', { SIA_ACTIVE_AGENT: 'sia-devops' }).action, 'allow');
  assert.equal(decide(root, 'git push', { SIA_ACTIVE_AGENT: 'fake-devops' }).action, 'deny');
  assert.equal(decide(root, 'SIA_ACTIVE_AGENT=devops git push').action, 'allow');

  bridge(root, 'devops');
  assert.equal(decide(root, 'git push').action, 'allow');
  bridge(root, 'pm');
  const result = decide(root, 'SIA_ACTIVE_AGENT=devops git push', { SIA_ACTIVE_AGENT: 'devops' });
  assert.equal(result.action, 'deny', 'o arquivo fresco decide');
  assert.match(result.reason, /@pm/);
});

test('autoridade: arquivo vencido ou no futuro é ignorado', (t) => {
  const root = project(t);
  bridge(root, 'devops', 9 * 60 * 60 * 1000);
  assert.equal(decide(root, 'git push').action, 'deny');
  assert.equal(decide(root, 'git push', { SIA_ACTIVE_AGENT: 'devops' }).action, 'allow');
  bridge(root, 'devops', -60 * 60 * 1000);
  assert.equal(decide(root, 'git push').action, 'deny');
  bridge(root, 'pm', 9 * 60 * 60 * 1000);
  assert.equal(decide(root, 'SIA_ACTIVE_AGENT=devops git push').action, 'allow', 'arquivo vencido não decide');
});

test('autoridade (processo): saída de bloqueio, permissão silenciosa e stdin inválido', (t) => {
  const root = project(t);
  const denied = runHook(PUSH, { tool_input: { command: 'git push' }, cwd: root }, { cwd: root });
  assert.equal(denied.code, 2);
  const payload = JSON.parse(denied.stdout);
  assert.equal(payload.decision, 'block');
  assert.equal(payload.hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.equal(payload.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(denied.stderr, /Artigo II/);
  assert.match(denied.stderr, /\/sia-devops/);

  const grok = runHook(PUSH, { toolInput: { command: 'gh pr create' }, workspaceRoot: root }, { cwd: root });
  assert.equal(grok.code, 2);
  const parameters = runHook(PUSH, { parameters: { command: 'gh release create v1' } }, { cwd: root });
  assert.equal(parameters.code, 2);

  const allowed = runHook(PUSH, { tool_input: { command: 'git push' }, cwd: root }, { cwd: root, env: { SIA_ACTIVE_AGENT: 'devops' } });
  assert.equal(allowed.code, 0);
  assert.equal(allowed.stdout, '');

  const harmless = runHook(PUSH, { tool_input: { command: 'ls -la' }, cwd: root }, { cwd: root });
  assert.equal(harmless.code, 0);
  assert.equal(harmless.stdout, '');

  assert.equal(runHook(PUSH, 'git push origin main', { cwd: root }).code, 2);
  assert.equal(runHook(PUSH, 'isto não é json', { cwd: root }).code, 0);
  assert.equal(runHook(PUSH, '', { cwd: root }).code, 0);
});

test('rastreador: grava o agente ativo nas formas de ativação', (t) => {
  const root = project(t);
  const file = path.join(root, '.sia', 'active-agent.json');
  const cases = [
    ['/sia-devops', 'devops'],
    ['/SIA:agents:pm *help', 'pm'],
    ['@lance faça o push', 'devops'],
    ['$sia-validator 2.1', 'validator'],
    ['  @mira, crie a story', 'pm'],
    ['/sia-squad-creator', 'squad-creator'],
    ['@davi', 'dev'],
  ];
  for (const [prompt, id] of cases) {
    const result = runHook(TRACK, { prompt, cwd: root }, { cwd: root });
    assert.equal(result.code, 0);
    assert.equal(result.stdout, '');
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(data.id, id, prompt);
    assert.equal(data.source, 'hook');
    assert.ok(!Number.isNaN(Date.parse(data.at)));
  }
});

test('rastreador: ignora prompts sem ativação e limpa com *exit', (t) => {
  const root = project(t);
  const file = path.join(root, '.sia', 'active-agent.json');
  runHook(TRACK, { prompt: '/sia-dev', cwd: root }, { cwd: root });
  for (const prompt of ['olá @devops', '/sia-fantasma', '@pmx', '@dev.md', 'git push']) {
    runHook(TRACK, { prompt, cwd: root }, { cwd: root });
    assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).id, 'dev', prompt);
  }
  runHook(TRACK, { userPrompt: '@vera', workspaceRoot: root }, { cwd: root });
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).id, 'validator');
  const exit = runHook(TRACK, { prompt: '  *exit  ', cwd: root }, { cwd: root });
  assert.equal(exit.code, 0);
  assert.equal(exit.stdout, '');
  assert.equal(fs.existsSync(file), false);
  const invalid = runHook(TRACK, 'não é json', { cwd: root });
  assert.equal(invalid.code, 0);
  assert.equal(invalid.stdout, '');
});

test('rastreador: prefixo configurado em ide.slashPrefix e detecção pura', (t) => {
  const root = project(t);
  write(root, '.sia-core/core-config.yaml', 'ide:\n  slashPrefix: XPTO\n');
  runHook(TRACK, { prompt: '/XPTO:agents:dev', cwd: root }, { cwd: root });
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, '.sia', 'active-agent.json'), 'utf8')).id, 'dev');
  assert.equal(tracker.detectActivation('/OUTRO:agents:dev'), null);
  assert.deepEqual(tracker.detectActivation('*exit'), { action: 'clear' });
  assert.equal(tracker.extractPrompt({ input: { prompt: 'x' } }), 'x');
});

test('autoridade (processo): gh release e deploy de produção da Vercel bloqueados fora do @devops', (t) => {
  const root = project(t);
  for (const command of ['gh release create v2.0.0', 'vercel --prod', 'vercel deploy --prod', 'vercel promote https://x.vercel.app', 'vercel rollback']) {
    const denied = runHook(PUSH, { tool_input: { command }, cwd: root }, { cwd: root });
    assert.equal(denied.code, 2, command);
    assert.equal(JSON.parse(denied.stdout).hookSpecificOutput.permissionDecision, 'deny');
  }
  bridge(root, 'lance');
  for (const command of ['gh release create v2.0.0', 'vercel --prod']) {
    assert.equal(runHook(PUSH, { tool_input: { command }, cwd: root }, { cwd: root }).code, 0, command);
  }
});
