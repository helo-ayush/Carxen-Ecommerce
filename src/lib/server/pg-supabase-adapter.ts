import { Pool } from 'pg';

let globalPool: Pool | null = null;

export function getPostgresPool(): Pool {
  if (!globalPool) {
    const connectionString =
      process.env.DATABASE_URL ||
      process.env.DIRECT_URL;

    if (!connectionString) {
      throw new Error('Neither DATABASE_URL nor DIRECT_URL is set in environment.');
    }

    globalPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }
  return globalPool;
}

class QueryBuilder<T = any> {
  private tableName: string;
  private selectedColumns: string = '*';
  private conditions: { sql: string; values: any[] }[] = [];
  private orderClauses: string[] = [];
  private limitCount?: number;
  private offsetCount?: number;
  private operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' = 'SELECT';
  private insertData?: any;
  private updateData?: any;
  private isSingle: boolean = false;
  private isMaybeSingle: boolean = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns: string = '*') {
    this.operation = 'SELECT';
    this.selectedColumns = columns;
    return this;
  }

  insert(data: any) {
    this.operation = 'INSERT';
    this.insertData = data;
    return this;
  }

  update(data: any) {
    this.operation = 'UPDATE';
    this.updateData = data;
    return this;
  }

  delete() {
    this.operation = 'DELETE';
    return this;
  }

  eq(column: string, value: any) {
    this.conditions.push({
      sql: `"${column}" = $PARAM`,
      values: [value],
    });
    return this;
  }

  neq(column: string, value: any) {
    this.conditions.push({
      sql: `"${column}" != $PARAM`,
      values: [value],
    });
    return this;
  }

  in(column: string, values: any[]) {
    if (!values || values.length === 0) {
      this.conditions.push({ sql: '1=0', values: [] });
      return this;
    }
    const placeholders = values.map(() => '$PARAM').join(', ');
    this.conditions.push({
      sql: `"${column}" IN (${placeholders})`,
      values: [...values],
    });
    return this;
  }

  gte(column: string, value: any) {
    this.conditions.push({
      sql: `"${column}" >= $PARAM`,
      values: [value],
    });
    return this;
  }

  lte(column: string, value: any) {
    this.conditions.push({
      sql: `"${column}" <= $PARAM`,
      values: [value],
    });
    return this;
  }

  not(column: string, operator: string, value: any) {
    if (operator === 'is' && value === null) {
      this.conditions.push({
        sql: `"${column}" IS NOT NULL`,
        values: [],
      });
    } else {
      this.conditions.push({
        sql: `NOT ("${column}" = $PARAM)`,
        values: [value],
      });
    }
    return this;
  }

  or(filterStr: string) {
    // Basic parser for PostgREST or filters like "customerId.eq.123,customerSnapshot->>email.ilike.abc@def.com"
    const parts = filterStr.split(',').map((p) => p.trim()).filter(Boolean);
    const orSqlParts: string[] = [];
    const orValues: any[] = [];

    for (const part of parts) {
      if (part.includes('.eq.')) {
        const [col, val] = part.split('.eq.');
        orSqlParts.push(`"${col}" = $PARAM`);
        orValues.push(val);
      } else if (part.includes('.ilike.')) {
        const [fieldExpr, val] = part.split('.ilike.');
        if (fieldExpr.includes('->>')) {
          const [col, jsonKey] = fieldExpr.split('->>');
          orSqlParts.push(`("${col}"->>'${jsonKey}') ILIKE $PARAM`);
          orValues.push(`%${val}%`);
        } else {
          orSqlParts.push(`"${fieldExpr}" ILIKE $PARAM`);
          orValues.push(`%${val}%`);
        }
      }
    }

    if (orSqlParts.length > 0) {
      this.conditions.push({
        sql: `(${orSqlParts.join(' OR ')})`,
        values: orValues,
      });
    }
    return this;
  }

  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) {
    const dir = options?.ascending === false ? 'DESC' : 'ASC';
    const nulls = options?.nullsFirst === true ? 'NULLS FIRST' : 'NULLS LAST';
    this.orderClauses.push(`"${column}" ${dir} ${nulls}`);
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number) {
    this.offsetCount = from;
    this.limitCount = to - from + 1;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    this.limitCount = 1;
    return this;
  }

  single() {
    this.isSingle = true;
    this.limitCount = 1;
    return this;
  }

  private buildQuery(): { text: string; values: any[] } {
    let paramIndex = 1;
    const allValues: any[] = [];

    const resolveSql = (sqlFragment: string, vals: any[]) => {
      let resolved = sqlFragment;
      for (const v of vals) {
        resolved = resolved.replace('$PARAM', `$${paramIndex++}`);
        allValues.push(v);
      }
      return resolved;
    };

    if (this.operation === 'INSERT') {
      const rows = Array.isArray(this.insertData) ? this.insertData : [this.insertData];
      if (rows.length === 0) return { text: '', values: [] };

      const cols = Object.keys(rows[0]);
      const quotedCols = cols.map((c) => `"${c}"`).join(', ');

      const rowValuesSql: string[] = [];
      for (const row of rows) {
        const valPlaceholders: string[] = [];
        for (const col of cols) {
          valPlaceholders.push(`$${paramIndex++}`);
          const rawVal = row[col];
          // Ensure JSON / arrays / objects serialize properly for Postgres
          if (rawVal !== null && typeof rawVal === 'object' && !(rawVal instanceof Date)) {
            allValues.push(JSON.stringify(rawVal));
          } else {
            allValues.push(rawVal);
          }
        }
        rowValuesSql.push(`(${valPlaceholders.join(', ')})`);
      }

      const text = `INSERT INTO "${this.tableName}" (${quotedCols}) VALUES ${rowValuesSql.join(', ')} RETURNING *`;
      return { text, values: allValues };
    }

    if (this.operation === 'UPDATE') {
      const cols = Object.keys(this.updateData);
      const setClauses = cols.map((col) => {
        const placeholder = `$${paramIndex++}`;
        const rawVal = this.updateData[col];
        if (rawVal !== null && typeof rawVal === 'object' && !(rawVal instanceof Date)) {
          allValues.push(JSON.stringify(rawVal));
        } else {
          allValues.push(rawVal);
        }
        return `"${col}" = ${placeholder}`;
      });

      let whereSql = '';
      if (this.conditions.length > 0) {
        const resolvedConditions = this.conditions.map((c) => resolveSql(c.sql, c.values));
        whereSql = ` WHERE ${resolvedConditions.join(' AND ')}`;
      }

      const text = `UPDATE "${this.tableName}" SET ${setClauses.join(', ')}${whereSql} RETURNING *`;
      return { text, values: allValues };
    }

    if (this.operation === 'DELETE') {
      let whereSql = '';
      if (this.conditions.length > 0) {
        const resolvedConditions = this.conditions.map((c) => resolveSql(c.sql, c.values));
        whereSql = ` WHERE ${resolvedConditions.join(' AND ')}`;
      }
      const text = `DELETE FROM "${this.tableName}"${whereSql} RETURNING *`;
      return { text, values: allValues };
    }

    // SELECT
    let selectCols = this.selectedColumns;
    if (selectCols === '*') {
      selectCols = '*';
    } else {
      // Split column list and quote identifiers
      selectCols = selectCols
        .split(',')
        .map((col) => {
          const trimmed = col.trim();
          if (trimmed.includes(':') || trimmed.includes('(') || trimmed.includes('"')) return trimmed;
          return `"${trimmed}"`;
        })
        .join(', ');
    }

    let sql = `SELECT ${selectCols} FROM "${this.tableName}"`;

    if (this.conditions.length > 0) {
      const resolvedConditions = this.conditions.map((c) => resolveSql(c.sql, c.values));
      sql += ` WHERE ${resolvedConditions.join(' AND ')}`;
    }

    if (this.orderClauses.length > 0) {
      sql += ` ORDER BY ${this.orderClauses.join(', ')}`;
    }

    if (this.limitCount !== undefined) {
      sql += ` LIMIT ${this.limitCount}`;
    }

    if (this.offsetCount !== undefined) {
      sql += ` OFFSET ${this.offsetCount}`;
    }

    return { text: sql, values: allValues };
  }

  async then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: T | null; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    try {
      const pool = getPostgresPool();
      const { text, values } = this.buildQuery();
      const result = await pool.query(text, values);

      let data: any = result.rows;
      if (this.isMaybeSingle || this.isSingle) {
        data = result.rows[0] ?? null;
      }

      const res = { data, error: null };
      return onfulfilled ? (onfulfilled(res) as any) : (res as any);
    } catch (err: any) {
      const res = { data: null, error: err };
      return onfulfilled ? (onfulfilled(res) as any) : (res as any);
    }
  }
}

export function createPostgresSupabaseAdapter() {
  return {
    from: (tableName: string) => new QueryBuilder(tableName),
    auth: {
      getUser: async (token: string) => {
        try {
          const pool = getPostgresPool();
          // Find user by id or token in auth.users / auth.sessions
          const res = await pool.query(
            `SELECT u.id, u.email, u.raw_user_meta_data 
             FROM auth.users u 
             WHERE u.id::text = $1 OR u.email = $1 
             LIMIT 1`,
            [token]
          );
          if (res.rows[0]) {
            return {
              data: {
                user: {
                  id: res.rows[0].id,
                  email: res.rows[0].email,
                  user_metadata: res.rows[0].raw_user_meta_data || {},
                },
              },
              error: null,
            };
          }
          return { data: { user: null }, error: new Error('User not found') };
        } catch (e: any) {
          return { data: { user: null }, error: e };
        }
      },
    },
  };
}

