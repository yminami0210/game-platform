// スキル実行器。トークン節約が最優先。
//   template  : LLM を一切使わない（既定・トークン 0）
//   omniroute : OmniRoute（OpenAI 互換ゲートウェイ）に 1 回だけ短く問い合わせる
//   claude    : Claude Code を `claude -p` で起動。ANTHROPIC_BASE_URL を OmniRoute に向ける
// どのモードでも、予算超過・失敗・上限到達時はテンプレートに自動で落ちる。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { DATA, ROOT } from './config.js';
import { NEWSPAPER_NAME } from './lore.js';
import { templates } from './templates.js';

export { templates };

// ---- プロンプト（短く・ダイジェストのみ渡す） -----------------------------
const PROMPTS = {
  sns_post: ({ event, author }) =>
    `あなたは架空の「ナナシ県」県庁広報課の職員${author}。次の出来事を、昭和の役所らしい素朴な文体で、100字以内のSNS投稿にして。ハッシュタグ#ナナシ県を1つ。本文のみ出力。\n出来事: ${event.text}（場所: ${event.placeName}）`,
  newspaper: ({ day, dateLabel, digest, stats }) =>
    `架空の地方紙「${NEWSPAPER_NAME}」第${day}号（${dateLabel}）をMarkdownで書いて。見出し1つ+本文200字+箇条書き短信。実在の人物・企業名は出さない。素材(JSON): ${JSON.stringify({ digest, stats })}`,
};

// "role:writer" のような指定は、会社共通の役割表 tools/omni_models.json から実際のモデル名に置き換える
export function resolveModel(model, file = path.join(ROOT, 'tools', 'omni_models.json')) {
  const m = /^role:(\w+)$/.exec(model || '');
  if (!m) return model;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))[m[1]] || model;
  } catch {
    return model;
  }
}

// ---- 予算台帳 ---------------------------------------------------------------
export class Ledger {
  constructor(file = path.join(DATA, 'ledger.json')) {
    this.file = file;
    this.state = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { date: '', tokens: 0, calls: 0, byGameDay: {} };
  }
  #today() {
    return new Date().toISOString().slice(0, 10);
  }
  #roll() {
    if (this.state.date !== this.#today()) Object.assign(this.state, { date: this.#today(), tokens: 0, calls: 0 });
  }
  canSpend(budget) {
    this.#roll();
    return this.state.tokens < budget;
  }
  callsFor(gameDay, task) {
    return this.state.byGameDay?.[gameDay]?.[task] || 0;
  }
  record(gameDay, task, tokens) {
    this.#roll();
    this.state.tokens += tokens;
    this.state.calls += 1;
    this.state.byGameDay ||= {};
    const days = this.state.byGameDay;
    days[gameDay] ||= {};
    days[gameDay][task] = (days[gameDay][task] || 0) + 1;
    for (const k of Object.keys(days)) if (Number(k) < gameDay - 7) delete days[k];
    fs.writeFileSync(this.file, JSON.stringify(this.state));
  }
  summary() {
    this.#roll();
    return { date: this.state.date, tokens: this.state.tokens, calls: this.state.calls };
  }
}

// ---- 実行器 -----------------------------------------------------------------
export class Executor {
  constructor(cfg, { rnd = Math.random, dataDir = DATA, ledger = new Ledger(path.join(dataDir, 'ledger.json')), fetchImpl = globalThis.fetch } = {}) {
    this.cfg = cfg.llm;
    this.rnd = rnd;
    this.ledger = ledger;
    this.fetch = fetchImpl;
    fs.mkdirSync(dataDir, { recursive: true });
    this.cacheFile = path.join(dataDir, 'llm-cache.json');
    this.cache = fs.existsSync(this.cacheFile) ? JSON.parse(fs.readFileSync(this.cacheFile, 'utf8')) : {};
  }

  status() {
    return { mode: this.cfg.mode, budget: this.cfg.dailyTokenBudget, ...this.ledger.summary() };
  }

  #allowed(task, gameDay) {
    if (this.cfg.mode === 'template') return false;
    if (!PROMPTS[task]) return false;
    const cap = this.cfg.maxCallsPerGameDay?.[task] ?? 0;
    if (this.ledger.callsFor(gameDay, task) >= cap) return false;
    if (this.cfg.mode === 'claude' && !(this.cfg.claudeCode.tasks || []).includes(task)) return false;
    return this.ledger.canSpend(this.cfg.dailyTokenBudget);
  }

  // 戻り値: { text, via: 'template'|'omniroute'|'claude'|'cache', tokens }
  async run(task, input, gameDay) {
    const fallback = () => ({ text: templates[task](input, this.rnd), via: 'template', tokens: 0 });
    if (!this.#allowed(task, gameDay)) return fallback();
    const prompt = PROMPTS[task](input);
    const key = crypto.createHash('sha1').update(task + prompt).digest('hex');
    if (this.cache[key]) return { text: this.cache[key], via: 'cache', tokens: 0 };
    try {
      const r = this.cfg.mode === 'claude' ? await this.#claude(prompt) : await this.#omniroute(prompt, task);
      if (!r.text) return fallback();
      this.ledger.record(gameDay, task, r.tokens);
      this.cache[key] = r.text;
      fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache));
      return r;
    } catch (err) {
      return { ...fallback(), error: String(err.message || err) };
    }
  }

  async #omniroute(prompt, task) {
    const o = this.cfg.omniroute;
    // 127.0.0.1 だけで待ち受ける OmniRoute はキー不要（運用設定どおり）。キーを設定したときだけ送る
    const key = process.env.OMNIROUTE_API_KEY;
    const headers = { 'content-type': 'application/json', ...(key ? { authorization: `Bearer ${key}` } : {}) };
    const res = await this.fetch(`${o.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: resolveModel(o.model),
        max_tokens: task === 'newspaper' ? o.maxTokens * 3 : o.maxTokens,
        temperature: o.temperature,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`OmniRoute HTTP ${res.status}`);
    const j = await res.json();
    const text = j.choices?.[0]?.message?.content?.trim();
    const tokens = j.usage?.total_tokens ?? Math.ceil((prompt.length + (text || '').length) / 2);
    return { text, via: 'omniroute', tokens };
  }

  #claude(prompt) {
    const c = this.cfg.claudeCode;
    const env = { ...process.env, ANTHROPIC_BASE_URL: c.baseUrl };
    if (process.env.OMNIROUTE_API_KEY) env.ANTHROPIC_AUTH_TOKEN = process.env.OMNIROUTE_API_KEY;
    return new Promise((resolve, reject) => {
      // ツールを持たせない・リポジトリの CLAUDE.md を読ませない（cwd を data/ に）＝最小トークン
      const p = spawn('claude', ['-p', prompt, '--model', c.model, '--output-format', 'json', '--tools', ''], { cwd: DATA, env });
      let out = '';
      p.stdout.on('data', (d) => (out += d));
      const timer = setTimeout(() => p.kill(), 120000);
      p.on('error', reject);
      p.on('close', () => {
        clearTimeout(timer);
        try {
          const j = JSON.parse(out);
          const u = j.usage || {};
          resolve({ text: (j.result || '').trim(), via: 'claude', tokens: (u.input_tokens || 0) + (u.output_tokens || 0) });
        } catch (e) {
          reject(new Error('claude の出力を解釈できません'));
        }
      });
    });
  }
}
