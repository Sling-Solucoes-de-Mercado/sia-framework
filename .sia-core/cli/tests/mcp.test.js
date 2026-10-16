'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { makeProject, cleanup, runCli, write, read } = require('./_helpers');
const mcp = require('../lib/mcp');
const { SiaError } = require('../lib/errors');

const CONFIG = {
  integrations: {
    supabase: { projectRef: 'abc123', mcp: { readOnly: true } },
    vercel: { team: '', project: 'site', flag: false },
  },
};

test('mcp: URL com params resolvidos do core-config (vazios omitidos, booleanos como texto)', () => {
  const server = {
    url: 'https://mcp.supabase.com/mcp',
    params: {
      project_ref: '{{integrations.supabase.projectRef}}',
      read_only: '{{integrations.supabase.mcp.readOnly}}',
      features: '',
      team: '{{integrations.vercel.team}}',
      ausente: '{{integrations.nada.aqui}}',
      fixo: 'docs',
    },
  };
  assert.equal(mcp.buildServerUrl(server, CONFIG), 'https://mcp.supabase.com/mcp?project_ref=abc123&read_only=true&fixo=docs');
  assert.equal(mcp.resolveParam('{{integrations.vercel.flag}}', CONFIG), 'false');
  assert.equal(mcp.buildServerUrl({ url: 'https://x.dev/mcp?a=1', params: { b: 'c d' } }, CONFIG), 'https://x.dev/mcp?a=1&b=c%20d');
  assert.equal(mcp.buildServerUrl({ url: 'https://x.dev/mcp' }, CONFIG), 'https://x.dev/mcp');
});

test('mcp: template da IDE com {{url}} e {{id}}; {{env.*}} fica literal', () => {
  const entry = mcp.renderEntry(
    { url: '{{url}}', name: 'srv-{{id}}', headers: { Authorization: 'Bearer {{env.TOKEN}}' }, list: ['{{id}}'], on: true },
    { url: 'https://u', id: 'supabase' },
  );
  assert.deepEqual(entry, { url: 'https://u', name: 'srv-supabase', headers: { Authorization: 'Bearer {{env.TOKEN}}' }, list: ['supabase'], on: true });
});

test('mcp JSON: grava obj[key][id] e preserva o resto', () => {
  const existing = JSON.stringify({ outro: 1, mcpServers: { github: { url: 'g' } } }, null, 4);
  const next = JSON.parse(mcp.mergeJsonConfig(existing, 'mcpServers', 'supabase', { type: 'http', url: 'u' }));
  assert.deepEqual(next, { outro: 1, mcpServers: { github: { url: 'g' }, supabase: { type: 'http', url: 'u' } } });
  const nested = JSON.parse(mcp.mergeJsonConfig(null, 'mcp.servers', 'x', { a: 1 }));
  assert.deepEqual(nested, { mcp: { servers: { x: { a: 1 } } } });
  assert.throws(() => mcp.mergeJsonConfig('{ quebrado', 'mcpServers', 'x', {}), SiaError);
  assert.equal(mcp.isConfiguredJson(JSON.stringify(next), 'mcpServers', 'supabase'), true);
  assert.equal(mcp.isConfiguredJson(JSON.stringify(next), 'mcpServers', 'vercel'), false);
});

test('mcp TOML: emissor mínimo', () => {
  assert.equal(mcp.tomlValue('a "b" \\ c\nd'), '"a \\"b\\" \\\\ c\\nd"');
  assert.equal(mcp.tomlValue(true), 'true');
  assert.equal(mcp.tomlValue(42), '42');
  assert.equal(mcp.tomlValue(['a', 1, false]), '["a", 1, false]');
  assert.equal(mcp.tomlValue({ 'X-Client': 'sia', 'chave com espaço': 1 }), '{ X-Client = "sia", "chave com espaço" = 1 }');
  assert.equal(
    mcp.tomlBlock('mcp_servers', 'supabase', { url: 'u', enabled: true, headers: { A: 'b' } }),
    '# >>> SIA MCP: supabase\n[mcp_servers.supabase]\nurl = "u"\nenabled = true\nheaders = { A = "b" }\n# <<< SIA MCP: supabase',
  );
});

test('mcp TOML: acrescenta, substitui o bloco gerenciado e preserva o usuário', () => {
  const user = '# config do usuário\nmodel = "x"\n\n[mcp_servers.github]\nurl = "g"\n';
  const first = mcp.mergeTomlConfig(user, 'mcp_servers', 'supabase', { url: 'u1' });
  assert.ok(first.startsWith(user));
  assert.match(first, /# >>> SIA MCP: supabase\n\[mcp_servers\.supabase\]\nurl = "u1"\n# <<< SIA MCP: supabase\n$/);
  assert.equal(mcp.mergeTomlConfig(first, 'mcp_servers', 'supabase', { url: 'u1' }), first);
  const second = mcp.mergeTomlConfig(first, 'mcp_servers', 'supabase', { url: 'u2' });
  assert.ok(second.startsWith(user));
  assert.ok(second.includes('url = "u2"') && !second.includes('url = "u1"'));
  assert.equal((second.match(/# >>> SIA MCP: supabase/g) || []).length, 1);
  assert.equal(mcp.isConfiguredToml(second, 'mcp_servers', 'supabase'), true);
  assert.equal(mcp.isConfiguredToml(user, 'mcp_servers', 'github'), true);
  assert.throws(() => mcp.mergeTomlConfig('[mcp_servers.supabase]\nurl = "manual"\n', 'mcp_servers', 'supabase', { url: 'u' }), /fora do bloco gerenciado/);
  assert.equal(mcp.mergeTomlConfig(null, 'mcp_servers', 'v', { url: 'x' }), '# >>> SIA MCP: v\n[mcp_servers.v]\nurl = "x"\n# <<< SIA MCP: v\n');
});

test('CLI mcp setup/status em projeto de fixture', (t) => {
  const root = makeProject();
  t.after(() => cleanup(root));
  write(root, '.mcp.json', JSON.stringify({ mcpServers: { github: { url: 'g' } } }));
  const setup = runCli(['mcp', 'setup', 'supabase', '--ide', 'claude-code,codex,gemini,cursor', '--json'], { cwd: root });
  assert.equal(setup.code, 0, setup.stdout + setup.stderr);
  assert.equal(setup.json.url, 'https://mcp.supabase.com/mcp?project_ref=abc123&read_only=true');
  assert.equal(setup.json.enabledInConfig, false);
  const byIde = Object.fromEntries(setup.json.ides.map((r) => [r.ide, r]));
  assert.equal(byIde['claude-code'].action, 'update');
  assert.equal(byIde.codex.action, 'create');
  assert.equal(byIde.codex.login, 'codex mcp login supabase');
  assert.equal(byIde.cursor.action, 'unsupported');
  const mcpJson = JSON.parse(read(root, '.mcp.json'));
  assert.deepEqual(mcpJson.mcpServers.github, { url: 'g' });
  assert.deepEqual(mcpJson.mcpServers.supabase, { type: 'http', url: 'https://mcp.supabase.com/mcp?project_ref=abc123&read_only=true' });
  const toml = read(root, '.codex/config.toml');
  assert.match(toml, /bearer_token_env_var = "SUPABASE_ACCESS_TOKEN"/);
  assert.match(toml, /http_headers = \{ X-Client = "sia" \}/);
  const gemini = JSON.parse(read(root, '.gemini/settings.json'));
  assert.equal(gemini.mcpServers.supabase.headers.Authorization, 'Bearer {{env.SUPABASE_ACCESS_TOKEN}}');
  const again = runCli(['mcp', 'setup', 'supabase', '--ide', 'codex', '--json'], { cwd: root });
  assert.equal(again.json.ides[0].action, 'unchanged');
  const human = runCli(['mcp', 'setup', 'vercel', '--ide', 'grok', '--dry-run'], { cwd: root });
  assert.equal(human.code, 0);
  assert.match(human.stdout, /integrations\.vercel\.enabled/);
  assert.equal(fs.existsSync(path.join(root, '.grok', 'config.toml')), false);

  const status = runCli(['mcp', 'status', '--json'], { cwd: root });
  assert.equal(status.code, 0);
  assert.equal(status.json.servers.supabase.ides['claude-code'].configured, true);
  assert.equal(status.json.servers.supabase.ides.grok.configured, false);
  assert.equal(status.json.servers.supabase.ides.cursor.unsupported, 'fora do escopo do SIA');

  assert.equal(runCli(['mcp', 'setup', 'nao-existe'], { cwd: root }).code, 2);
  assert.equal(runCli(['mcp', 'setup'], { cwd: root }).code, 2);
  fs.unlinkSync(path.join(root, '.sia-core', 'data', 'mcp-servers.yaml'));
  const missing = runCli(['mcp', 'setup', 'supabase'], { cwd: root });
  assert.equal(missing.code, 1);
  assert.match(missing.stderr, /mcp-servers\.yaml/);
});

test('mcp: params com lista viram texto separado por vírgula; lista vazia é omitida', () => {
  const server = { url: 'https://mcp.supabase.com/mcp', params: { features: '{{integrations.supabase.mcp.features}}', read_only: true } };
  const withList = { integrations: { supabase: { mcp: { features: ['database', 'docs', ''] } } } };
  assert.equal(mcp.buildServerUrl(server, withList), 'https://mcp.supabase.com/mcp?features=database%2Cdocs&read_only=true');
  const empty = { integrations: { supabase: { mcp: { features: [] } } } };
  assert.equal(mcp.buildServerUrl(server, empty), 'https://mcp.supabase.com/mcp?read_only=true');
});

test('mcp remove: JSON e bloco TOML gerenciado; tabela fora do bloco não é tocada', () => {
  const json = JSON.stringify({ mcpServers: { supabase: { url: 'u' }, github: { url: 'g' } }, outro: true });
  const removed = mcp.removeJsonEntry(json, 'mcpServers', 'supabase');
  assert.equal(removed.removed, true);
  assert.deepEqual(JSON.parse(removed.text), { mcpServers: { github: { url: 'g' } }, outro: true });
  assert.equal(mcp.removeJsonEntry(removed.text, 'mcpServers', 'supabase').removed, false);
  const user = 'model = "x"\n';
  const withBlock = mcp.mergeTomlConfig(user, 'mcp_servers', 'supabase', { url: 'u' });
  const toml = mcp.removeTomlBlock(withBlock, 'mcp_servers', 'supabase');
  assert.equal(toml.removed, true);
  assert.equal(toml.text, user);
  const manual = mcp.removeTomlBlock('[mcp_servers.supabase]\nurl = "manual"\n', 'mcp_servers', 'supabase');
  assert.deepEqual({ removed: manual.removed, outside: manual.outside }, { removed: false, outside: true });
});

test('CLI mcp com o mcp-servers.yaml real do .sia-core (lote B6): setup e remove', (t) => {
  const real = path.resolve(__dirname, '..', '..', 'data', 'mcp-servers.yaml');
  if (!fs.existsSync(real)) {
    t.skip('mcp-servers.yaml ainda não existe no .sia-core');
    return;
  }
  const root = makeProject();
  t.after(() => cleanup(root));
  fs.copyFileSync(real, path.join(root, '.sia-core', 'data', 'mcp-servers.yaml'));
  write(root, '.grok/config.toml', '# config do usuário\n[mcp_servers.github]\nurl = "g"\n');
  const setup = runCli(['mcp', 'setup', 'supabase', '--ide', 'claude-code,codex,gemini,grok', '--json'], { cwd: root });
  assert.equal(setup.code, 0, setup.stdout + setup.stderr);
  const url = 'https://mcp.supabase.com/mcp?project_ref=abc123&read_only=true';
  assert.equal(setup.json.url, url);
  assert.deepEqual(JSON.parse(read(root, '.mcp.json')).mcpServers.supabase, { type: 'http', url });
  assert.match(read(root, '.codex/config.toml'), new RegExp(`# >>> SIA MCP: supabase\\n\\[mcp_servers\\.supabase\\]\\nurl = "${url.replace(/[?.]/g, '\\$&')}"\\n# <<< SIA MCP: supabase`));
  assert.equal(JSON.parse(read(root, '.gemini/settings.json')).mcpServers.supabase.httpUrl, url);
  const grok = read(root, '.grok/config.toml');
  assert.ok(grok.startsWith('# config do usuário\n[mcp_servers.github]\nurl = "g"\n'));
  assert.match(grok, /\[mcp_servers\.supabase\]\nurl = "[^"]+"\nenabled = true\n# <<< SIA MCP: supabase/);
  for (const result of setup.json.ides) assert.match(result.login, /supabase/, result.ide);
  const vercel = runCli(['mcp', 'setup', 'vercel', '--ide', 'claude-code', '--json'], { cwd: root });
  assert.equal(vercel.json.url, 'https://mcp.vercel.com');

  const removed = runCli(['mcp', 'remove', 'supabase', '--ide', 'claude-code,codex,gemini,grok', '--json'], { cwd: root });
  assert.equal(removed.code, 0, removed.stdout);
  assert.deepEqual(removed.json.ides.map((r) => r.action), ['removed', 'removed', 'removed', 'removed']);
  const mcpJson = JSON.parse(read(root, '.mcp.json'));
  assert.equal(mcpJson.mcpServers.supabase, undefined);
  assert.ok(mcpJson.mcpServers.vercel, 'outros servidores ficam');
  assert.equal(read(root, '.grok/config.toml'), '# config do usuário\n[mcp_servers.github]\nurl = "g"\n');
  assert.equal(mcp.isConfiguredToml(read(root, '.codex/config.toml'), 'mcp_servers', 'supabase'), false);
  const again = runCli(['mcp', 'remove', 'supabase', '--ide', 'codex', '--json'], { cwd: root });
  assert.equal(again.json.ides[0].action, 'absent');
  assert.equal(runCli(['mcp', 'remove', 'nao-existe'], { cwd: root }).code, 2);
});
