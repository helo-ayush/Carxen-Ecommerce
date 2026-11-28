const SAFE_IDENT_REGEX = /^[a-zA-Z0-9_]+$/;

export function assertSafeIdent(ident: string, kind: string = 'identifier'): string {
  if (typeof ident !== 'string' || !SAFE_IDENT_REGEX.test(ident)) {
    throw new Error(`Unsafe SQL ${kind}: "${String(ident)}"`);
  }
  return ident;
}

export function escapeLikePattern(value: unknown): string {
  return String(value ?? '').replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export function resolveSafeColumnExpr(column: string): string {
  if (typeof column !== 'string') {
    throw new Error('Column name must be a string.');
  }
  if (column.includes('->>')) {
    const parts = column.split('->>');
    if (parts.length !== 2) {
      throw new Error(`Invalid JSON column expression: "${column}"`);
    }
    const col = assertSafeIdent(parts[0], 'column');
    const jsonKey = assertSafeIdent(parts[1], 'json key');
    return `("${col}"->>'${jsonKey}')`;
  }
  return `"${assertSafeIdent(column, 'column')}"`;
}

export function splitOrClausesSafe(filterStr: string): string[] {
  const clauses: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let parenDepth = 0;

  for (let i = 0; i < filterStr.length; i++) {
    const ch = filterStr[i];
    if (ch === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      current += ch;
    } else if (ch === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      current += ch;
    } else if (!inSingleQuote && !inDoubleQuote) {
      if (ch === '(') {
        parenDepth++;
        current += ch;
      } else if (ch === ')') {
        if (parenDepth === 0) {
          throw new Error('Unbalanced parentheses in .or() filter.');
        }
        parenDepth--;
        current += ch;
      } else if (ch === ',' && parenDepth === 0) {
        if (current.trim()) clauses.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    } else {
      current += ch;
    }
  }
  if (inSingleQuote || inDoubleQuote || parenDepth !== 0) {
    throw new Error('Malformed quotes or parentheses in .or() filter.');
  }
  if (current.trim()) clauses.push(current.trim());
  return clauses;
}

export function parseOrClauses(filterStr: string): { sqlParts: string[]; values: any[] } {
  const parts = splitOrClausesSafe(filterStr);
  if (parts.length === 0) {
    throw new Error('Empty .or() filter is not allowed.');
  }

  const sqlParts: string[] = [];
  const values: any[] = [];

  for (const part of parts) {
    const match = part.match(/^([a-zA-Z0-9_]+(?:->>[a-zA-Z0-9_]+)?)\.(eq|ilike)\.(.*)$/);
    if (!match) {
      throw new Error(`Unsupported or malformed .or() filter clause: "${part}"`);
    }

    const [, fieldExpr, op, rawVal] = match;
    const colExpr = resolveSafeColumnExpr(fieldExpr);
    const val =
      rawVal.length >= 2 &&
      ((rawVal.startsWith('"') && rawVal.endsWith('"')) ||
        (rawVal.startsWith("'") && rawVal.endsWith("'")))
        ? rawVal.slice(1, -1)
        : rawVal;

    if (op === 'eq') {
      sqlParts.push(`${colExpr} = $PARAM`);
      values.push(val);
    } else if (op === 'ilike') {
      sqlParts.push(`LOWER(COALESCE(${colExpr}, '')) = LOWER($PARAM)`);
      values.push(val);
    } else {
      throw new Error(`Unsupported .or() operator: "${op}"`);
    }
  }

  return { sqlParts, values };
}
