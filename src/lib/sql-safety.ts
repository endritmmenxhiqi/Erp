const ALLOWED_TABLES = new Set([
  "sales",
  "sale_items",
  "purchases",
  "purchase_items",
  "stock",
  "profiles",
  "workers",
  "worker_shifts",
]);

const DANGEROUS_SQL = /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|copy|call|execute|merge|vacuum|analyze|listen|notify|set|reset)\b/i;
const TABLE_REFERENCES = /\b(?:from|join)\s+([a-zA-Z_][\w."]*)/gi;

export function validateReadOnlySql(input: string) {
  const sql = input.trim().replace(/;+\s*$/, "");
  const lower = sql.toLowerCase();

  if (!lower.startsWith("select") && !lower.startsWith("with")) {
    return { ok: false as const, error: "Lejohen vetem query leximi (SELECT)." };
  }

  if (sql.includes(";") || sql.includes("--") || /\/\*/.test(sql)) {
    return { ok: false as const, error: "Query nuk mund te permbaje komente ose disa komanda." };
  }

  if (DANGEROUS_SQL.test(sql)) {
    return { ok: false as const, error: "Query permban operacion te ndaluar." };
  }

  for (const match of sql.matchAll(TABLE_REFERENCES)) {
    const table = match[1].replace(/"/g, "").split(".").pop()?.toLowerCase();
    if (!table || !ALLOWED_TABLES.has(table)) {
      return { ok: false as const, error: "Query kerkon qasje ne tabele te palejuar." };
    }
  }

  if (!/\blimit\s+\d+\b/i.test(sql)) {
    return { ok: true as const, sql: `${sql} limit 100` };
  }

  return {
    ok: true as const,
    sql: sql.replace(/\blimit\s+(\d+)\b/i, (_match, value) => `limit ${Math.min(Number(value), 100)}`),
  };
}
