'use strict';

/**
 * Saída da CLI: cores ANSI (respeitam NO_COLOR e saída não-TTY), símbolos e modo JSON.
 * Em modo JSON as linhas humanas são suprimidas e só printJson escreve no stdout.
 */

const SYMBOLS = Object.freeze({ ok: '✓', warn: '⚠', fail: '✗', info: '•', arrow: '→' });

const CODES = {
  reset: '\u001b[0m',
  bold: '\u001b[1m',
  dim: '\u001b[2m',
  red: '\u001b[31m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  blue: '\u001b[34m',
  cyan: '\u001b[36m',
  gray: '\u001b[90m',
};

/**
 * Decide se a saída usa cores.
 * NO_COLOR presente e não vazio desliga; FORCE_COLOR (≠ 0) liga; senão depende de TTY.
 * @param {{ isTTY?: boolean }} stream
 * @param {NodeJS.ProcessEnv} env
 * @returns {boolean}
 */
function colorEnabled(stream, env = process.env) {
  if (env.NO_COLOR !== undefined && env.NO_COLOR !== '') return false;
  if (env.FORCE_COLOR !== undefined && env.FORCE_COLOR !== '' && env.FORCE_COLOR !== '0') return true;
  return Boolean(stream && stream.isTTY);
}

function makePainter(enabled) {
  const paint = (code) => (text) => (enabled ? `${CODES[code]}${text}${CODES.reset}` : String(text));
  return {
    bold: paint('bold'),
    dim: paint('dim'),
    red: paint('red'),
    green: paint('green'),
    yellow: paint('yellow'),
    blue: paint('blue'),
    cyan: paint('cyan'),
    gray: paint('gray'),
  };
}

/**
 * @param {{ json?: boolean, stdout?: NodeJS.WritableStream, stderr?: NodeJS.WritableStream, env?: NodeJS.ProcessEnv }} [options]
 */
function createOutput(options = {}) {
  const stdout = options.stdout || process.stdout;
  const stderr = options.stderr || process.stderr;
  const env = options.env || process.env;
  const json = Boolean(options.json);
  const color = colorEnabled(stdout, env);
  const c = makePainter(color);

  const write = (stream, text) => stream.write(`${text}\n`);

  const out = {
    json,
    color,
    c,
    sym: SYMBOLS,
    /** Linha humana no stdout (suprimida em modo JSON). */
    line(text = '') {
      if (!json) write(stdout, text);
    },
    /** Linha no stderr (sempre escrita, inclusive em modo JSON). */
    err(text = '') {
      write(stderr, text);
    },
    heading(text) {
      out.line(c.bold(text));
    },
    ok(text) {
      out.line(`${c.green(SYMBOLS.ok)} ${text}`);
    },
    warn(text) {
      out.line(`${c.yellow(SYMBOLS.warn)} ${text}`);
    },
    fail(text) {
      out.line(`${c.red(SYMBOLS.fail)} ${text}`);
    },
    info(text) {
      out.line(`${c.cyan(SYMBOLS.info)} ${text}`);
    },
    hint(text) {
      out.line(`  ${c.gray(`${SYMBOLS.arrow} ${text}`)}`);
    },
    /** Par chave/valor alinhado. */
    kv(key, value, width = 14) {
      out.line(`  ${c.gray(String(key).padEnd(width))} ${value}`);
    },
    /** Símbolo colorido por nível: ok | warn | fail | info. */
    mark(level) {
      if (level === 'ok') return c.green(SYMBOLS.ok);
      if (level === 'warn') return c.yellow(SYMBOLS.warn);
      if (level === 'fail' || level === 'error') return c.red(SYMBOLS.fail);
      return c.cyan(SYMBOLS.info);
    },
    printJson(value) {
      write(stdout, JSON.stringify(value, null, 2));
    },
  };
  return out;
}

module.exports = { SYMBOLS, colorEnabled, createOutput };
