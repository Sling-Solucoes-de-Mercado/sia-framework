'use strict';

/**
 * Entrada de `node --test cli/tests/` (Node 22 ou superior).
 *
 * Desde o Node 21, os argumentos de --test são padrões glob: um diretório passado
 * literalmente é executado como módulo, e o Node resolve este index.js, que carrega todos
 * os *.test.js num único processo. Em versões antigas que varriam o diretório, este arquivo
 * não casava com os padrões de nome de teste, então nada roda duas vezes.
 */

const fs = require('fs');
const path = require('path');

for (const name of fs.readdirSync(__dirname).filter((file) => file.endsWith('.test.js')).sort()) {
  require(path.join(__dirname, name));
}
