'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { FIXTURES } = require('./_helpers');
const agents = require('../lib/agents');
const tasks = require('../lib/tasks');
const story = require('../lib/story');
const yaml = require('../lib/yaml');
const { validate } = require('../lib/schema-validator');
const { readText } = require('../lib/fsutil');

const MINI = path.join(FIXTURES, 'mini');

test('agente: lê o bloco yaml, comandos, chapéus e dependências', () => {
  const parsed = agents.parseAgentFile(path.join(MINI, '.sia-core', 'agents', 'pm.md'));
  assert.equal(parsed.error, null);
  assert.equal(parsed.id, 'pm');
  assert.equal(parsed.agent.name, 'Mira');
  assert.equal(parsed.hats.length, 3);
  assert.ok(parsed.commands.some((cmd) => cmd.name === 'qa-gate' && cmd.task === 'qa-gate.md' && cmd.hat === 'quality'));
  assert.deepEqual(agents.dependencyList(parsed, 'checklists'), ['story-draft-checklist.md']);
  const summary = agents.summarizeAgent(parsed);
  assert.equal(summary.firstSentence, 'Use para stories, backlog e o veredito do QA gate.');
});

test('agente: arquivo sem bloco yaml e comandos em forma curta', () => {
  assert.equal(yaml.extractYamlBlock('# agente\n\nsem bloco'), null);
  const commands = agents.normalizeCommands([{ name: 'a', task: 'a.md', extra: 1 }, { 'b-cmd': 'descrição' }, 'solto']);
  assert.equal(commands[0].name, 'a');
  assert.deepEqual(commands[0].extraKeys, ['extra']);
  assert.equal(commands[1].name, 'b-cmd');
  assert.equal(commands[1].description, 'descrição');
  assert.equal(commands[2].malformed, true);
});

test('texto: primeira frase e truncamento na fronteira de palavra', () => {
  assert.equal(agents.firstSentence('Primeira frase. Segunda frase.'), 'Primeira frase.');
  assert.equal(agents.firstSentence('Sem ponto final'), 'Sem ponto final');
  const cut = agents.truncate('palavra '.repeat(60), 50);
  assert.ok(cut.length <= 50);
  assert.ok(cut.endsWith('…'));
  assert.equal(agents.resolveAgentId('@Lance'), 'devops');
  assert.equal(agents.resolveAgentId('elo'), 'squad-creator');
  assert.equal(agents.resolveAgentId('qa'), null);
});

test('story: status, checkboxes, File List e QA vazio', () => {
  const text = readText(path.join(MINI, 'docs', 'stories', '1.1-login.story.md'));
  const parsed = story.parseStory(text);
  assert.equal(parsed.storyId, '1.1');
  assert.equal(parsed.title, 'Login com e-mail');
  assert.equal(parsed.status, 'InReview');
  assert.equal(parsed.statusValid, true);
  assert.deepEqual({ done: parsed.tasks.done, total: parsed.tasks.total, open: parsed.tasks.open }, { done: 2, total: 3, open: 1 });
  assert.deepEqual(parsed.fileList.files, ['src/auth/login.ts', 'src/auth/login.test.ts']);
  assert.equal(parsed.qa.found, true);
  assert.equal(parsed.qa.gate, null);
});

test('story: status canônico e inválido', () => {
  assert.equal(story.canonicalStatus('**Done**').status, 'Done');
  assert.equal(story.canonicalStatus('In Progress').status, 'InProgress');
  assert.equal(story.canonicalStatus('inreview').status, 'InReview');
  assert.equal(story.canonicalStatus('Pronto').status, null);
  const parsed = story.parseStory('# Story 2.3: X\n\n## Status\n\nPronto\n');
  assert.equal(parsed.status, null);
  assert.equal(parsed.statusRaw, 'Pronto');
  assert.equal(parsed.statusValid, false);
});

test('story: Resultado do QA usa a última ocorrência de cada campo', () => {
  const text = [
    '# Story 2.1: Login social',
    '',
    '## Status',
    'Done',
    '',
    '## Resultado do QA',
    '',
    '- **Gate:** FAIL',
    '- **Revisor:** @pm (Mira) [Qualidade]',
    '- **Revisão:** 1111111',
    '',
    '### Pedido de correção (iteração 1)',
    '1. Corrigir validação',
    '',
    '- **Gate:** PASS',
    '- **Revisão:** 3f2a9c1',
    '- **Data:** 2026-10-16',
    '- **Arquivo do gate:** `docs/qa/gates/2.1-login-social.yml`',
    '- **Inspeção:** docs/qa/inspections/2026-10-16-1430-revisar-feature-2.1.md (aprovado com ressalvas)',
    '- **Resumo:** tudo certo',
    '',
    '## Change Log',
  ].join('\n');
  const qa = story.parseStory(text).qa;
  assert.equal(qa.gate, 'PASS');
  assert.equal(qa.gateValid, true);
  assert.equal(qa.revision, '3f2a9c1');
  assert.equal(qa.reviewer, '@pm (Mira) [Qualidade]');
  assert.equal(qa.gateFile, 'docs/qa/gates/2.1-login-social.yml');
  assert.equal(qa.inspection, 'docs/qa/inspections/2026-10-16-1430-revisar-feature-2.1.md');
  assert.equal(qa.inspectionVerdict, 'aprovado com ressalvas');
  assert.equal(qa.summary, 'tudo certo');
});

test('story: revisões e inspeção atual', () => {
  assert.equal(story.sameRevision('3f2a9c1', '3f2a9c1d0e'), true);
  assert.equal(story.sameRevision('3f2a9c1', 'abcdef0'), false);
  const inspection = { verdictValid: true, revision: '3f2a9c1' };
  assert.equal(story.inspectionIsCurrent(inspection, { head: '3f2a9c1' }), true);
  assert.equal(story.inspectionIsCurrent(inspection, { head: 'ffffff1' }), false);
  assert.equal(story.inspectionIsCurrent(inspection, { head: null, qa: { gate: 'FAIL', revision: '3f2a9c1' } }), false);
  assert.equal(story.inspectionIsCurrent(null, {}), false);
});

test('task: frontmatter, seções e next', () => {
  const parsed = tasks.parseTaskFile(path.join(MINI, '.sia-core', 'tasks', 'qa-gate.md'));
  assert.equal(parsed.error, null);
  assert.equal(parsed.frontmatter.agent, 'pm');
  assert.equal(parsed.frontmatter.hat, 'quality');
  assert.deepEqual(tasks.missingSections(parsed), []);
  assert.equal(tasks.nextCommandName('validate-story'), 'validate-story');
  assert.equal(tasks.nextCommandName('@pm *qa-gate {storyId}'), 'qa-gate');
  assert.equal(tasks.nextCommandName('*develop 2.1'), 'develop');
  const headings = tasks.headings('## Objetivo\n```md\n## Falso\n```\n## Passos', 2);
  assert.deepEqual(headings, ['Objetivo', 'Passos']);
});

test('frontmatter: com e sem bloco, e erro de YAML', () => {
  assert.equal(yaml.parseFrontmatter('sem frontmatter').hasFrontmatter, false);
  const ok = yaml.parseFrontmatter('---\nname: x\n---\ncorpo');
  assert.deepEqual(ok.data, { name: 'x' });
  assert.equal(ok.body, 'corpo');
  const bad = yaml.parseFrontmatter('---\nname: [x\n---\n');
  assert.ok(bad.error);
  const failsafe = yaml.parseFrontmatter("---\nstory: 1.10\n---\n", { failsafe: true });
  assert.equal(failsafe.data.story, '1.10');
});

test('schema: subconjunto de JSON Schema', () => {
  const schema = {
    type: 'object',
    required: ['name', 'version'],
    additionalProperties: false,
    properties: {
      name: { type: 'string', pattern: '^[a-z0-9-]+$', minLength: 2, maxLength: 5 },
      version: { type: 'string' },
      license: { type: 'string', enum: ['MIT'] },
      tags: { type: 'array', items: { type: 'string' } },
    },
  };
  assert.deepEqual(validate(schema, { name: 'ok', version: '1.0.0' }), []);
  const errors = validate(schema, { name: 'Muito-Longo', license: 'GPL', tags: ['a', 2], extra: true });
  const paths = errors.map((e) => e.path).sort();
  assert.deepEqual(paths, ['extra', 'license', 'name', 'name', 'tags[1]', 'version']);
  assert.deepEqual(validate({ type: 'object' }, []).map((e) => e.path), ['(raiz)']);
});
