import Database from "@tauri-apps/plugin-sql";
import type { Provider, DailyLog } from "../types";

let _initPromise: Promise<Database> | null = null;

function getDb(): Promise<Database> {
  if (!_initPromise) {
    _initPromise = Database.load("sqlite:ai_fuel.db").then(async (db) => {
      await initSchema(db);
      return db;
    });
  }
  return _initPromise;
}

async function initSchema(db: Database): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS providers (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT    NOT NULL,
      type            TEXT    NOT NULL UNIQUE,
      allowance_unit  TEXT    NOT NULL DEFAULT 'normalized',
      total_allowance REAL    NOT NULL DEFAULT 100,
      used_amount     REAL    NOT NULL DEFAULT 0,
      reset_cadence   TEXT    NOT NULL DEFAULT 'monthly',
      reset_at        TEXT    NOT NULL,
      last_updated_at TEXT    NOT NULL,
      notes           TEXT
    )
  `);

  // Remove any duplicate rows from the race-condition seed, keeping the lowest id per type.
  await db.execute(`
    DELETE FROM providers
    WHERE id NOT IN (
      SELECT MIN(id) FROM providers GROUP BY type
    )
  `);

  // Migrations: add new columns if they don't exist yet (ALTER TABLE ignores duplicate errors)
  for (const sql of [
    "ALTER TABLE providers ADD COLUMN tokens_budget INTEGER DEFAULT 5000000",
    "ALTER TABLE providers ADD COLUMN auto_sync     INTEGER DEFAULT 0",
  ]) {
    try { await db.execute(sql); } catch { /* column already exists */ }
  }

  // Usage history log
  await db.execute(`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_id INTEGER NOT NULL,
      log_date    TEXT    NOT NULL,
      tokens_in   INTEGER NOT NULL DEFAULT 0,
      tokens_out  INTEGER NOT NULL DEFAULT 0,
      cache_create INTEGER NOT NULL DEFAULT 0,
      messages    INTEGER NOT NULL DEFAULT 0,
      UNIQUE(provider_id, log_date)
    )
  `);

  const rows = await db.select<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM providers"
  );
  if (rows[0].count === 0) {
    await seedDefaults(db);
  }
}

async function seedDefaults(db: Database): Promise<void> {
  const now = new Date().toISOString();
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
  nextMonth.setHours(0, 0, 0, 0);
  const nm = nextMonth.toISOString();

  const seeds = [
    { name: "Claude Code", type: "claude",  unit: "tokens",     total: 5_000_000, used: 0,  cadence: "monthly", reset: nm, autoSync: 1, budget: 5_000_000 },
    { name: "Codex",       type: "codex",   unit: "normalized", total: 100,       used: 48, cadence: "monthly", reset: nm, autoSync: 0, budget: 5_000_000 },
    { name: "Copilot",     type: "copilot", unit: "requests",   total: 100,       used: 16, cadence: "monthly", reset: nm, autoSync: 0, budget: 5_000_000 },
  ];

  for (const s of seeds) {
    await db.execute(
      `INSERT OR IGNORE INTO providers
         (name, type, allowance_unit, total_allowance, used_amount, reset_cadence, reset_at, last_updated_at, auto_sync, tokens_budget)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [s.name, s.type, s.unit, s.total, s.used, s.cadence, s.reset, now, s.autoSync, s.budget]
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToProvider(r: any): Provider {
  return {
    id:             r.id,
    name:           r.name,
    type:           r.type,
    allowanceUnit:  r.allowance_unit,
    totalAllowance: r.total_allowance,
    usedAmount:     r.used_amount,
    resetCadence:   r.reset_cadence,
    resetAt:        r.reset_at,
    lastUpdatedAt:  r.last_updated_at,
    notes:          r.notes ?? undefined,
    autoSync:       r.auto_sync === 1,
    tokensBudget:   r.tokens_budget ?? 5_000_000,
  };
}

export async function loadProviders(): Promise<Provider[]> {
  const db = await getDb();
  const rows = await db.select<unknown[]>("SELECT * FROM providers ORDER BY id");
  return (rows as object[]).map(rowToProvider);
}

export async function saveProvider(id: number, updates: Partial<Provider>): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  const cols: string[] = [];
  const vals: unknown[] = [];

  const map: Record<string, unknown> = {
    name:            updates.name,
    allowance_unit:  updates.allowanceUnit,
    total_allowance: updates.totalAllowance,
    used_amount:     updates.usedAmount,
    reset_cadence:   updates.resetCadence,
    reset_at:        updates.resetAt,
    notes:           updates.notes,
  };

  for (const [col, val] of Object.entries(map)) {
    if (val !== undefined) {
      cols.push(`${col} = ?`);
      vals.push(val);
    }
  }

  cols.push("last_updated_at = ?");
  vals.push(now);
  vals.push(id);

  await db.execute(`UPDATE providers SET ${cols.join(", ")} WHERE id = ?`, vals);
}

// ── Usage log ─────────────────────────────────────────────────────────────────

export async function upsertUsageLog(
  providerId: number,
  date: string,
  tokensIn: number,
  tokensOut: number,
  cacheCreate: number,
  messages: number,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO usage_logs (provider_id, log_date, tokens_in, tokens_out, cache_create, messages)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(provider_id, log_date)
     DO UPDATE SET tokens_in=excluded.tokens_in, tokens_out=excluded.tokens_out,
                   cache_create=excluded.cache_create, messages=excluded.messages`,
    [providerId, date, tokensIn, tokensOut, cacheCreate, messages],
  );
}

export async function getDailyLogs(providerId: number, days = 7): Promise<DailyLog[]> {
  const db = await getDb();
  const rows = await db.select<{ log_date: string; tokens_in: number; tokens_out: number; cache_create: number; messages: number }[]>(
    `SELECT log_date, tokens_in, tokens_out, cache_create, messages
     FROM usage_logs
     WHERE provider_id = ?
     ORDER BY log_date DESC
     LIMIT ?`,
    [providerId, days],
  );
  return rows.map((r) => ({
    date:        r.log_date,
    tokensIn:    r.tokens_in,
    tokensOut:   r.tokens_out,
    cacheCreate: r.cache_create,
    messages:    r.messages,
  }));
}
