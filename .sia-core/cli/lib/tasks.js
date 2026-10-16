'use strict';

/**
 * Parser de tasks (.sia-core/tasks/{id}.md): frontmatter YAML + seções fixas.
 */

const path = require('path');
const { readText } = require('./fsutil');
const { parseFrontmatter } = require('./yaml');

const TASK_AGENTS = Object.freeze(['pm', 'dev', 'devops', 'validator', 'squad-creator', 'any']);
const HATS = Object.freeze({
  pm: Object.freeze(['product', 'analyst', 'scrum', 'owner', 'quality']),
  dev: Object.freeze(['dev', 'architect', 'data', 'ux']),
});
const REQUIRED_SECTIONS = Object.freeze(['Objetivo', 'Passos', 'Saída', 'Critérios de conclusão']);
const TASK_MODES = Object.freeze(['yolo', 'interactive', 'preflight']);

/**
 * Títulos de cabeçalho de um nível, ignorando blocos de código cercados.
 * @param {string} text
 * @param {number} level 2 para "##"
 */
function headings(text, level) {
  const result = [];
  let fence = null;
  for (const line of String(text || '').split(/\r?\n/)) {
    const fenceMatch = line.match(/^\s*(```+|~~~+)/);
    if (fenceMatch) {
      if (!fence) fence = fenceMatch[1][0];
      else if (fenceMatch[1][0] === fence) fence = null;
      continue;
    }
    if (fence) continue;
    const match = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (match && match[1].length === level) result.push(match[2].trim());
  }
  return result;
}

function normalizeHeading(text) {
  return String(text || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * @param {string} file
 */
function parseTaskFile(file) {
  const id = path.basename(file, '.md');
  const raw = readText(file);
  if (raw === null) {
    return { id, file, raw: null, hasFrontmatter: false, frontmatter: null, error: 'arquivo não encontrado', body: '', sections: [] };
  }
  const fm = parseFrontmatter(raw);
  return {
    id,
    file,
    raw,
    hasFrontmatter: fm.hasFrontmatter,
    frontmatter: fm.data,
    error: fm.error,
    body: fm.body,
    sections: headings(fm.body, 2),
  };
}

/** Seções obrigatórias ausentes. */
function missingSections(task) {
  const present = new Set(task.sections.map(normalizeHeading));
  return REQUIRED_SECTIONS.filter((section) => !present.has(normalizeHeading(section)));
}

/**
 * Normaliza uma entrada de `next` para o nome do comando:
 * "validate-story", "*validate-story {storyId}" ou "@pm *validate-story".
 */
function nextCommandName(entry) {
  const text = String(entry || '').trim();
  const star = text.match(/\*([A-Za-z0-9][\w-]*)/);
  if (star) return star[1];
  const first = text.replace(/^@[\w-]+\s+/, '').split(/\s+/)[0] || '';
  return first.replace(/^[*/#]/, '');
}

module.exports = {
  TASK_AGENTS,
  HATS,
  REQUIRED_SECTIONS,
  TASK_MODES,
  headings,
  normalizeHeading,
  parseTaskFile,
  missingSections,
  nextCommandName,
};
