/**
 * Appwrite Database Adapter
 * Mirrors the Appwrite SDK API pattern for easier migration
 */

import { databases, functions, DATABASE_ID } from 'src/boot/appwrite';
import { Query } from 'appwrite';

// queryOr: SDK 13.0.2 n'a pas Query.or(). On construit la string manuellement
// Format Appwrite: or([equal("field", ["val1"]), equal("field", ["val2"])])
function queryOr(queries: string[]): string | null {
  if (queries.length === 0) return null;
  if (queries.length === 1) return queries[0]!;
  // Chaque query a le format: method("key", ["val"]) — on les enveloppe dans or([...])
  return `or([${queries.join(',')}])`;
}

// Appwrite retourne $createdAt / $updatedAt / $id (système).
// L'application legacy s'attend à created_at / updated_at / id.
function normalizeAppwriteDoc(doc: any): any {
  if (!doc || typeof doc !== 'object') return doc;
  const normalized = { ...doc };
  if (doc.$id !== undefined && !normalized.id) normalized.id = doc.$id;
  if (doc.$createdAt !== undefined && !normalized.created_at) normalized.created_at = doc.$createdAt;
  if (doc.$updatedAt !== undefined && !normalized.updated_at) normalized.updated_at = doc.$updatedAt;
  return normalized;
}

export type DbResult<T = any> = { data: T | null; error: Error | null };

export interface DbQueryBuilder extends PromiseLike<DbResult<any[]>> {
  select: (columns?: string) => DbQueryBuilder;
  insert: (data: Record<string, any> | Record<string, any>[]) => Promise<DbResult>;
  update: (id: string, data: Record<string, any>) => Promise<DbResult>;
  updateWhere: (data: Record<string, any>) => DbQueryBuilder;
  upsert: (data: Record<string, any>) => Promise<DbResult>;
  delete: () => DbQueryBuilder;
  eq: (column: string, value: any) => DbQueryBuilder;
  neq: (column: string, value: any) => DbQueryBuilder;
  gt: (column: string, value: any) => DbQueryBuilder;
  gte: (column: string, value: any) => DbQueryBuilder;
  lt: (column: string, value: any) => DbQueryBuilder;
  lte: (column: string, value: any) => DbQueryBuilder;
  like: (column: string, value: string) => DbQueryBuilder;
  ilike: (column: string, value: string) => DbQueryBuilder;
  is: (column: string, value: any) => DbQueryBuilder;
  in: (column: string, values: any[]) => DbQueryBuilder;
  contains: (column: string, value: any) => DbQueryBuilder;
  containedBy: (column: string, value: any) => DbQueryBuilder;
  rangeGt: (column: string, range: string) => DbQueryBuilder;
  rangeGte: (column: string, range: string) => DbQueryBuilder;
  rangeLt: (column: string, range: string) => DbQueryBuilder;
  rangeLte: (column: string, range: string) => DbQueryBuilder;
  rangeAdjacent: (column: string, range: string) => DbQueryBuilder;
  overlaps: (column: string, value: any) => DbQueryBuilder;
  textSearch: (column: string, query: string) => DbQueryBuilder;
  match: (query: Record<string, any>) => DbQueryBuilder;
  not: (column: string, operator: string, value: any) => DbQueryBuilder;
  or: (filters: string[]) => DbQueryBuilder;
  and: (filters: string[]) => DbQueryBuilder;
  filter: (column: string, operator: string, value: any) => DbQueryBuilder;
  order: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) => DbQueryBuilder;
  limit: (count: number) => DbQueryBuilder;
  single: () => Promise<DbResult>;
  maybeSingle: () => Promise<DbResult>;
  csv: () => Promise<string>;
  query: (queries: string[]) => DbQueryBuilder;
}

class AppwriteQueryBuilder implements DbQueryBuilder {
  private collectionId: string;
  private queries: string[] = [];
  private orderBy: { column: string; direction: string }[] = [];
  private limitCount?: number;
  private singleMode = false;
  private maybeSingleMode = false;
  private deleteMode = false;
  private updateMode = false;
  private updatePayload: Record<string, any> | null = null;

  constructor(collectionId: string) {
    this.collectionId = collectionId;
  }

  // Thenable: allows `await builder` without calling .select()
  then<TResult1 = DbResult<any[]>, TResult2 = never>(
    onfulfilled?: ((value: DbResult<any[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this._execute().then(onfulfilled as any, onrejected as any);
  }

  // Comparison filters
  eq(column: string, value: any): DbQueryBuilder {
    this.queries.push(Query.equal(column, value));
    return this;
  }

  neq(column: string, value: any): DbQueryBuilder {
    this.queries.push(Query.notEqual(column, value));
    return this;
  }

  gt(column: string, value: any): DbQueryBuilder {
    this.queries.push(Query.greaterThan(column, value));
    return this;
  }

  gte(column: string, value: any): DbQueryBuilder {
    this.queries.push(Query.greaterThanEqual(column, value));
    return this;
  }

  lt(column: string, value: any): DbQueryBuilder {
    this.queries.push(Query.lessThan(column, value));
    return this;
  }

  lte(column: string, value: any): DbQueryBuilder {
    this.queries.push(Query.lessThanEqual(column, value));
    return this;
  }

  like(column: string, value: string): DbQueryBuilder {
    // Appwrite uses search for partial matching
    this.queries.push(Query.search(column, value));
    return this;
  }

  ilike(column: string, value: string): DbQueryBuilder {
    // Case-insensitive search
    this.queries.push(Query.search(column, value.toLowerCase()));
    return this;
  }

  is(column: string, value: any): DbQueryBuilder {
    if (value === null) {
      this.queries.push(Query.isNull(column));
    } else {
      this.queries.push(Query.equal(column, value));
    }
    return this;
  }

  in(column: string, values: any[]): DbQueryBuilder {
    if (values.length === 0) {
      // empty IN list should match nothing
      this.queries.push(Query.equal(column, '__empty_in_list__'));
      return this;
    }
    // Appwrite .equal() accepts an array for IN semantics
    this.queries.push(Query.equal(column, values));
    return this;
  }

  contains(column: string, value: any): DbQueryBuilder {
    // For array contains
    this.queries.push(Query.search(column, value));
    return this;
  }

  containedBy(column: string, value: any): DbQueryBuilder {
    // Appwrite doesn't have direct equivalent, use search
    this.queries.push(Query.search(column, JSON.stringify(value)));
    return this;
  }

  // Range operations (simplified for Appwrite)
  rangeGt(column: string, range: string): DbQueryBuilder {
    return this.gt(column, range);
  }

  rangeGte(column: string, range: string): DbQueryBuilder {
    return this.gte(column, range);
  }

  rangeLt(column: string, range: string): DbQueryBuilder {
    return this.lt(column, range);
  }

  rangeLte(column: string, range: string): DbQueryBuilder {
    return this.lte(column, range);
  }

  rangeAdjacent(column: string, range: string): DbQueryBuilder {
    return this;
  }

  overlaps(column: string, value: any): DbQueryBuilder {
    return this;
  }

  textSearch(column: string, query: string): DbQueryBuilder {
    this.queries.push(Query.search(column, query));
    return this;
  }

  match(query: Record<string, any>): DbQueryBuilder {
    Object.entries(query).forEach(([key, value]) => {
      this.queries.push(Query.equal(key, value));
    });
    return this;
  }

  not(column: string, operator: string, value: any): DbQueryBuilder {
    // Simplified - Appwrite doesn't have complex NOT queries
    return this;
  }

  or(filters: string[]): DbQueryBuilder {
    const validFilters = filters.filter((f): f is string => !!f);
    if (validFilters.length === 0) return this;
    const orQuery = queryOr(validFilters);
    if (orQuery) this.queries.push(orQuery);
    return this;
  }

  and(filters: string[]): DbQueryBuilder {
    // Appwrite ANDs by default with multiple queries
    this.queries.push(...filters);
    return this;
  }

  filter(column: string, operator: string, value: any): DbQueryBuilder {
    // Generic filter handler
    switch (operator) {
      case 'eq': return this.eq(column, value);
      case 'neq': return this.neq(column, value);
      case 'gt': return this.gt(column, value);
      case 'gte': return this.gte(column, value);
      case 'lt': return this.lt(column, value);
      case 'lte': return this.lte(column, value);
      case 'like': return this.like(column, value);
      case 'ilike': return this.ilike(column, value);
      default: return this.eq(column, value);
    }
  }

  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): DbQueryBuilder {
    const direction = options?.ascending !== false ? 'ASC' : 'DESC';
    const columns = column.split(',').map((c) => c.trim()).filter(Boolean);
    for (const col of columns) {
      this.orderBy.push({ column: col, direction });
    }
    return this;
  }

  limit(count: number): DbQueryBuilder {
    this.limitCount = count;
    return this;
  }

  single(): Promise<DbResult> {
    this.singleMode = true;
    this.limitCount = 1;
    return this._execute();
  }

  maybeSingle(): Promise<DbResult> {
    this.maybeSingleMode = true;
    this.limitCount = 1;
    return this._execute();
  }

  // select() is now chainable — just marks columns preference and returns this
  select(_columns?: string): DbQueryBuilder {
    return this;
  }

  // Internal executor
  private async _execute(): Promise<DbResult<any[]>> {
    try {
      if (this.deleteMode) {
        const queries = this._buildQueries();
        const response = await databases.listDocuments(DATABASE_ID, this.collectionId, queries);
        for (const doc of response.documents) {
          await databases.deleteDocument(DATABASE_ID, this.collectionId, doc.$id);
        }
        return { data: null, error: null };
      }

      if (this.updateMode && this.updatePayload) {
        const queries = this._buildQueries();
        const response = await databases.listDocuments(DATABASE_ID, this.collectionId, queries);
        for (const doc of response.documents) {
          await databases.updateDocument(DATABASE_ID, this.collectionId, doc.$id, this.updatePayload!);
        }
        return { data: null, error: null };
      }

      const queries = this._buildQueries();
      const response = await databases.listDocuments(DATABASE_ID, this.collectionId, queries);
      let data: any = response.documents.map(normalizeAppwriteDoc);

      if (this.singleMode || this.maybeSingleMode) {
        data = data.length > 0 ? data[0] : null;
      }

      return { data, error: null };
    } catch (error) {
      console.error(`[Appwrite DB] Error on ${this.collectionId}:`, error);
      return { data: null, error: error as Error };
    }
  }

  private _buildQueries(): string[] {
    const queries = [...this.queries];
    if (this.limitCount) queries.push(Query.limit(this.limitCount));
    if (this.orderBy.length) {
      for (const o of this.orderBy) {
        if (o.direction === 'DESC') queries.push(Query.orderDesc(o.column));
        else queries.push(Query.orderAsc(o.column));
      }
    }
    return queries;
  }

  async insert(data: Record<string, any> | Record<string, any>[]): Promise<{ data: any | null; error: Error | null }> {
    try {
      if (Array.isArray(data)) {
        // Appwrite doesn't support bulk insert, insert one by one
        const results = [];
        for (const item of data) {
          const documentId = item.id && item.id !== 'unique()' ? item.id : crypto.randomUUID();
          const payload = { ...item, id: documentId };
          const response = await databases.createDocument(
            DATABASE_ID,
            this.collectionId,
            documentId,
            payload
          );
          results.push(normalizeAppwriteDoc(response));
        }
        return { data: results, error: null };
      } else {
        const documentId = data.id && data.id !== 'unique()' ? data.id : crypto.randomUUID();
        const payload = { ...data, id: documentId };
        const response = await databases.createDocument(
          DATABASE_ID,
          this.collectionId,
          documentId,
          payload
        );
        return { data: normalizeAppwriteDoc(response), error: null };
      }
    } catch (error) {
      console.error(`[Appwrite DB] Error inserting into ${this.collectionId}:`, error);
      return { data: null, error: error as Error };
    }
  }

  update(id: string, data: Record<string, any>): Promise<DbResult> {
    return databases.updateDocument(DATABASE_ID, this.collectionId, id, data)
      .then((r) => ({ data: normalizeAppwriteDoc(r), error: null }))
      .catch((e: Error) => { console.error(`[Appwrite DB] update ${this.collectionId}:`, e); return { data: null, error: e as Error }; });
  }

  updateWhere(data: Record<string, any>): DbQueryBuilder {
    this.updatePayload = data;
    this.updateMode = true;
    return this;
  }

  async upsert(data: Record<string, any>): Promise<{ data: any | null; error: Error | null }> {
    try {
      if (data.id) {
        // Try update first
        try {
          const existing = await databases.getDocument(DATABASE_ID, this.collectionId, data.id);
          if (existing) {
            return this.update(data.id, data);
          }
        } catch {
          // Document doesn't exist, create it
        }
      }
      // Create new
      return this.insert(data);
    } catch (error) {
      console.error(`[Appwrite DB] Error upserting into ${this.collectionId}:`, error);
      return { data: null, error: error as Error };
    }
  }

  // delete() is chainable — actual execution via then()/await
  delete(): DbQueryBuilder {
    this.deleteMode = true;
    return this;
  }

  query(queries: string[]): DbQueryBuilder {
    this.queries = [...this.queries, ...queries];
    return this;
  }

  async csv(): Promise<string> {
    // Not natively supported in Appwrite
    console.warn('[Appwrite DB] CSV export not natively supported');
    return '';
  }
}

// Main database interface matching Appwrite pattern
export const appwriteDb = {
  from: (collectionId: string): DbQueryBuilder => {
    return new AppwriteQueryBuilder(collectionId);
  },

  // Additional direct methods
  async getById(collectionId: string, id: string): Promise<{ data: any | null; error: Error | null }> {
    try {
      const response = await databases.getDocument(DATABASE_ID, collectionId, id);
      return { data: normalizeAppwriteDoc(response), error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async deleteById(collectionId: string, id: string): Promise<{ data: any | null; error: Error | null }> {
    try {
      await databases.deleteDocument(DATABASE_ID, collectionId, id);
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  /**
   * rpc() — Invoque une Appwrite Function par son nom.
   * Mapping : nom_fonction_sql -> nom-fonction-appwrite
   * Ex: 'next_invoice_reference' -> fonction 'generate-invoice-ref'
   */
  async rpc(functionName: string, params?: Record<string, any>): Promise<{ data: any | null; error: Error | null }> {
    // Map SQL function names to Appwrite Function IDs
    const FUNCTION_MAP: Record<string, string> = {
      'next_invoice_reference': 'generate-invoice-ref',
      'generate_invoice_reference': 'generate-invoice-ref',
    };
    const appwriteFunctionId = FUNCTION_MAP[functionName] ?? functionName.replace(/_/g, '-');
    try {
      const execution = await functions.createExecution(
        appwriteFunctionId,
        params ? JSON.stringify(params) : undefined,
        false, // synchrone
      );
      let data: any = execution.responseBody;
      try { data = JSON.parse(execution.responseBody); } catch { /* garde raw */ }
      if (execution.responseStatusCode >= 400) {
        throw new Error(`Function ${appwriteFunctionId} returned ${execution.responseStatusCode}: ${execution.responseBody}`);
      }
      return { data, error: null };
    } catch (error) {
      console.error(`[Appwrite DB] rpc(${functionName}) error:`, error);
      return { data: null, error: error as Error };
    }
  }

};

export default appwriteDb;
