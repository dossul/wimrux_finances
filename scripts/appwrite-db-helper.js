/**
 * Appwrite DB Helper — mimics @insforge/sdk chainable interface
 * Uses Appwrite REST API directly (no external deps, works in Node-18 edge functions)
 */

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || "https://appwrite.benga.live/v1";
const APPWRITE_PROJECT  = process.env.APPWRITE_PROJECT || "";
const APPWRITE_DATABASE = process.env.APPWRITE_DATABASE || "wimrux_finances";

class AppwriteQueryBuilder {
  constructor(endpoint, project, apiKey, databaseId, collectionId) {
    this.endpoint = endpoint;
    this.project = project;
    this.apiKey = apiKey;
    this.database = databaseId;
    this.collection = collectionId;
    this._select = [];
    this._eq = [];
    this._order = null;
    this._limit = null;
    this._single = false;
    this._body = null;
  }

  select(...cols) {
    this._select = cols;
    return this;
  }

  eq(field, value) {
    this._eq.push({ field, value });
    return this;
  }

  order(column, direction = "asc") {
    this._order = { column, direction };
    return this;
  }

  limit(n) {
    this._limit = n;
    return this;
  }

  single() {
    this._single = true;
    return this;
  }

  _buildQueries() {
    const qs = [];
    if (this._select.length) {
      qs.push(`Query.select(${JSON.stringify(this._select)})`);
    }
    for (const { field, value } of this._eq) {
      qs.push(`Query.equal("${field}", [${JSON.stringify(value)}])`);
    }
    if (this._order) {
      qs.push(`Query.order${this._order.direction === "desc" ? "Desc" : "Asc"}("${this._order.column}")`);
    }
    if (this._limit) {
      qs.push(`Query.limit(${this._limit})`);
    }
    return qs;
  }

  async _request(method, path, body) {
    const url = new URL(this.endpoint + path);
    if (method === "GET" && this._eq.length) {
      this._buildQueries().forEach((q, i) => url.searchParams.set(`queries[${i}]`, q));
    }
    const opts = {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Appwrite-Project": this.project,
        "X-Appwrite-Key": this.apiKey,
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url.toString(), opts);
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) {
      return { data: null, error: data };
    }
    return { data, error: null };
  }

  async single() {
    this._single = true;
    const { data, error } = await this._request("GET", `/databases/${this.database}/collections/${this.collection}/documents`);
    if (error) return { data: null, error };
    const docs = data.documents || [];
    return { data: docs[0] || null, error: null };
  }

  async get() {
    if (this._single) return this.single();
    const { data, error } = await this._request("GET", `/databases/${this.database}/collections/${this.collection}/documents`);
    if (error) return { data: null, error };
    return { data: data.documents || [], error: null };
  }

  async update(body) {
    // Need document ID from previous eq
    const { data: docs } = await this.get();
    if (!docs || !docs.length) return { data: null, error: { message: "Not found" } };
    const docId = docs[0].$id;
    const res = await this._request("PATCH", `/databases/${this.database}/collections/${this.collection}/documents/${docId}`, { data: body });
    return res;
  }

  async insert(rows) {
    const results = [];
    for (const row of rows) {
      const res = await this._request("POST", `/databases/${this.database}/collections/${this.collection}/documents`, {
        documentId: "unique()",
        data: row,
      });
      if (res.error) return { data: null, error: res.error };
      results.push(res.data);
    }
    return { data: results, error: null };
  }
}

class AppwriteDB {
  constructor(endpoint, project, apiKey, databaseId) {
    this.endpoint = endpoint;
    this.project = project;
    this.apiKey = apiKey;
    this.database = databaseId;
  }
  from(collectionId) {
    return new AppwriteQueryBuilder(this.endpoint, this.project, this.apiKey, this.database, collectionId);
  }
}

function createAdminClient(apiKey) {
  return {
    database: new AppwriteDB(APPWRITE_ENDPOINT, APPWRITE_PROJECT, apiKey, APPWRITE_DATABASE),
  };
}

function createClient(apiKey) {
  return createAdminClient(apiKey);
}

module.exports = { createAdminClient, createClient, AppwriteDB };
