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
    // Preserve existing operation if chaining .insert().select() or .update().select()
    if (this.operation !== 'INSERT' && this.operation !== 'UPDATE' && this.operation !== 'DELETE') {
      this.operation = 'SELECT';
    }
    this.selectedColumns = columns || '*';
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

  gt(column: string, value: any) {
    this.conditions.push({
      sql: `"${column}" > $PARAM`,
      values: [value],
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

  lt(column: string, value: any) {
    this.conditions.push({
      sql: `"${column}" < $PARAM`,
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

  like(column: string, value: any) {
    this.conditions.push({
      sql: `"${column}" LIKE $PARAM`,
      values: [value],
    });
    return this;
  }

  ilike(column: string, value: any) {
    this.conditions.push({
      sql: `"${column}" ILIKE $PARAM`,
      values: [value],
    });
    return this;
  }

  is(column: string, value: any) {
    if (value === null) {
      this.conditions.push({
        sql: `"${column}" IS NULL`,
        values: [],
      });
    } else {
      this.conditions.push({
        sql: `"${column}" = $PARAM`,
        values: [value],
      });
    }
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
    // Parser for PostgREST or filters like "customerId.eq.123,customerSnapshot->>email.ilike.abc@def.com"
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

    const returningCols = this.selectedColumns === '*' ? '*' : this.selectedColumns;

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
          if (rawVal !== null && typeof rawVal === 'object' && !(rawVal instanceof Date)) {
            allValues.push(JSON.stringify(rawVal));
          } else {
            allValues.push(rawVal);
          }
        }
        rowValuesSql.push(`(${valPlaceholders.join(', ')})`);
      }

      const text = `INSERT INTO "${this.tableName}" (${quotedCols}) VALUES ${rowValuesSql.join(', ')} RETURNING ${returningCols}`;
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

      const text = `UPDATE "${this.tableName}" SET ${setClauses.join(', ')}${whereSql} RETURNING ${returningCols}`;
      return { text, values: allValues };
    }

    if (this.operation === 'DELETE') {
      let whereSql = '';
      if (this.conditions.length > 0) {
        const resolvedConditions = this.conditions.map((c) => resolveSql(c.sql, c.values));
        whereSql = ` WHERE ${resolvedConditions.join(' AND ')}`;
      }
      const text = `DELETE FROM "${this.tableName}"${whereSql} RETURNING ${returningCols}`;
      return { text, values: allValues };
    }

    // SELECT
    let selectCols = this.selectedColumns;
    if (selectCols === '*') {
      selectCols = '*';
    } else {
      selectCols = selectCols
        .split(',')
        .map((col) => {
          const trimmed = col.trim();
          // Check for PostgREST nested relation join: alias:foreign_table(cols)
          const relMatch = trimmed.match(/^([a-zA-Z0-9_]+):([a-zA-Z0-9_]+)\((.+)\)$/);
          if (relMatch) {
            const [, alias, foreignTable, foreignCols] = relMatch;
            const fkCol = foreignTable === 'ecommerce_products' ? 'productId' : foreignTable === 'ecommerce_customers' ? 'customerId' : 'id';
            const jsonBuildArgs = foreignCols
              .split(',')
              .map((c) => `'${c.trim()}', sub."${c.trim()}"`)
              .join(', ');
            return `(SELECT json_build_object(${jsonBuildArgs}) FROM "${foreignTable}" sub WHERE sub.id = "${this.tableName}"."${fkCol}") AS "${alias}"`;
          }
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
    rpc: async (fnName: string, params: Record<string, any> = {}) => {
      try {
        const pool = getPostgresPool();
        if (fnName === 'place_ecommerce_order') {
          const res = await pool.query(
            `SELECT public.place_ecommerce_order($1, $2::jsonb, $3::jsonb, $4::jsonb, $5, $6, $7) as result`,
            [
              params.p_store_slug,
              JSON.stringify(params.p_customer ?? {}),
              JSON.stringify(params.p_shipping_address ?? {}),
              JSON.stringify(params.p_items ?? []),
              params.p_shipping_speed ?? 'std',
              params.p_payment_method ?? 'Cash on delivery',
              params.p_coupon_code ?? null,
            ]
          );
          return { data: res.rows[0]?.result ?? null, error: null };
        }

        if (fnName === 'get_ecommerce_order') {
          const res = await pool.query(
            `SELECT public.get_ecommerce_order($1, $2, $3) as result`,
            [
              params.p_store_slug,
              params.p_order_number,
              params.p_access_token,
            ]
          );
          return { data: res.rows[0]?.result ?? null, error: null };
        }

        // Generic fallback for any other RPC function
        const keys = Object.keys(params);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const query = placeholders
          ? `SELECT public."${fnName}"(${placeholders}) as result`
          : `SELECT public."${fnName}"() as result`;
        const res = await pool.query(query, Object.values(params));
        return { data: res.rows[0]?.result ?? null, error: null };
      } catch (err: any) {
        console.error(`RPC ${fnName} error:`, err);
        return { data: null, error: err };
      }
    },
    auth: {
      getUser: async (token: string) => {
        try {
          const pool = getPostgresPool();
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
      admin: {
        updateUserById: async (userId: string, attributes: { password?: string; user_metadata?: any }) => {
          try {
            const pool = getPostgresPool();
            if (attributes.password) {
              await pool.query(
                `UPDATE auth.users 
                 SET encrypted_password = extensions.crypt($1, extensions.gen_salt('bf')),
                     updated_at = now()
                 WHERE id::text = $2`,
                [attributes.password, userId]
              );
            }
            if (attributes.user_metadata) {
              await pool.query(
                `UPDATE auth.users 
                 SET raw_user_meta_data = $1::jsonb,
                     updated_at = now()
                 WHERE id::text = $2`,
                [JSON.stringify(attributes.user_metadata), userId]
              );
            }
            return { data: { user: { id: userId } }, error: null };
          } catch (err: any) {
            return { data: null, error: err };
          }
        },
        getUserById: async (userId: string) => {
          try {
            const pool = getPostgresPool();
            const res = await pool.query(
              `SELECT u.id, u.email, u.raw_user_meta_data FROM auth.users u WHERE u.id::text = $1 LIMIT 1`,
              [userId]
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
          } catch (err: any) {
            return { data: null, error: err };
          }
        },
      },
    },
  };
}
