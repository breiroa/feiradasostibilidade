// Garda en src/data/versions.json as versións instaladas, a data da compilación e o commit,
// para que o Diagnóstico do panel poida comparalas coas últimas publicadas. Execútase antes de compilar.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8'));
const instalada = (nome) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(RAIZ, 'node_modules', nome, 'package.json'), 'utf8')).version;
  } catch {
    return null;
  }
};
let commit = null;
try {
  commit = execSync('git rev-parse --short HEAD', { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
} catch { /* sen git */ }
const wrangler = fs.readFileSync(path.join(RAIZ, 'wrangler.jsonc'), 'utf8');
const datos = {
  compilado: new Date().toISOString(),
  commit,
  compatibilidade: wrangler.match(/"compatibility_date":\s*"([^"]+)"/)?.[1] ?? null,
  paquetes: Object.fromEntries([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})].map((n) => [n, instalada(n)])),
};
fs.writeFileSync(path.join(RAIZ, 'src', 'data', 'versions.json'), JSON.stringify(datos, null, 2) + '\n');
console.log('versions.json:', datos.commit, Object.keys(datos.paquetes).length, 'paquetes');
