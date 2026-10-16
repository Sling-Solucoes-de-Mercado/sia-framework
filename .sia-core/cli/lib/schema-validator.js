'use strict';

/**
 * Validador de um subconjunto de JSON Schema (draft-07):
 * type, required, properties, pattern, enum, items, minLength, maxLength, additionalProperties.
 * Outras palavras-chave são ignoradas.
 */

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  return typeof value;
}

function matchesType(value, expected) {
  const actual = typeOf(value);
  if (expected === 'number') return actual === 'number' || actual === 'integer';
  return actual === expected;
}

function describe(value) {
  const type = typeOf(value);
  return type === 'integer' ? 'number' : type;
}

/**
 * @param {object} schema
 * @param {any} data
 * @param {string} [at] caminho atual (ex.: components.tasks[0])
 * @returns {{ path: string, message: string }[]}
 */
function validate(schema, data, at = '') {
  const errors = [];
  if (!schema || typeof schema !== 'object') return errors;
  const where = at || '(raiz)';

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => matchesType(data, t))) {
      errors.push({ path: where, message: `tipo esperado ${types.join(' | ')}, recebido ${describe(data)}` });
      return errors;
    }
  }

  if (Array.isArray(schema.enum) && !schema.enum.some((option) => option === data)) {
    errors.push({ path: where, message: `valor fora do enum (${schema.enum.join(', ')}): ${JSON.stringify(data)}` });
  }

  if (typeof data === 'string') {
    if (typeof schema.minLength === 'number' && [...data].length < schema.minLength) {
      errors.push({ path: where, message: `mínimo de ${schema.minLength} caracteres` });
    }
    if (typeof schema.maxLength === 'number' && [...data].length > schema.maxLength) {
      errors.push({ path: where, message: `máximo de ${schema.maxLength} caracteres` });
    }
    if (typeof schema.pattern === 'string') {
      let re = null;
      try {
        re = new RegExp(schema.pattern, 'u');
      } catch {
        errors.push({ path: where, message: `pattern inválido no schema: ${schema.pattern}` });
      }
      if (re && !re.test(data)) {
        errors.push({ path: where, message: `não corresponde ao padrão ${schema.pattern}: ${JSON.stringify(data)}` });
      }
    }
  }

  if (Array.isArray(data) && schema.items && typeof schema.items === 'object') {
    data.forEach((item, index) => {
      errors.push(...validate(schema.items, item, `${at}[${index}]`));
    });
  }

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const properties = schema.properties && typeof schema.properties === 'object' ? schema.properties : {};
    if (Array.isArray(schema.required)) {
      for (const key of schema.required) {
        if (!Object.prototype.hasOwnProperty.call(data, key) || data[key] === undefined) {
          errors.push({ path: at ? `${at}.${key}` : key, message: 'campo obrigatório ausente' });
        }
      }
    }
    for (const [key, value] of Object.entries(data)) {
      const childPath = at ? `${at}.${key}` : key;
      if (Object.prototype.hasOwnProperty.call(properties, key)) {
        errors.push(...validate(properties[key], value, childPath));
      } else if (schema.additionalProperties === false) {
        errors.push({ path: childPath, message: 'propriedade não permitida pelo schema' });
      } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        errors.push(...validate(schema.additionalProperties, value, childPath));
      }
    }
  }
  return errors;
}

module.exports = { validate, typeOf };
