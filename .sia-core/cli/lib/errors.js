'use strict';

/**
 * Erros da CLI com código de saída.
 * 0 = ok, 1 = falha de validação/verificação, 2 = erro de uso.
 */

const EXIT = Object.freeze({ OK: 0, FAILURE: 1, USAGE: 2 });

class SiaError extends Error {
  /**
   * @param {string} message Mensagem em português para o usuário.
   * @param {{ exitCode?: number, code?: string, details?: object }} [options]
   */
  constructor(message, options = {}) {
    super(message);
    this.name = 'SiaError';
    this.exitCode = options.exitCode === undefined ? EXIT.FAILURE : options.exitCode;
    this.code = options.code || 'SIA_ERROR';
    this.details = options.details || null;
  }
}

class UsageError extends SiaError {
  constructor(message, options = {}) {
    super(message, { ...options, exitCode: EXIT.USAGE, code: options.code || 'USAGE' });
    this.name = 'UsageError';
  }
}

module.exports = { EXIT, SiaError, UsageError };
