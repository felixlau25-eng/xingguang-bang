import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { CATEGORIES, type CategoryId } from "@/lib/stars";

const PIN_RE = /^\d{4,8}$/;
const DEFAULT_SALT = "s7c9k2m4n8p1q5r3";
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

const categorySchema = z.enum(
  CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]],
);

export type StudentRow = {
  id: number;
  name: string;
  hue: number;
  total: number;
  exercise: number;
  dictation: number;
  conduct: number;
};

export type AwardRow = {
  id: number;
  studentId: number;
  studentName: string;
  category: CategoryId;
  stars: number;
  createdAt: string;
};

export type BoardPayload = {
  className: string;
  students: StudentRow[];
  recent: AwardRow[];
};

function hashPin(pin: string, salt: string) {
  return createHash("sha256").update(`${salt}:${pin}`).digest("hex");
}

function equalHex(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function asIso(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function asInt(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function requireTeacher(token: string) {
  const sql = await getSql();
  const rows = await sql<{
    unlock_token: string | null;
    token_expires_at: string | Date | null;
  }>`select unlock_token, token_expires_at from settings where id = 1`;
  const row = rows[0];
  if (!row?.unlock_token) throw new Error("請先以導師身份解鎖");
  const expires = row.token_expires_at
    ? new Date(row.token_expires_at).getTime()
    : 0;
  if (!Number.isFinite(expires) || expires < Date.now()) {
    throw new Error("登入已過期，請重新輸入密碼");
  }
  if (!equalHex(row.unlock_token, token)) {
    throw new Error("請先以導師身份解鎖");
  }
}

async function loadBoard(): Promise<BoardPayload> {
  const sql = await getSql();
  const settings = await sql<{ class_name: string }>`
    select class_name from settings where id = 1
  `;
  const students = await sql<{
    id: number;
    name: string;
    hue: number;
    total: number;
    exercise: number;
    dictation: number;
    conduct: number;
  }>`
    select
      s.id,
      s.name,
      s.hue,
      coalesce(sum(a.stars), 0)::int as total,
      coalesce(sum(a.stars) filter (where a.category = 'exercise'), 0)::int as exercise,
      coalesce(sum(a.stars) filter (where a.category = 'dictation'), 0)::int as dictation,
      coalesce(sum(a.stars) filter (where a.category = 'conduct'), 0)::int as conduct
    from students s
    left join awards a on a.student_id = s.id
    group by s.id
    order by coalesce(sum(a.stars), 0) desc, s.created_at asc, s.id asc
  `;
  const recent = await sql<{
    id: number;
    student_id: number;
    student_name: string;
    category: string;
    stars: number;
    created_at: string | Date;
  }>`
    select
      a.id,
      a.student_id,
      s.name as student_name,
      a.category,
      a.stars,
      a.created_at
    from awards a
    join students s on s.id = a.student_id
    order by a.created_at desc, a.id desc
    limit 24
  `;
  return {
    className: settings[0]?.class_name ?? "我的班",
    students: students.map((row) => ({
      id: asInt(row.id),
      name: row.name,
      hue: asInt(row.hue),
      total: asInt(row.total),
      exercise: asInt(row.exercise),
      dictation: asInt(row.dictation),
      conduct: asInt(row.conduct),
    })),
    recent: recent.map((row) => ({
      id: asInt(row.id),
      studentId: asInt(row.student_id),
      studentName: row.student_name,
      category: row.category as CategoryId,
      stars: asInt(row.stars),
      createdAt: asIso(row.created_at) ?? new Date().toISOString(),
    })),
  };
}

export const getBoard = createServerFn({ method: "GET" }).handler(
  async (): Promise<BoardPayload> => loadBoard(),
);

export const unlockTeacher = createServerFn({ method: "POST" })
  .validator(z.object({ pin: z.string().regex(PIN_RE, "請輸入 4 至 8 位數字密碼") }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql<{
      pin_salt: string;
      pin_hash: string;
      class_name: string;
    }>`select pin_salt, pin_hash, class_name from settings where id = 1`;
    const row = rows[0];
    if (!row) throw new Error("尚未設定班別");
    const hashed = hashPin(data.pin, row.pin_salt || DEFAULT_SALT);
    if (!equalHex(hashed, row.pin_hash)) {
      throw new Error("導師密碼不正確");
    }
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
    await sql`
      update settings
      set unlock_token = ${token}, token_expires_at = ${expiresAt}
      where id = 1
    `;
    return { token, expiresAt, className: row.class_name };
  });

export const verifyTeacher = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      await requireTeacher(data.token);
      return { ok: true as const };
    } catch {
      return { ok: false as const };
    }
  });

export const lockTeacher = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      await requireTeacher(data.token);
    } catch {
      return { ok: true as const };
    }
    const sql = await getSql();
    await sql`update settings set unlock_token = null, token_expires_at = null where id = 1`;
    return { ok: true as const };
  });

export const addStudent = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string().min(1),
      name: z.string().trim().min(1, "請輸入姓名").max(16, "姓名太長"),
    }),
  )
  .handler(async ({ data }) => {
    await requireTeacher(data.token);
    const sql = await getSql();
    const countRows = await sql<{ n: number }>`select count(*)::int as n from students`;
    const hue = asInt(countRows[0]?.n);
    const inserted = await sql<{ id: number }>`
      insert into students (name, hue)
      values (${data.name}, ${hue % 6})
      returning id
    `;
    return { id: asInt(inserted[0]?.id), board: await loadBoard() };
  });

export const renameStudent = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string().min(1),
      id: z.number().int().positive(),
      name: z.string().trim().min(1, "請輸入姓名").max(16, "姓名太長"),
    }),
  )
  .handler(async ({ data }) => {
    await requireTeacher(data.token);
    const sql = await getSql();
    const updated = await sql<{ id: number }>`
      update students set name = ${data.name} where id = ${data.id} returning id
    `;
    if (!updated[0]) throw new Error("找不到這位同學");
    return loadBoard();
  });

export const removeStudent = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string().min(1),
      id: z.number().int().positive(),
    }),
  )
  .handler(async ({ data }) => {
    await requireTeacher(data.token);
    const sql = await getSql();
    const removed = await sql<{ id: number }>`
      delete from students where id = ${data.id} returning id
    `;
    if (!removed[0]) throw new Error("找不到這位同學");
    return loadBoard();
  });

export const awardStars = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string().min(1),
      studentId: z.number().int().positive(),
      category: categorySchema,
      stars: z.number().int().min(1).max(20),
    }),
  )
  .handler(async ({ data }) => {
    await requireTeacher(data.token);
    const sql = await getSql();
    const current = await sql<{ name: string; total: number }>`
      select s.name, coalesce(sum(a.stars), 0)::int as total
      from students s
      left join awards a on a.student_id = s.id
      where s.id = ${data.studentId}
      group by s.id
    `;
    if (!current[0]) throw new Error("找不到這位同學");
    await sql`
      insert into awards (student_id, category, stars)
      values (${data.studentId}, ${data.category}, ${data.stars})
    `;
    const previousTotal = asInt(current[0].total);
    const nextTotal = previousTotal + data.stars;
    const converted =
      Math.floor(nextTotal / 10) - Math.floor(previousTotal / 10);
    return {
      name: current[0].name,
      previousTotal,
      total: nextTotal,
      converted,
      board: await loadBoard(),
    };
  });

export const undoLastAward = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string().min(1),
      studentId: z.number().int().positive(),
    }),
  )
  .handler(async ({ data }) => {
    await requireTeacher(data.token);
    const sql = await getSql();
    const last = await sql<{ id: number; stars: number; category: string }>`
      select id, stars, category from awards
      where student_id = ${data.studentId}
      order by created_at desc, id desc
      limit 1
    `;
    if (!last[0]) throw new Error("這位同學還沒有星星紀錄");
    await sql`delete from awards where id = ${last[0].id}`;
    return loadBoard();
  });

export const updateClassName = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string().min(1),
      className: z.string().trim().min(1, "請輸入班名").max(20, "班名太長"),
    }),
  )
  .handler(async ({ data }) => {
    await requireTeacher(data.token);
    const sql = await getSql();
    await sql`update settings set class_name = ${data.className} where id = 1`;
    return loadBoard();
  });

export const changePin = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string().min(1),
      currentPin: z.string().regex(PIN_RE, "請輸入現時密碼"),
      nextPin: z.string().regex(PIN_RE, "新密碼須為 4 至 8 位數字"),
    }),
  )
  .handler(async ({ data }) => {
    await requireTeacher(data.token);
    const sql = await getSql();
    const rows = await sql<{ pin_salt: string; pin_hash: string }>`
      select pin_salt, pin_hash from settings where id = 1
    `;
    const row = rows[0];
    if (!row) throw new Error("尚未設定班別");
    const currentHash = hashPin(data.currentPin, row.pin_salt || DEFAULT_SALT);
    if (!equalHex(currentHash, row.pin_hash)) {
      throw new Error("現時密碼不正確");
    }
    const salt = randomBytes(8).toString("hex");
    const nextHash = hashPin(data.nextPin, salt);
    const nextToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
    await sql`
      update settings
      set pin_salt = ${salt},
          pin_hash = ${nextHash},
          unlock_token = ${nextToken},
          token_expires_at = ${expiresAt}
      where id = 1
    `;
    return { token: nextToken, expiresAt };
  });
