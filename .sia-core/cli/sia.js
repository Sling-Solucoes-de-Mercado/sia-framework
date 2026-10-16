#!/usr/bin/env node
'use strict';

const path = require('path');

/**
 * CLI do SIA (Sling Inteligência Artificial).
 * Uso: sia {comando} [opções]  (ou node .sia-core/cli/sia.js {comando})
 * Códigos de saída: 0 ok, 1 falha de validação/verificação, 2 erro de uso.
 */

const { parseArgs } = require('util');
const { createOutput } = require('./lib/output');
const { resolveRoot } = require('./lib/root');
const { loadConfig } = require('./lib/config');
const { EXIT, SiaError, UsageError } = require('./lib/errors');

const COMMANDS = {
  doctor: require('./commands/doctor'),
  validate: require('./commands/validate'),
  sync: require('./commands/sync'),
  story: require('./commands/story'),
  sdc: require('./commands/sdc'),
  mcp: require('./commands/mcp'),
  squad: require('./commands/squad'),
  agent: require('./commands/agent'),
};

const GLOBAL_OPTIONS = Object.freeze({
  root: { type: 'string' },
  json: { type: 'boolean' },
  help: { type: 'boolean', short: 'h' },
  version: { type: 'boolean', short: 'v' },
});

function version() {
  try {
    return require('../package.json').version;
  } catch {
    return 'desconhecida';
  }
}

/** Índice do primeiro argumento posicional (o comando), pulando o valor de --root. */
function findCommandIndex(argv) {
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--') return -1;
    if (token === '--root') {
      i += 1;
      continue;
    }
    if (token.startsWith('-')) continue;
    return i;
  }
  return -1;
}

function translateParseError(error) {
  const option = (String(error.message).match(/'([^']+)'/) || [])[1];
  switch (error.code) {
    case 'ERR_PARSE_ARGS_UNKNOWN_OPTION':
      return `opção desconhecida: ${option || error.message}`;
    case 'ERR_PARSE_ARGS_INVALID_OPTION_VALUE':
      return `valor inválido ou ausente para ${option || 'a opção'}`;
    case 'ERR_PARSE_ARGS_UNEXPECTED_POSITIONAL':
      return `argumento inesperado: ${option || error.message}`;
    default:
      return `argumentos inválidos: ${error.message}`;
  }
}

function printHelp(out) {
  const { c } = out;
  out.line(`${c.bold('sia')} ${c.gray(`v${version()}`)}: CLI do SIA (Sling Inteligência Artificial)`);
  out.line('');
  out.line('Uso: sia {comando} [opções]   (ou node .sia-core/cli/sia.js {comando})');
  out.line('');
  out.line(c.bold('Comandos'));
  for (const command of Object.values(COMMANDS)) out.line(`  ${command.name.padEnd(10)} ${command.summary}`);
  out.line('');
  out.line(c.bold('Opções globais'));
  out.line('  --root {dir}  raiz do projeto (padrão: sobe a partir do cwd até achar .sia-core/core-config.yaml)');
  out.line('  --json        saída em JSON');
  out.line('  -h, --help    ajuda do comando');
  out.line('  -v, --version versão da CLI');
  out.line('');
  out.line('Códigos de saída: 0 ok, 1 falha de validação/verificação, 2 erro de uso.');
  out.line('Referência completa: docs/sia/cli.md');
}

function printCommandHelp(out, command) {
  out.line(`${out.c.bold(`sia ${command.name}`)}: ${command.summary}`);
  out.line('');
  out.line(`Uso: ${command.usage}`);
  out.line('');
  out.line('Opções globais: --root {dir}, --json, --help');
}

function handleError(error, out, command) {
  if (error instanceof SiaError) {
    if (out.json) out.printJson({ ok: false, error: { code: error.code, message: error.message } });
    else {
      out.err(`${out.c.red(out.sym.fail)} ${error.message}`);
      if (error instanceof UsageError && command) out.err(out.c.gray(`Uso: ${command.usage}`));
      else if (error instanceof UsageError) out.err(out.c.gray('Veja: sia --help'));
    }
    return error.exitCode;
  }
  const detail = process.env.SIA_DEBUG ? error.stack : error.message;
  if (out.json) out.printJson({ ok: false, error: { code: 'UNEXPECTED', message: String(error && error.message) } });
  else out.err(`${out.c.red(out.sym.fail)} Erro inesperado: ${detail}${process.env.SIA_DEBUG ? '' : ' (SIA_DEBUG=1 mostra o stack)'}`);
  return EXIT.FAILURE;
}

/**
 * Executa a CLI.
 * @param {string[]} [argv]
 * @param {{ cwd?: string, env?: NodeJS.ProcessEnv, stdout?: NodeJS.WritableStream, stderr?: NodeJS.WritableStream }} [io]
 * @returns {number} código de saída
 */
function main(argv = process.argv.slice(2), io = {}) {
  const env = io.env || process.env;
  const cwd = io.cwd || process.cwd();
  const out = createOutput({ json: argv.includes('--json'), stdout: io.stdout, stderr: io.stderr, env });
  let command = null;
  try {
    const index = findCommandIndex(argv);
    if (index === -1) {
      let values;
      try {
        ({ values } = parseArgs({ args: argv, options: GLOBAL_OPTIONS, allowPositionals: true, strict: true }));
      } catch (error) {
        throw new UsageError(translateParseError(error));
      }
      if (values.version) {
        if (out.json) out.printJson({ version: version() });
        else out.line(version());
        return EXIT.OK;
      }
      printHelp(out);
      return values.help ? EXIT.OK : EXIT.USAGE;
    }
    const name = argv[index];
    command = COMMANDS[name] || null;
    if (!command) throw new UsageError(`comando desconhecido: ${name}. Comandos: ${Object.keys(COMMANDS).join(', ')}.`);
    const rest = [...argv.slice(0, index), ...argv.slice(index + 1)];
    let parsed;
    try {
      parsed = parseArgs({ args: rest, options: { ...GLOBAL_OPTIONS, ...command.options }, allowPositionals: true, strict: true });
    } catch (error) {
      throw new UsageError(translateParseError(error));
    }
    if (parsed.values.help) {
      printCommandHelp(out, command);
      return EXIT.OK;
    }
    const ctx = {
      values: parsed.values,
      positionals: parsed.positionals,
      out,
      cwd,
      env,
      usage(message) {
        throw new UsageError(message);
      },
    };
    if (command.needsRoot) {
      // `sync --target` pode rodar de fora de um projeto SIA: a fonte é o .sia-core da própria CLI.
      const fallbackRoot = name === 'sync' && parsed.values.target ? path.resolve(__dirname, '..', '..') : null;
      ctx.root = resolveRoot({ root: parsed.values.root, cwd, fallbackRoot });
      const loaded = loadConfig(ctx.root.configPath);
      if (loaded.error) throw new SiaError(`core-config.yaml inválido: ${loaded.error}`, { code: 'CONFIG_INVALID' });
      ctx.config = loaded.config;
    }
    return command.run(ctx);
  } catch (error) {
    return handleError(error, out, command);
  }
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = { main, COMMANDS, findCommandIndex };
