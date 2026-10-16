'use strict';

/**
 * Facilitador de MCP: lê .sia-core/data/mcp-servers.yaml e grava a configuração de cada IDE.
 *
 * Contrato do arquivo de dados:
 *   servers:
 *     <id>: { name, docs, url, params: {<p>: '{{caminho.no.core-config}}'|valor}, auth: oauth|bearer-env, env: [VAR], notes }
 *   ides:
 *     <ide>: { file, format: json|toml, key, entry: {...template...}, login, unsupported?: motivo }
 *
 * Placeholders do template: {{url}} (url + query string dos params resolvidos), {{id}}.
 * {{env.NOME}} fica literal (a CLI nunca resolve nem grava segredos).
 */

const os = require('os');
const path = require('path');
const { readText } = require('./fsutil');
const { tryLoad } = require('./yaml');
const { get } = require('./config');
const { SiaError } = require('./errors');

const DATA_FILE = path.join('data', 'mcp-servers.yaml');

/** @returns {{ data: object|null, error: string|null, exists: boolean, file: string }} */
function loadMcpData(coreDir) {
  const file = path.join(coreDir, DATA_FILE);
  const text = readText(file);
  if (text === null) return { data: null, error: null, exists: false, file };
  const parsed = tryLoad(text);
  if (parsed.error) return { data: null, error: parsed.error, exists: true, file };
  const data = parsed.data;
  if (!data || typeof data !== 'object' || typeof data.servers !== 'object' || typeof data.ides !== 'object') {
    return { data: null, error: 'formato inesperado: faltam as chaves servers e ides', exists: true, file };
  }
  return { data, error: null, exists: true, file };
}

/** Exige o arquivo de dados ou lança erro claro. */
function requireMcpData(coreDir) {
  const loaded = loadMcpData(coreDir);
  if (!loaded.exists) {
    throw new SiaError(
      `Arquivo de dados não encontrado: .sia-core/${DATA_FILE.split(path.sep).join('/')}. ` +
        'Ele descreve os servidores (servers) e o formato de cada IDE (ides); sem ele o setup não sabe o que gravar.',
      { code: 'MCP_DATA_MISSING' },
    );
  }
  if (loaded.error) throw new SiaError(`.sia-core/data/mcp-servers.yaml inválido: ${loaded.error}`, { code: 'MCP_DATA_INVALID' });
  return loaded;
}

const PLACEHOLDER_ONLY = /^\{\{\s*([\w.-]+)\s*\}\}$/;

function stringifyParam(value) {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    const items = value.map(stringifyParam).filter((item) => item !== null);
    return items.length > 0 ? items.join(',') : null;
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value.trim() === '' ? null : value.trim();
  return null;
}

/** Resolve um valor de params: '{{caminho}}' lê do core-config; literais ficam como estão. */
function resolveParam(value, config) {
  if (typeof value === 'string') {
    const match = value.match(PLACEHOLDER_ONLY);
    if (match) return stringifyParam(get(config, match[1]));
    return stringifyParam(value.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (all, key) => {
      if (key.startsWith('env.')) return all;
      const resolved = stringifyParam(get(config, key));
      return resolved === null ? '' : resolved;
    }));
  }
  return stringifyParam(value);
}

/** URL do servidor com a query string dos params resolvidos (vazios são omitidos). */
function buildServerUrl(server, config) {
  const base = String(server.url || '');
  const params = server.params && typeof server.params === 'object' ? server.params : {};
  const query = [];
  for (const [key, raw] of Object.entries(params)) {
    const value = resolveParam(raw, config);
    if (value === null) continue;
    query.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  }
  if (query.length === 0) return base;
  return `${base}${base.includes('?') ? '&' : '?'}${query.join('&')}`;
}

/** Substitui {{url}} e {{id}} recursivamente; {{env.*}} e desconhecidos ficam literais. */
function renderEntry(template, vars) {
  if (typeof template === 'string') {
    return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (all, key) => (Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : all));
  }
  if (Array.isArray(template)) return template.map((item) => renderEntry(item, vars));
  if (template && typeof template === 'object') {
    const out = {};
    for (const [key, value] of Object.entries(template)) out[key] = renderEntry(value, vars);
    return out;
  }
  return template;
}

/** Caminho absoluto do arquivo de configuração da IDE (aceita ~/). */
function resolveIdeFile(root, file) {
  const value = String(file || '');
  if (value === '~' || value.startsWith('~/')) return path.join(os.homedir(), value.slice(1));
  return path.resolve(root, value);
}

function keyParts(key) {
  return String(key || '').split('.').filter(Boolean);
}

// ── JSON ──────────────────────────────────────────────────────

/**
 * Grava obj[key][id] = entry preservando o resto.
 * @param {string|null} text conteúdo atual (null se não existe)
 */
function mergeJsonConfig(text, key, id, entry) {
  let data = {};
  if (text !== null && text !== undefined && text.trim()) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new SiaError(`JSON inválido (${error.message}); corrija o arquivo antes do setup.`, { code: 'MCP_JSON_INVALID' });
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new SiaError('o arquivo JSON não é um objeto; não foi alterado.', { code: 'MCP_JSON_INVALID' });
    }
  }
  let node = data;
  for (const part of keyParts(key)) {
    if (!node[part] || typeof node[part] !== 'object' || Array.isArray(node[part])) node[part] = {};
    node = node[part];
  }
  node[id] = entry;
  return `${JSON.stringify(data, null, 2)}\n`;
}

/**
 * Remove obj[key][id] preservando o resto.
 * @returns {{ text: string|null, removed: boolean }}
 */
function removeJsonEntry(text, key, id) {
  if (text === null || text === undefined || !text.trim()) return { text, removed: false };
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new SiaError(`JSON inválido (${error.message}); corrija o arquivo antes de remover.`, { code: 'MCP_JSON_INVALID' });
  }
  let node = data;
  for (const part of keyParts(key)) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return { text, removed: false };
    node = node[part];
  }
  if (!node || typeof node !== 'object' || !Object.prototype.hasOwnProperty.call(node, id)) return { text, removed: false };
  delete node[id];
  return { text: `${JSON.stringify(data, null, 2)}\n`, removed: true };
}

function isConfiguredJson(text, key, id) {
  if (!text) return false;
  try {
    let node = JSON.parse(text);
    for (const part of keyParts(key)) {
      if (!node || typeof node !== 'object') return false;
      node = node[part];
    }
    return Boolean(node && typeof node === 'object' && Object.prototype.hasOwnProperty.call(node, id));
  } catch {
    return false;
  }
}

// ── TOML ──────────────────────────────────────────────────────

function tomlString(value) {
  return `"${String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/[\u0000-\u001f\u007f]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`)}"`;
}

function tomlKey(key) {
  return /^[A-Za-z0-9_-]+$/.test(String(key)) ? String(key) : tomlString(key);
}

/** Emissor TOML mínimo: string, bool, número, array e tabela inline. */
function tomlValue(value) {
  if (typeof value === 'string') return tomlString(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new SiaError(`número inválido para TOML: ${value}`);
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.filter((v) => v !== null && v !== undefined).map(tomlValue).join(', ')}]`;
  if (value && typeof value === 'object') {
    const pairs = Object.entries(value)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${tomlKey(k)} = ${tomlValue(v)}`);
    return pairs.length ? `{ ${pairs.join(', ')} }` : '{}';
  }
  throw new SiaError(`valor sem representação em TOML: ${String(value)}`);
}

function tomlHeader(key, id) {
  return `[${[...keyParts(key), id].map(tomlKey).join('.')}]`;
}

function tomlBlock(key, id, entry) {
  const lines = [`# >>> SIA MCP: ${id}`, tomlHeader(key, id)];
  for (const [k, v] of Object.entries(entry || {})) {
    if (v === null || v === undefined) continue;
    lines.push(`${tomlKey(k)} = ${tomlValue(v)}`);
  }
  lines.push(`# <<< SIA MCP: ${id}`);
  return lines.join('\n');
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function managedBlockRegex(id) {
  const safe = escapeRegExp(id);
  return new RegExp(`^# >>> SIA MCP: ${safe}[ \\t]*\\r?\\n[\\s\\S]*?^# <<< SIA MCP: ${safe}[ \\t]*$`, 'm');
}

function headerRegex(key, id) {
  const parts = [...keyParts(key), id].map((part) => `(?:${escapeRegExp(part)}|"${escapeRegExp(part)}"|'${escapeRegExp(part)}')`);
  return new RegExp(`^\\s*\\[\\s*${parts.join('\\s*\\.\\s*')}\\s*\\]`, 'm');
}

/**
 * Substitui (ou acrescenta) o bloco gerenciado `# >>> SIA MCP: {id}` … `# <<< SIA MCP: {id}`.
 * Falha se a tabela [{key}.{id}] já existir fora do bloco (TOML não aceita tabela duplicada).
 */
function mergeTomlConfig(text, key, id, entry) {
  const source = text === null || text === undefined ? '' : String(text);
  const block = tomlBlock(key, id, entry);
  const blockRe = managedBlockRegex(id);
  const outside = source.replace(blockRe, '');
  if (headerRegex(key, id).test(outside)) {
    throw new SiaError(
      `já existe a tabela ${tomlHeader(key, id)} fora do bloco gerenciado do SIA; remova-a ou ajuste à mão.`,
      { code: 'MCP_TOML_CONFLICT' },
    );
  }
  if (blockRe.test(source)) return source.replace(blockRe, block);
  let out = source;
  if (out && !out.endsWith('\n')) out += '\n';
  if (out.trim()) out += '\n';
  else out = '';
  return `${out}${block}\n`;
}

/**
 * Remove o bloco gerenciado do servidor. Tabelas fora do bloco nunca são tocadas.
 * @returns {{ text: string|null, removed: boolean, outside: boolean }}
 */
function removeTomlBlock(text, key, id) {
  if (text === null || text === undefined) return { text, removed: false, outside: false };
  const source = String(text);
  const blockRe = managedBlockRegex(id);
  const match = source.match(blockRe);
  if (!match) return { text: source, removed: false, outside: headerRegex(key, id).test(source) };
  const before = source.slice(0, match.index).replace(/\n+$/, '\n');
  const after = source.slice(match.index + match[0].length).replace(/^\r?\n/, '');
  let next = before.trim() ? `${before}${after.trim() ? `\n${after.replace(/^\n+/, '')}` : ''}` : after.replace(/^\n+/, '');
  if (next && !next.endsWith('\n')) next += '\n';
  return { text: next, removed: true, outside: headerRegex(key, id).test(next) };
}

function isConfiguredToml(text, key, id) {
  if (!text) return false;
  return managedBlockRegex(id).test(text) || headerRegex(key, id).test(text);
}

module.exports = {
  DATA_FILE,
  loadMcpData,
  requireMcpData,
  resolveParam,
  buildServerUrl,
  renderEntry,
  resolveIdeFile,
  mergeJsonConfig,
  removeJsonEntry,
  isConfiguredJson,
  tomlString,
  tomlKey,
  tomlValue,
  tomlBlock,
  mergeTomlConfig,
  removeTomlBlock,
  isConfiguredToml,
};
