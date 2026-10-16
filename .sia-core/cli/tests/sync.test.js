'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { makeProject, tempDir, cleanup, runCli, write, read } = require('./_helpers');
const { runSync } = require('../commands/sync');
const managed = require('../lib/managed-files');
const { loadConfig } = require('../lib/config');
const yaml = require('../lib/yaml');

const IDES = ['claude-code', 'codex', 'gemini', 'grok'];

function setup(t) {
  const root = makeProject();
  const target = tempDir('sia-sync-');
  t.after(() => {
    cleanup(root);
    cleanup(target);
  });
  const coreDir = path.join(root, '.sia-core');
  const { config } = loadConfig(path.join(coreDir, 'core-config.yaml'));
  const sync = (ides, apply = true) => runSync({ root, coreDir, config, target, ides, apply });
  return { root, target, sync };
}

function changes(result) {
  return result.plans.flatMap((plan) => managed.planDifferences(plan));
}

for (const ide of IDES) {
  test(`sync ${ide}: gera, é idempotente e o --check fica limpo`, (t) => {
    const { root, target, sync } = setup(t);
    const first = sync([ide]);
    const counts = managed.summarize(first.plans[0]);
    assert.ok(counts.create > 0, JSON.stringify(counts));
    assert.equal(counts.conflict, 0);
    const second = sync([ide]);
    assert.deepEqual(changes(second), [], JSON.stringify(changes(second)));
    assert.deepEqual(changes(sync([ide], false)), []);
    const cli = runCli(['sync', '--ide', ide, '--check', '--target', target, '--json'], { cwd: root });
    assert.equal(cli.code, 0, cli.stdout);
    assert.equal(cli.json.ok, true);
    const manifestPath = path.join(target, first.plans[0].dir, managed.MANIFEST_FILE);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.equal(manifest.schemaVersion, 1);
    assert.equal(manifest.generatedBy, 'sia sync');
    assert.ok(manifest.files.every((entry) => typeof entry.path === 'string' && /^[0-9a-f]{64}$/.test(entry.sha256)));
  });
}

test('sync --check antes de sincronizar acusa ausência; --link-core cria o link', (t) => {
  const { root, target } = setup(t);
  const before = runCli(['sync', '--check', '--target', target], { cwd: root });
  assert.equal(before.code, 1);
  assert.match(before.stdout, /ausente/);
  const run = runCli(['sync', '--target', target, '--link-core'], { cwd: root });
  assert.equal(run.code, 0, run.stderr);
  assert.ok(fs.lstatSync(path.join(target, '.sia-core')).isSymbolicLink());
  assert.equal(runCli(['sync', '--check', '--target', target], { cwd: root }).code, 0);
  assert.equal(runCli(['sync', '--link-core'], { cwd: root }).code, 2);
  assert.equal(runCli(['sync', '--ide', 'vscode', '--target', target], { cwd: root }).code, 2);
});

test('sync Claude Code: conteúdo das skills, subagentes, regras e CLAUDE.md', (t) => {
  const { root, target, sync } = setup(t);
  sync(['claude-code']);
  const skill = read(target, '.claude/skills/sia-pm/SKILL.md');
  const fm = yaml.parseFrontmatter(skill).data;
  assert.equal(fm.name, 'sia-pm');
  assert.equal(fm['user-invocable'], true);
  assert.ok(fm.description.startsWith('Ativa Mira (@pm), Product Manager. Use para stories'));
  assert.ok(fm.description.length <= 240);
  assert.match(skill, /^description: "/m);
  assert.match(skill, /\.sia-core\/agents\/pm\.md` POR INTEIRO/);
  assert.match(skill, /\$ARGUMENTS/);

  const shim = read(target, '.claude/commands/SIA/agents/dev.md');
  assert.match(shim, /^description: "/m);
  assert.match(shim, /skill `sia-dev`/);

  const validatorSkill = yaml.parseFrontmatter(read(target, '.claude/skills/revisar-feature/SKILL.md')).data;
  assert.equal(validatorSkill['disable-model-invocation'], true);
  assert.equal(validatorSkill['argument-hint'], '[storyId|epic-*|caminho]');
  assert.match(read(target, '.claude/skills/gaps/SKILL.md'), /\.sia-core\/tasks\/inspect\.md/);

  const subagent = read(target, '.claude/agents/sia-validator.md');
  const subFm = yaml.parseFrontmatter(subagent).data;
  assert.equal(subFm.model, 'inherit');
  assert.equal(subFm.tools, 'Read, Grep, Glob, Bash, Write');
  assert.match(subagent, /\| Inspeção completa da entrega recente \| `\*revisar-feature/);
  assert.equal(yaml.parseFrontmatter(read(target, '.claude/agents/sia-dev.md')).data.tools, 'Read, Grep, Glob, Write, Edit, Bash');

  assert.equal(read(target, '.claude/rules/sia-agent-authority.md'), read(root, '.sia-core/rules/agent-authority.md'), 'regra copiada sem alteração');
  assert.match(read(target, '.claude/rules/sia-agent-authority.md'), /^---\ndescription: Autoridade/);
  assert.equal(read(target, '.claude/skills/sia-develop-story/SKILL.md').includes('**Task fonte da verdade:**'), true);

  const claude = read(target, 'CLAUDE.md');
  assert.ok(claude.split('\n').length <= 150, `CLAUDE.md com ${claude.split('\n').length} linhas`);
  for (const id of ['pm', 'dev', 'devops', 'validator', 'squad-creator']) assert.match(claude, new RegExp(`/SIA:agents:${id}`));
  assert.match(claude, /\| II \| Autoridade dos Agentes \| INEGOCIÁVEL \|/);
  assert.match(claude, /no máximo 2 iterações/);
});

test('sync: blocos gerenciados preservam o conteúdo do usuário', (t) => {
  const { target, sync } = setup(t);
  write(
    target,
    'CLAUDE.md',
    [
      '# Meu projeto',
      '',
      'Notas do time.',
      '',
      '<!-- SIA-MANAGED-START: sia-intro -->',
      'texto antigo',
      '<!-- SIA-MANAGED-END: sia-intro -->',
      '',
      '<!-- SIA-MANAGED-START: sia-obsoleto -->',
      'bloco que saiu da geração',
      '<!-- SIA-MANAGED-END: sia-obsoleto -->',
      '',
      '## Rodapé do usuário',
      '',
    ].join('\n'),
  );
  sync(['claude-code']);
  const text = read(target, 'CLAUDE.md');
  assert.ok(text.startsWith('# Meu projeto\n\nNotas do time.\n\n<!-- SIA-MANAGED-START: sia-intro -->'));
  assert.ok(!text.includes('texto antigo'));
  assert.ok(!text.includes('sia-obsoleto'));
  assert.match(text, /## Rodapé do usuário/);
  assert.ok(text.indexOf('## Rodapé do usuário') < text.indexOf('SIA-MANAGED-START: sia-constitution'));
  assert.match(text, /SIA-MANAGED-START: sia-boundary/);
  assert.ok(!/\n{3,}/.test(text), 'sem linhas em branco acumuladas');
  sync(['claude-code']);
  assert.equal(read(target, 'CLAUDE.md'), text);
});

test('mergeBlocks: idempotente, mantém posição e acrescenta no fim', () => {
  const blocks = [
    { id: 'a', content: 'A' },
    { id: 'b', content: 'B' },
  ];
  const first = managed.mergeBlocks('topo\n', blocks);
  assert.equal(first, 'topo\n\n<!-- SIA-MANAGED-START: a -->\nA\n<!-- SIA-MANAGED-END: a -->\n\n<!-- SIA-MANAGED-START: b -->\nB\n<!-- SIA-MANAGED-END: b -->\n');
  assert.equal(managed.mergeBlocks(first, blocks), first);
  const moved = managed.mergeBlocks(first.replace('topo', 'topo alterado'), [{ id: 'b', content: 'B2' }]);
  assert.ok(moved.startsWith('topo alterado\n\n<!-- SIA-MANAGED-START: b -->\nB2'));
  assert.ok(!moved.includes('SIA-MANAGED-START: a'));
  assert.equal(managed.mergeBlocks(null, [{ id: 'x', content: 'X' }]), '<!-- SIA-MANAGED-START: x -->\nX\n<!-- SIA-MANAGED-END: x -->\n');
});

test('sync: settings.json preserva o que não é do SIA e é idempotente', (t) => {
  const { target, sync } = setup(t);
  write(
    target,
    '.claude/settings.json',
    JSON.stringify({
      language: 'portuguese',
      hooks: {
        PreToolUse: [{ matcher: 'Write', hooks: [{ type: 'command', command: 'echo usuario' }] }],
        Stop: [{ hooks: [{ type: 'command', command: 'node .sia-core/hooks/antigo.cjs' }] }],
      },
      permissions: { deny: ['Read(secrets/**)', 'Edit(.sia-core/antigo/**)'], ask: ['Bash(rm:*)'] },
    }),
  );
  sync(['claude-code']);
  const settings = JSON.parse(read(target, '.claude/settings.json'));
  assert.equal(settings.language, 'portuguese');
  assert.equal(settings.hooks.Stop, undefined);
  assert.deepEqual(settings.hooks.PreToolUse[0], { matcher: 'Write', hooks: [{ type: 'command', command: 'echo usuario' }] });
  assert.deepEqual(settings.hooks.PreToolUse[1], {
    matcher: 'Bash',
    hooks: [{ type: 'command', command: 'node .sia-core/hooks/enforce-git-push-authority.cjs', timeout: 10 }],
  });
  assert.equal(settings.hooks.UserPromptSubmit[0].hooks[0].command, 'node .sia-core/hooks/track-active-agent.cjs');
  assert.deepEqual(settings.permissions.ask, ['Bash(rm:*)']);
  assert.ok(settings.permissions.deny.includes('Read(secrets/**)'));
  assert.ok(!settings.permissions.deny.includes('Edit(.sia-core/antigo/**)'));
  assert.ok(settings.permissions.deny.includes('Edit(.sia-core/constitution.md)'));
  assert.ok(settings.permissions.deny.includes('Edit(.sia-core/tasks/**)'));
  assert.ok(!settings.permissions.deny.some((rule) => rule.startsWith('Write(')), 'Claude Code só aplica regras Edit(...)');
  assert.ok(settings.permissions.deny.includes('Edit(.sia-core/data/workflow-chains.yaml)'), 'diretório protegido expandido por causa da exceção');
  assert.ok(!settings.permissions.deny.includes('Edit(.sia-core/data/**)'));
  assert.ok(!settings.permissions.deny.includes('Edit(.sia-core/data/technical-preferences.md)'));
  assert.ok(settings.permissions.allow.includes('Edit(.sia-core/data/technical-preferences.md)'));
  const before = read(target, '.claude/settings.json');
  sync(['claude-code']);
  assert.equal(read(target, '.claude/settings.json'), before);
});

test('sync: órfão do manifesto é removido e pasta vazia é podada', (t) => {
  const { target, sync } = setup(t);
  sync(['claude-code']);
  write(target, '.claude/skills/sia-velho/SKILL.md', 'antigo');
  const manifestPath = path.join(target, '.claude', managed.MANIFEST_FILE);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.files.push({ path: 'skills/sia-velho/SKILL.md', sha256: 'x'.repeat(64) });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  const check = sync(['claude-code'], false);
  assert.ok(changes(check).some((diff) => diff.category === 'stale' && diff.path === '.claude/skills/sia-velho/SKILL.md'));
  sync(['claude-code']);
  assert.equal(fs.existsSync(path.join(target, '.claude/skills/sia-velho')), false);
  assert.equal(fs.existsSync(path.join(target, '.claude/skills')), true);
});

test('sync: arquivo não gerenciado nunca é tocado (conflito)', (t) => {
  const { root, target, sync } = setup(t);
  write(target, '.claude/skills/revisar-feature/SKILL.md', 'skill do usuário\n');
  write(target, '.claude/skills/minha-skill/SKILL.md', 'outra do usuário\n');
  const result = sync(['claude-code']);
  assert.ok(result.plans[0].actions.some((a) => a.action === 'conflict' && a.path === '.claude/skills/revisar-feature/SKILL.md'));
  assert.equal(read(target, '.claude/skills/revisar-feature/SKILL.md'), 'skill do usuário\n');
  assert.equal(read(target, '.claude/skills/minha-skill/SKILL.md'), 'outra do usuário\n');
  const manifest = JSON.parse(read(target, `.claude/${managed.MANIFEST_FILE}`));
  assert.ok(!manifest.files.some((entry) => entry.path === 'skills/revisar-feature/SKILL.md'));
  const check = runCli(['sync', '--ide', 'claude-code', '--check', '--target', target], { cwd: root });
  assert.equal(check.code, 1);
  assert.match(check.stdout, /conflito/);
});

test('sync Codex: skills em .agents/skills, AGENTS.md com regras e hooks.json', (t) => {
  const { target, sync } = setup(t);
  sync(['codex']);
  const fm = yaml.parseFrontmatter(read(target, '.agents/skills/sia-devops/SKILL.md')).data;
  assert.equal(fm.name, 'sia-devops');
  assert.ok(fm.name.length <= 64);
  assert.ok(fm.description.startsWith('Ativa Lance (@devops), DevOps.'));
  assert.ok(fm.metadata['short-description']);
  assert.ok(fs.existsSync(path.join(target, '.agents/skills/gaps/SKILL.md')));
  assert.ok(fs.existsSync(path.join(target, '.agents/skills/sia-develop-story/SKILL.md')));
  const agentsMd = read(target, 'AGENTS.md');
  assert.match(agentsMd, /SIA-MANAGED-START: sia-rules/);
  assert.match(agentsMd, /### Autoridade dos agentes/);
  assert.match(agentsMd, /#### Push/);
  // Regras sem `embed: full` entram só como resumo, para caber no limite de 32 KiB do Codex.
  assert.match(agentsMd, /### Outras regras/);
  assert.match(agentsMd, /- \*\*Uso de ferramentas\*\* \(`\.sia-core\/rules\/tool-usage\.md`\): Prioridade de ferramentas/);
  assert.doesNotMatch(agentsMd, /Prefira ferramentas nativas\./);
  assert.match(agentsMd, /`@lance`/);
  assert.match(agentsMd, /`\.sia-core\/agents\/devops\.md`/);
  const hooks = JSON.parse(read(target, '.codex/hooks.json'));
  assert.equal(hooks.hooks.PreToolUse[0].hooks[0].command, 'node .sia-core/hooks/enforce-git-push-authority.cjs');
  assert.equal(hooks.hooks.UserPromptSubmit[0].hooks[0].command, 'node .sia-core/hooks/track-active-agent.cjs');
});

test('sync Gemini: comandos TOML com {{args}}, menu, GEMINI.md e hooks', (t) => {
  const { target, sync } = setup(t);
  sync(['gemini']);
  const pm = read(target, '.gemini/commands/sia-pm.toml');
  assert.match(pm, /^description = "Ativa Mira/m);
  assert.match(pm, /prompt = """\n[\s\S]*\{\{args\}\}[\s\S]*"""\n$/);
  assert.match(read(target, '.gemini/commands/sia-menu.toml'), /\/sia-squad-creator/);
  assert.match(read(target, '.gemini/commands/revisar-feature.toml'), /\*revisar-feature \{\{args\}\}/);
  assert.match(read(target, '.gemini/commands/sia-develop-story.toml'), /\.sia-core\/skills\/sia-develop-story\/SKILL\.md/);
  assert.match(read(target, 'GEMINI.md'), /SIA-MANAGED-START: sia-shortcuts/);
  const settings = JSON.parse(read(target, '.gemini/settings.json'));
  assert.equal(settings.hooks.BeforeTool[0].matcher, '^run_shell_command$');
  assert.equal(settings.hooks.BeforeTool[0].hooks[0].timeout, 10000);
  assert.equal(settings.hooks.BeforeAgent[0].hooks[0].name, 'sia-track-active-agent');
});

test('sync Grok: skills, agentes, hooks com o mesmo comando do Claude e regras', (t) => {
  const { target, sync } = setup(t);
  sync(['grok', 'claude-code']);
  const fm = yaml.parseFrontmatter(read(target, '.grok/skills/sia-validator/SKILL.md')).data;
  assert.equal(fm['user-invocable'], true);
  assert.equal(fm.metadata['sia-agent-id'], 'validator');
  assert.equal(fm.metadata['sia-source'], '.sia-core/agents/validator.md');
  assert.ok(fm['when-to-use']);
  const agent = yaml.parseFrontmatter(read(target, '.grok/agents/sia-pm.md')).data;
  assert.deepEqual(
    { prompt_mode: agent.prompt_mode, model: agent.model, permission_mode: agent.permission_mode, agents_md: agent.agents_md },
    { prompt_mode: 'full', model: 'inherit', permission_mode: 'default', agents_md: true },
  );
  const push = JSON.parse(read(target, '.grok/hooks/sia-git-push-authority.json'));
  const track = JSON.parse(read(target, '.grok/hooks/sia-track-agent.json'));
  const claude = JSON.parse(read(target, '.claude/settings.json'));
  assert.equal(push.hooks.PreToolUse[0].matcher, 'Bash|run_terminal_command');
  assert.equal(push.hooks.PreToolUse[0].hooks[0].command, claude.hooks.PreToolUse[0].hooks[0].command);
  assert.equal(track.hooks.UserPromptSubmit[0].hooks[0].command, claude.hooks.UserPromptSubmit[0].hooks[0].command);
  assert.match(read(target, '.grok/rules/sia-core.md'), /SIA-MANAGED-START: sia-agents/);
  assert.equal(fs.existsSync(path.join(target, '.grok/config.toml')), false);
});

test('sync nunca apaga nem sobrescreve configuração de MCP', (t) => {
  const { target, sync } = setup(t);
  const mcpJson = '{\n  "mcpServers": { "supabase": { "type": "http", "url": "https://mcp.supabase.com/mcp" } }\n}\n';
  const tomlBlock = '# >>> SIA MCP: supabase\n[mcp_servers.supabase]\nurl = "https://mcp.supabase.com/mcp"\n# <<< SIA MCP: supabase\n';
  write(target, '.mcp.json', mcpJson);
  write(target, '.codex/config.toml', `model = "gpt"\n\n${tomlBlock}`);
  write(target, '.grok/config.toml', tomlBlock);
  write(target, '.gemini/settings.json', JSON.stringify({ mcpServers: { supabase: { httpUrl: 'https://mcp.supabase.com/mcp' } }, theme: 'x' }));
  sync(IDES);
  sync(IDES);
  assert.equal(read(target, '.mcp.json'), mcpJson);
  assert.equal(read(target, '.codex/config.toml'), `model = "gpt"\n\n${tomlBlock}`);
  assert.equal(read(target, '.grok/config.toml'), tomlBlock);
  const gemini = JSON.parse(read(target, '.gemini/settings.json'));
  assert.deepEqual(gemini.mcpServers, { supabase: { httpUrl: 'https://mcp.supabase.com/mcp' } });
  assert.equal(gemini.theme, 'x');
  assert.ok(gemini.hooks.BeforeTool, 'hooks mesclados por chave');
  for (const dir of ['.claude', '.agents', '.gemini', '.grok']) {
    const manifest = JSON.parse(read(target, `${dir}/${managed.MANIFEST_FILE}`));
    const paths = manifest.files.map((entry) => entry.path);
    for (const forbidden of ['settings.json', 'config.toml', 'hooks.json', '../.mcp.json', 'rules/sia-core.md']) {
      assert.ok(!paths.includes(forbidden), `${dir}: ${forbidden} não pode estar no manifesto`);
    }
  }
});
