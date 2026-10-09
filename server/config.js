// 設定の読み込み。nanashi.config.json（コミット可）+ .env（秘密情報・コミット不可）
import fs from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export const DATA = path.join(ROOT, 'data');

function loadEnvFile() {
  const p = path.join(ROOT, '.env');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

export function loadConfig(overrides = {}) {
  loadEnvFile();
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'nanashi.config.json'), 'utf8'));
  if (process.env.NANASHI_LLM_MODE) cfg.llm.mode = process.env.NANASHI_LLM_MODE;
  if (process.env.PORT) cfg.port = Number(process.env.PORT);
  if (process.env.NANASHI_SPEED) cfg.gameMinutesPerRealSecond = Number(process.env.NANASHI_SPEED);
  return { ...cfg, ...overrides, llm: { ...cfg.llm, ...(overrides.llm || {}) } };
}
