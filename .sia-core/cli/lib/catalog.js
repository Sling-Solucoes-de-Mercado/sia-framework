'use strict';

/**
 * Catálogo do .sia-core: lista artefatos por tipo e resolve dependências {type}/{name}.
 */

const path = require('path');
const { listDir, walkFiles, isFile, isDir, readText } = require('./fsutil');
const { parseFrontmatter } = require('./yaml');

/** Existe .sia-core/{type}/{name}? Entradas terminadas em "/" são diretórios. */
function depExists(baseDir, type, name) {
  const target = path.join(baseDir, type, name);
  return String(name).endsWith('/') ? isDir(target) : isFile(target);
}

function markdownFiles(dir) {
  return listDir(dir).filter((name) => name.endsWith('.md') && !name.startsWith('_') && isFile(path.join(dir, name)));
}

function yamlFiles(dir) {
  return listDir(dir).filter((name) => /\.ya?ml$/.test(name) && isFile(path.join(dir, name)));
}

/** Regras: .sia-core/rules/*.md com frontmatter. */
function loadRules(coreDir) {
  const dir = path.join(coreDir, 'rules');
  return markdownFiles(dir).map((name) => {
    const file = path.join(dir, name);
    const raw = readText(file) || '';
    const fm = parseFrontmatter(raw);
    return {
      name: name.replace(/\.md$/, ''),
      file,
      raw,
      hasFrontmatter: fm.hasFrontmatter,
      frontmatter: fm.data,
      error: fm.error,
      body: fm.body,
    };
  });
}

/** Skills de workflow: .sia-core/skills/{nome}/SKILL.md. */
function loadSkills(coreDir) {
  const dir = path.join(coreDir, 'skills');
  return listDir(dir)
    .filter((name) => isDir(path.join(dir, name)))
    .map((name) => {
      const file = path.join(dir, name, 'SKILL.md');
      const raw = readText(file);
      const fm = raw === null ? { hasFrontmatter: false, data: null, error: null, body: '' } : parseFrontmatter(raw);
      return {
        dirName: name,
        file,
        exists: raw !== null,
        raw,
        hasFrontmatter: fm.hasFrontmatter,
        frontmatter: fm.data,
        error: fm.error,
        body: fm.body,
      };
    });
}

/** Task citada como fonte da verdade numa skill (`**Task fonte da verdade:** `...``). */
function skillSourceTasks(body) {
  const refs = [];
  const re = /\*\*Task fonte da verdade:\*\*\s*([^\n]+)/gi;
  let match;
  while ((match = re.exec(String(body || ''))) !== null) {
    const paths = match[1].match(/`([^`]+)`/g) || [];
    for (const quoted of paths) {
      const ref = quoted.slice(1, -1).trim();
      if (/\.md$/i.test(ref)) refs.push(ref);
    }
  }
  return refs;
}

module.exports = {
  depExists,
  markdownFiles,
  yamlFiles,
  walkFiles,
  loadRules,
  loadSkills,
  skillSourceTasks,
};
