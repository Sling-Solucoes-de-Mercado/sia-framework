'use strict';

/**
 * Story: resolução do arquivo e leitura dos formatos da seção 6.2 do guia de autoria
 * (Status, checkboxes, File List, Resultado do QA), arquivo do gate e relatórios de inspeção.
 */

const path = require('path');
const { execFileSync } = require('child_process');
const { readText, isFile, isDir, listDir, walkFiles, toPosix, mtimeMs } = require('./fsutil');
const { tryLoad, parseFrontmatter, scalarToString } = require('./yaml');
const { projectPaths } = require('./config');
const { SiaError, UsageError } = require('./errors');

const STATUSES = Object.freeze(['Draft', 'Ready', 'InProgress', 'InReview', 'Done']);
const GATE_VERDICTS = Object.freeze(['PASS', 'CONCERNS', 'FAIL', 'WAIVED']);
const APPROVED_GATES = Object.freeze(['PASS', 'CONCERNS', 'WAIVED']);
const INSPECTION_VERDICTS = Object.freeze(['aprovado', 'aprovado com ressalvas', 'reprovado']);

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripAccents(text) {
  return String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Linhas do texto com marcação de bloco de código cercado.
 * @returns {{ text: string, inFence: boolean }[]}
 */
function scanLines(text) {
  const lines = [];
  let fence = null;
  for (const line of String(text || '').split(/\r?\n/)) {
    const fenceMatch = line.match(/^\s*(```+|~~~+)/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!fence) fence = marker;
      else if (marker === fence) fence = null;
      lines.push({ text: line, inFence: true });
      continue;
    }
    lines.push({ text: line, inFence: Boolean(fence) });
  }
  return lines;
}

function headingOf(line) {
  if (line.inFence) return null;
  const match = line.text.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
  return match ? { level: match[1].length, title: match[2].trim() } : null;
}

function sameTitle(a, b) {
  const norm = (t) => stripAccents(t).toLowerCase().replace(/\s*\/\s*/g, ' / ').replace(/\s+/g, ' ').trim();
  return norm(a) === norm(b);
}

/**
 * Linhas de uma seção: do cabeçalho com `title` (em `levels`) até o próximo cabeçalho de nível ≤ ao dela.
 * @returns {{ text: string, inFence: boolean }[]|null}
 */
function sectionLines(text, title, levels = [2]) {
  const lines = scanLines(text);
  let start = -1;
  let level = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const heading = headingOf(lines[i]);
    if (heading && levels.includes(heading.level) && sameTitle(heading.title, title)) {
      start = i + 1;
      level = heading.level;
      break;
    }
  }
  if (start === -1) return null;
  const result = [];
  for (let i = start; i < lines.length; i += 1) {
    const heading = headingOf(lines[i]);
    if (heading && heading.level <= level) break;
    result.push(lines[i]);
  }
  return result;
}

/** Normaliza um valor de status para o identificador canônico. */
function canonicalStatus(raw) {
  const value = String(raw || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/[*_`]/g, '')
    .trim();
  const compact = value.replace(/\s+/g, '').toLowerCase();
  const found = STATUSES.find((status) => status.toLowerCase() === compact);
  return { value, status: found || null };
}

function parseStatus(text) {
  const lines = sectionLines(text, 'Status', [2]);
  if (!lines) return { raw: null, status: null, valid: false, found: false };
  const first = lines.find((line) => !line.inFence && line.text.trim());
  if (!first) return { raw: '', status: null, valid: false, found: true };
  const canonical = canonicalStatus(first.text);
  return { raw: canonical.value, status: canonical.status, valid: Boolean(canonical.status), found: true };
}

const CHECKBOX_RE = /^\s*[-*+]\s+\[([ xX])\]/;

function countCheckboxes(lines) {
  let total = 0;
  let done = 0;
  for (const line of lines) {
    if (line.inFence) continue;
    const match = line.text.match(CHECKBOX_RE);
    if (!match) continue;
    total += 1;
    if (match[1].toLowerCase() === 'x') done += 1;
  }
  return { total, done, open: total - done };
}

function parseTasks(text) {
  const lines = sectionLines(text, 'Tasks / Subtasks', [2]);
  if (lines) return { ...countCheckboxes(lines), section: true };
  return { ...countCheckboxes(scanLines(text)), section: false };
}

const PATH_TOKEN_RE = /([\w@~.-]+\/[\w@.~/-]*[\w-]|[\w@-][\w@.-]*\.[A-Za-z0-9]{1,10})/;

function parseFileList(text) {
  const lines = sectionLines(text, 'File List', [2, 3, 4]);
  if (!lines) return { found: false, files: [] };
  const files = [];
  for (const line of lines) {
    if (line.inFence) continue;
    let candidate = null;
    const bullet = line.text.match(/^\s*[-*+]\s+(?:\[[ xX]\]\s+)?(.+)$/);
    if (bullet) candidate = bullet[1];
    const row = line.text.match(/^\s*\|([^|]+)\|/);
    if (!candidate && row && !/^\s*:?-{2,}/.test(row[1])) candidate = row[1];
    if (!candidate) continue;
    const cleaned = candidate.replace(/[`*]/g, ' ').trim();
    const token = cleaned.match(PATH_TOKEN_RE);
    if (token && !/^(arquivo|file|caminho|path)$/i.test(cleaned)) files.push(token[1]);
  }
  return { found: true, files: [...new Set(files)] };
}

const QA_FIELD_KEYS = {
  gate: 'gate',
  revisor: 'reviewer',
  revisao: 'revision',
  data: 'date',
  'arquivo do gate': 'gateFile',
  inspecao: 'inspection',
  resumo: 'summary',
  'follow-up': 'followUp',
};

function cleanValue(value) {
  return String(value || '')
    .trim()
    .replace(/^[`'"]+|[`'"]+$/g, '')
    .trim();
}

/** Bloco `## Resultado do QA`; a última ocorrência de cada campo vale. */
function parseQaResult(text) {
  const lines = sectionLines(text, 'Resultado do QA', [2]);
  const qa = {
    found: Boolean(lines),
    gate: null,
    gateRaw: null,
    gateValid: false,
    reviewer: null,
    revision: null,
    date: null,
    gateFile: null,
    inspection: null,
    inspectionVerdict: null,
    summary: null,
    followUp: null,
    iteration: 1,
    fields: {},
  };
  if (!lines) return qa;
  for (const line of lines) {
    if (line.inFence) continue;
    const iteration = line.text.match(/^###\s+Revis[aã]o\s*\(itera[cç][aã]o\s+(\d+)\)/i);
    if (iteration) qa.iteration = Math.max(qa.iteration, Number(iteration[1]));
    const match = line.text.match(/^\s*[-*]\s+\*\*([^*]+?):?\*\*:?\s*(.*)$/);
    if (!match) continue;
    const label = stripAccents(match[1]).toLowerCase().replace(/\s+/g, ' ').trim();
    const key = QA_FIELD_KEYS[label];
    if (!key) continue;
    const value = cleanValue(match[2]);
    qa.fields[key] = value;
  }
  const fields = qa.fields;
  if (fields.gate !== undefined) {
    qa.gateRaw = fields.gate;
    const token = (fields.gate.match(/[A-Za-z]+/) || [''])[0].toUpperCase();
    qa.gate = token || null;
    qa.gateValid = GATE_VERDICTS.includes(token);
  }
  qa.reviewer = fields.reviewer || null;
  qa.revision = fields.revision ? fields.revision.split(/\s+/)[0] : null;
  qa.date = fields.date || null;
  qa.gateFile = fields.gateFile ? fields.gateFile.split(/\s+/)[0] : null;
  if (fields.inspection) {
    qa.inspection = fields.inspection.split(/\s+/)[0];
    const verdict = fields.inspection.match(/\(([^)]+)\)/);
    qa.inspectionVerdict = verdict ? verdict[1].trim().toLowerCase() : null;
  }
  qa.summary = fields.summary || null;
  qa.followUp = fields.followUp || null;
  return qa;
}

const EXECUTOR_FIELD_KEYS = {
  executor: 'executor',
  'gate de qualidade': 'gate',
  inspecao: 'inspection',
  complexidade: 'complexity',
};

/**
 * Seção `## Executor` (guia de autoria, seção 6): `- Executor: @dev [Desenvolvimento]`.
 * Sem seção ou sem agente, o executor padrão é o @dev.
 */
function parseExecutor(text) {
  const lines = sectionLines(text, 'Executor', [2]);
  const result = { found: Boolean(lines), declared: false, agent: 'dev', hat: null, raw: null, gate: null, inspection: null, complexity: null };
  if (!lines) return result;
  for (const line of lines) {
    if (line.inFence) continue;
    const match = line.text.match(/^\s*[-*]\s+(?:\*\*)?([^:*]+?)(?:\*\*)?:(?:\*\*)?\s*(.*)$/);
    if (!match) continue;
    const key = EXECUTOR_FIELD_KEYS[stripAccents(match[1]).toLowerCase().replace(/\s+/g, ' ').trim()];
    if (!key) continue;
    const value = cleanValue(match[2]);
    if (key === 'executor') {
      result.raw = value;
      const agent = value.match(/@([a-z][a-z0-9-]*)/i);
      if (agent) {
        result.agent = agent[1].toLowerCase();
        result.declared = true;
      }
      const hat = value.match(/\[([^\]]+)\]/);
      result.hat = hat ? hat[1].trim() : null;
    } else {
      result[key] = value;
    }
  }
  return result;
}

/** Story de pesquisa: executor @pm (chapéu Análise); não passa por inspeção. */
function isResearchStory(executor) {
  return Boolean(executor) && executor.agent === 'pm';
}

/** Comando de execução do executor declarado. */
function executionCommand(executor) {
  if (isResearchStory(executor)) return { agent: '@pm', command: 'execute-research-story', hat: 'analyst' };
  if (executor && executor.agent === 'devops') return { agent: '@devops', command: 'develop', hat: null };
  return { agent: '@dev', command: 'develop', hat: 'dev' };
}

/** Comando de correção depois de gate FAIL ou inspeção reprovada. */
function fixCommand(executor) {
  if (isResearchStory(executor) || (executor && executor.agent === 'devops')) return executionCommand(executor);
  return { agent: '@dev', command: 'apply-qa-fixes', hat: 'dev' };
}

/**
 * Lê uma story.
 * @param {string} text
 */
function parseStory(text) {
  const titleMatch = String(text || '').match(/^#\s+Story\s+([^\s:]+)\s*:?\s*(.*)$/m);
  const status = parseStatus(text);
  return {
    storyId: titleMatch ? titleMatch[1].trim() : null,
    title: titleMatch ? titleMatch[2].trim() : null,
    status: status.status,
    statusRaw: status.raw,
    statusValid: status.valid,
    statusFound: status.found,
    tasks: parseTasks(text),
    fileList: parseFileList(text),
    qa: parseQaResult(text),
    executor: parseExecutor(text),
  };
}

function looksLikePath(ref) {
  return /[\\/]/.test(ref) || /\.md$/i.test(ref);
}

/**
 * Procura docs/stories/{id}-*.story.md ou {id}.story.md (recursivo).
 * @returns {string[]} caminhos absolutos
 */
function findStoryFiles(root, config, storyId) {
  const storiesDir = path.resolve(root, projectPaths(config).stories);
  if (!isDir(storiesDir)) return [];
  const id = escapeRegExp(storyId);
  const pattern = new RegExp(`^${id}(?:-.*)?\\.story\\.md$`, 'i');
  return walkFiles(storiesDir, { maxDepth: 4, filter: (rel) => pattern.test(path.posix.basename(rel)) })
    .map((rel) => path.join(storiesDir, rel));
}

/**
 * Resolve uma story por id ou caminho.
 * @returns {{ path: string, relPath: string, storyId: string, text: string, story: object }}
 */
function loadStory(root, config, ref) {
  if (!ref || !String(ref).trim()) throw new UsageError('Informe o storyId (ex.: 1.3) ou o caminho da story.');
  const value = String(ref).trim();
  let file = null;
  if (looksLikePath(value)) {
    const candidate = path.resolve(root, value);
    if (!isFile(candidate)) throw new SiaError(`Story não encontrada: ${value}`, { code: 'STORY_NOT_FOUND' });
    file = candidate;
  } else {
    const matches = findStoryFiles(root, config, value);
    if (matches.length === 0) {
      const dir = projectPaths(config).stories;
      throw new SiaError(`Story ${value} não encontrada em ${dir}/ (procurei ${value}-*.story.md e ${value}.story.md).`, {
        code: 'STORY_NOT_FOUND',
      });
    }
    if (matches.length > 1) {
      throw new SiaError(
        `Mais de uma story com id ${value}: ${matches.map((m) => toPosix(path.relative(root, m))).join(', ')}. Informe o caminho.`,
        { code: 'STORY_AMBIGUOUS' },
      );
    }
    file = matches[0];
  }
  const text = readText(file);
  const story = parseStory(text);
  const fromName = path.basename(file).match(/^([^-]+?)(?:-.*)?\.story\.md$/i);
  const storyId = story.storyId || (fromName ? fromName[1] : looksLikePath(value) ? path.basename(file, '.md') : value);
  return { path: file, relPath: toPosix(path.relative(root, file)), storyId, text, story };
}

function asBool(value) {
  return value === true || (typeof value === 'string' && value.trim().toLowerCase() === 'true');
}

function rawYamlField(text, key) {
  const match = String(text || '').match(new RegExp(`^${escapeRegExp(key)}:\\s*['"]?([^'"\\n#]*?)['"]?\\s*(?:#.*)?$`, 'm'));
  return match ? match[1].trim() : null;
}

/**
 * Lê o arquivo do gate: o citado no Resultado do QA ou docs/qa/gates/{id}-*.yml com story == id.
 * @returns {{ path: string, relPath: string, referenced: boolean, exists: boolean, error: string|null, gate: string|null, story: string|null, reviewer: string|null, reviewedRevision: string|null, waiver: { active: boolean, reason: string, approvedBy: string } }|null}
 */
function loadGateFile(root, config, storyId, qa) {
  let file = null;
  let referenced = false;
  if (qa && qa.gateFile) {
    file = path.resolve(root, qa.gateFile);
    referenced = true;
  } else {
    const gatesDir = path.resolve(root, projectPaths(config).qaGates);
    const id = escapeRegExp(storyId);
    const pattern = new RegExp(`^${id}(?:-.*)?\\.ya?ml$`, 'i');
    const candidates = listDir(gatesDir)
      .filter((name) => pattern.test(name))
      .map((name) => path.join(gatesDir, name))
      .filter((candidate) => rawYamlField(readText(candidate), 'story') === String(storyId));
    if (candidates.length === 0) return null;
    file = candidates[candidates.length - 1];
  }
  const relPath = toPosix(path.relative(root, file));
  const text = readText(file);
  const empty = { active: false, reason: '', approvedBy: '' };
  if (text === null) {
    return { path: file, relPath, referenced, exists: false, error: null, gate: null, story: null, reviewer: null, reviewedRevision: null, waiver: empty };
  }
  const parsed = tryLoad(text, { failsafe: true });
  if (parsed.error || !parsed.data || typeof parsed.data !== 'object') {
    return {
      path: file, relPath, referenced, exists: true, error: parsed.error || 'o arquivo do gate não é um objeto YAML',
      gate: null, story: null, reviewer: null, reviewedRevision: null, waiver: empty,
    };
  }
  const data = parsed.data;
  const waiver = data.waiver && typeof data.waiver === 'object' ? data.waiver : {};
  return {
    path: file,
    relPath,
    referenced,
    exists: true,
    error: null,
    gate: data.gate ? String(data.gate).trim().toUpperCase() : null,
    story: rawYamlField(text, 'story'),
    reviewer: data.reviewer ? String(data.reviewer) : null,
    reviewedRevision: data.reviewed_revision ? String(data.reviewed_revision) : null,
    waiver: {
      active: asBool(waiver.active),
      reason: waiver.reason ? String(waiver.reason).trim() : '',
      approvedBy: waiver.approved_by ? String(waiver.approved_by).trim() : '',
    },
  };
}

function filenameTime(name) {
  const match = String(name).match(/^(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})/);
  if (!match) return null;
  const time = Date.parse(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:00`);
  return Number.isNaN(time) ? null : time;
}

/**
 * Relatórios de inspeção com frontmatter story == storyId, do mais antigo ao mais recente.
 */
function listInspections(root, config, storyId) {
  const dir = path.resolve(root, projectPaths(config).inspections);
  const reports = [];
  for (const name of listDir(dir)) {
    if (!name.endsWith('.md')) continue;
    const file = path.join(dir, name);
    const text = readText(file);
    if (text === null) continue;
    const fm = parseFrontmatter(text, { failsafe: true });
    if (!fm.hasFrontmatter || !fm.data) continue;
    const story = rawYamlField(fm.raw, 'story') || scalarToString(fm.data.story);
    if (String(story).trim() !== String(storyId)) continue;
    const verdict = scalarToString(fm.data.verdict).trim().toLowerCase();
    const date = scalarToString(fm.data.date).trim();
    const parsedDate = Date.parse(date);
    const time = Number.isNaN(parsedDate) ? filenameTime(name) || mtimeMs(file) || 0 : parsedDate;
    reports.push({
      path: file,
      relPath: toPosix(path.relative(root, file)),
      name,
      command: scalarToString(fm.data.command).trim() || null,
      story: String(story).trim(),
      verdict: verdict || null,
      verdictValid: INSPECTION_VERDICTS.includes(verdict),
      date: date || null,
      time,
      revision: scalarToString(fm.data.revision).trim() || null,
    });
  }
  return reports.sort((a, b) => a.time - b.time || a.name.localeCompare(b.name));
}

function latestInspection(root, config, storyId) {
  const reports = listInspections(root, config, storyId);
  return reports.length > 0 ? reports[reports.length - 1] : null;
}

/** Hash curto do HEAD ou null (sem git ou sem commits). */
function gitHead(root) {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
    }).trim() || null;
  } catch {
    return null;
  }
}

/** Mesma revisão quando um hash é prefixo do outro. */
function sameRevision(a, b) {
  if (!a || !b) return false;
  const x = String(a).trim().toLowerCase();
  const y = String(b).trim().toLowerCase();
  return x.startsWith(y) || y.startsWith(x);
}

/**
 * A inspeção cobre a revisão atual?
 * Não cobre quando o HEAD mudou depois dela ou quando ela é a mesma usada num gate FAIL.
 */
function inspectionIsCurrent(inspection, context = {}) {
  if (!inspection || !inspection.verdictValid) return false;
  if (context.head && inspection.revision && !sameRevision(context.head, inspection.revision)) return false;
  const qa = context.qa;
  if (qa && qa.gate === 'FAIL' && qa.revision && inspection.revision && sameRevision(qa.revision, inspection.revision)) {
    return false;
  }
  return true;
}

/**
 * Próximo comando sugerido pelo status da story.
 * @returns {{ agent: string, command: string, reason: string }[]}
 */
function nextSteps(storyId, story, context = {}) {
  const id = storyId;
  const executor = story.executor || { agent: 'dev' };
  const run = executionCommand(executor);
  const fix = fixCommand(executor);
  switch (story.status) {
    case 'Draft':
      return [{ agent: '@pm', command: `*validate-story ${id}`, reason: 'story em Draft: validação de 10 pontos (GO move para Ready)' }];
    case 'Ready':
      return [{ agent: run.agent, command: `*${run.command} ${id}`, reason: 'story validada: executor declarado inicia a execução' }];
    case 'InProgress':
      if (story.qa && story.qa.gate === 'FAIL') {
        return [{ agent: fix.agent, command: `*${fix.command} ${id}`, reason: 'último gate FAIL: aplicar o pedido de correção' }];
      }
      return [{ agent: run.agent, command: `*${run.command} ${id}`, reason: 'execução em andamento' }];
    case 'InReview':
      if (isResearchStory(executor)) {
        return [{ agent: '@pm', command: `*qa-gate ${id}`, reason: 'story de pesquisa: sem inspeção, direto ao QA gate' }];
      }
      if (!inspectionIsCurrent(context.inspection, context)) {
        return [{ agent: '@validator', command: `*revisar-feature ${id}`, reason: 'sem inspeção da revisão atual' }];
      }
      if (context.inspection.verdict === 'reprovado') {
        return [{ agent: fix.agent, command: `*${fix.command} ${id}`, reason: 'inspeção reprovada: corrigir antes do gate, mantendo InReview' }];
      }
      return [{ agent: '@pm', command: `*qa-gate ${id}`, reason: 'inspeção pronta: decidir o QA gate' }];
    case 'Done':
      return [
        { agent: '@devops', command: '*push', reason: 'story Done: entregar no remoto' },
        { agent: '@devops', command: `*create-pr ${id}`, reason: 'abrir o pull request' },
        { agent: '@pm', command: `*close-story ${id}`, reason: 'registro administrativo de fechamento' },
      ];
    default:
      return [];
  }
}

module.exports = {
  STATUSES,
  GATE_VERDICTS,
  APPROVED_GATES,
  INSPECTION_VERDICTS,
  scanLines,
  sectionLines,
  canonicalStatus,
  parseStory,
  parseQaResult,
  parseFileList,
  parseTasks,
  parseExecutor,
  isResearchStory,
  executionCommand,
  fixCommand,
  findStoryFiles,
  loadStory,
  loadGateFile,
  listInspections,
  latestInspection,
  gitHead,
  sameRevision,
  inspectionIsCurrent,
  nextSteps,
  asBool,
  stripAccents,
};
