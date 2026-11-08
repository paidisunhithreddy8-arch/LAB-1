/**
 * Lab 3 — Books REST API
 * Node.js + Express + PostgreSQL
 *
 * Endpoints
 *   GET    /books          List books (search, sort, paginate, price-filter)
 *   POST   /books          Create a book
 *   PUT    /books/:id      Update a book
 *   DELETE /books/:id      Delete a book
 *
 * Debugging exercises completed (see README.md § Debugging Exercises):
 *   1. EADDRINUSE port conflict      — fixed: use process.env.PORT || 3002
 *   2. Wrong import path             — fixed: require('pg'), not require('./pg')
 *   3. Table-name typo               — fixed: table is 'book', not 'books'
 *   4. Missing await                 — fixed: await every pool.query() call
 */

"use strict";

require("dotenv").config();

const express = require("express");   // Bug 2 fix: was require("./pg") — wrong path
const { Pool } = require("pg");

const PORT = Number(process.env.PORT) || 3002;  // Bug 1 fix: was hardcoded 3002 causing EADDRINUSE

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const SAMPLE_BOOKS = [
  ["The Alchemist",       "Paulo Coelho",                        399, 208],
  ["Wings of Fire",       "A. P. J. Abdul Kalam",                250, 180],
  ["Atomic Habits",       "James Clear",                         499, 320],
  ["The Hobbit",          "J. R. R. Tolkien",                    450, 310],
  ["Pride and Prejudice", "Jane Austen",                         299, 432],
  ["1984",                "George Orwell",                       350, 328],
  ["The Blue Umbrella",   "Ruskin Bond",                         199, 120],
  ["Ikigai",              "Hector Garcia and Francesc Miralles", 399, 208],
  ["Clean Code",          "Robert C. Martin",                    799, 464],
  ["The Little Prince",   "Antoine de Saint-Exupery",            275,  96],
];

// ---------------------------------------------------------------------------
// SQL constants
// ---------------------------------------------------------------------------

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS book (
    id     SERIAL PRIMARY KEY,
    title  TEXT    NOT NULL,
    author TEXT    NOT NULL,
    price  INTEGER NOT NULL CHECK (price >= 0),
    pages  INTEGER NOT NULL CHECK (pages > 0)
  )
`;

const INSERT_BOOK_SQL =
  "INSERT INTO book (title, author, price, pages) VALUES ($1, $2, $3, $4)";

// ---------------------------------------------------------------------------
// Allowed query-parameter values (used to validate before interpolating into SQL)
// ---------------------------------------------------------------------------

const ALLOWED_ORDER_BY = new Set(["id", "title", "author", "price", "pages"]);
const ALLOWED_ORDER    = new Set(["asc", "desc"]);

// ---------------------------------------------------------------------------
// Database initialisation
// ---------------------------------------------------------------------------

async function initializeDatabase(pool) {
  await pool.query(CREATE_TABLE_SQL);
  await seedBooksIfEmpty(pool);
}

async function seedBooksIfEmpty(pool) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query("SELECT COUNT(*) AS count FROM book");
    if (Number(rows[0].count) === 0) {
      for (const book of SAMPLE_BOOKS) {
        await client.query(INSERT_BOOK_SQL, book);
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Query builder for GET /books
// Builds a parameterised PostgreSQL query from the validated query-string.
// Column names (order_by) are validated against an allowlist before being
// interpolated — user-supplied values are always bound as $N parameters.
// ---------------------------------------------------------------------------

function buildGetBooksQuery(queryParams) {
  const {
    search_q,
    order_by = "id",
    order    = "asc",
    limit    = "10",
    offset   = "0",
    min_price,
    max_price,
  } = queryParams;

  const normalizedOrderBy = typeof order_by === "string" ? order_by.toLowerCase() : order_by;
  const normalizedOrder   = typeof order === "string" ? order.toLowerCase() : order;

  // Validate sort field and direction
  if (!ALLOWED_ORDER_BY.has(normalizedOrderBy)) {
    return { error: `order_by must be one of: ${[...ALLOWED_ORDER_BY].join(", ")}` };
  }
  if (!ALLOWED_ORDER.has(normalizedOrder)) {
    return { error: "order must be asc or desc" };
  }

  // Validate pagination
  const limitNum  = Number(limit);
  const offsetNum = Number(offset);
  if (!Number.isInteger(limitNum)  || limitNum <= 0) {
    return { error: "limit must be a positive integer" };
  }
  if (!Number.isInteger(offsetNum) || offsetNum < 0) {
    return { error: "offset must be a non-negative integer" };
  }

  const params     = [];
  const conditions = [];

  // Search: duplicate the pattern so each column gets its own unique $N index
  if (search_q !== undefined) {
    const pattern = `%${search_q}%`;
    params.push(pattern);
    const titleIdx = params.length;
    params.push(pattern);
    const authorIdx = params.length;
    conditions.push(`(title ILIKE $${titleIdx} OR author ILIKE $${authorIdx})`);
  }

  // Price range
  if (min_price !== undefined) {
    const minP = Number(min_price);
    if (!Number.isInteger(minP) || minP < 0) {
      return { error: "min_price must be a non-negative integer" };
    }
    params.push(minP);
    conditions.push(`price >= $${params.length}`);
  }

  if (max_price !== undefined) {
    const maxP = Number(max_price);
    if (!Number.isInteger(maxP) || maxP < 0) {
      return { error: "max_price must be a non-negative integer" };
    }
    if (min_price !== undefined && maxP < Number(min_price)) {
      return { error: "max_price must be greater than or equal to min_price" };
    }
    params.push(maxP);
    conditions.push(`price <= $${params.length}`);
  }

  // Pagination params
  params.push(limitNum);
  const limitIdx = params.length;
  params.push(offsetNum);
  const offsetIdx = params.length;

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  // order_by is validated against ALLOWED_ORDER_BY above — safe to interpolate
  const sql =
    `SELECT * FROM book ${whereClause} ` +   // Bug 3 fix: was 'books' (no such table)
    `ORDER BY ${normalizedOrderBy} ${normalizedOrder.toUpperCase()} ` +
    `LIMIT $${limitIdx} OFFSET $${offsetIdx}`;

  return { sql, params };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parses and validates a route parameter that must be a positive integer.
 * Sends a 400 response and returns null on failure.
 */
function parseBookId(value, res) {
  if (!/^\d+$/.test(value) || Number(value) < 1 || !Number.isSafeInteger(Number(value))) {
    res.status(400).json({ error: "id must be a positive integer" });
    return null;
  }
  return Number(value);
}

/**
 * Validates a POST / PUT request body.
 * Returns { book } on success or { error } on failure.
 */
function validateBook(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be a JSON object" };
  }
  const { title, author, price, pages } = body;
  if (typeof title  !== "string" || !title.trim())   return { error: "title is required" };
  if (typeof author !== "string" || !author.trim())  return { error: "author is required" };
  if (!Number.isInteger(price) || price < 0)         return { error: "price must be a non-negative integer" };
  if (!Number.isInteger(pages) || pages < 1)         return { error: "pages must be a positive integer" };
  return { book: { title: title.trim(), author: author.trim(), price, pages } };
}

// ---------------------------------------------------------------------------
// Express application factory
// Accepts a pg Pool so tests can inject an in-memory database.
// ---------------------------------------------------------------------------

function createApp(pool) {
  const app = express();
  app.use(express.json());

  // GET /books — list, search, sort, paginate, filter
  app.get("/books", async (req, res, next) => {
    const result = buildGetBooksQuery(req.query);
    if (result.error) return res.status(400).json({ error: result.error });
    try {
      const { rows } = await pool.query(result.sql, result.params);  // Bug 4 fix: was missing await
      res.status(200).json(rows);
    } catch (error) {
      next(error);
    }
  });

  // POST /books — create a book
  app.post("/books", async (req, res, next) => {
    const input = validateBook(req.body);
    if (input.error) return res.status(400).json({ error: input.error });
    try {
      const { rows } = await pool.query(
        `${INSERT_BOOK_SQL} RETURNING *`,
        [input.book.title, input.book.author, input.book.price, input.book.pages]
      );
      res.status(201).json(rows[0]);
    } catch (error) {
      next(error);
    }
  });

  // PUT /books/:id — update a book
  app.put("/books/:id", async (req, res, next) => {
    const id = parseBookId(req.params.id, res);
    if (id === null) return;
    const input = validateBook(req.body);
    if (input.error) return res.status(400).json({ error: input.error });
    try {
      const { rows } = await pool.query(
        "UPDATE book SET title = $1, author = $2, price = $3, pages = $4 WHERE id = $5 RETURNING *",
        [input.book.title, input.book.author, input.book.price, input.book.pages, id]
      );
      if (!rows[0]) return res.status(404).json({ error: "Book not found" });
      res.status(200).json(rows[0]);
    } catch (error) {
      next(error);
    }
  });

  // DELETE /books/:id — delete a book
  app.delete("/books/:id", async (req, res, next) => {
    const id = parseBookId(req.params.id, res);
    if (id === null) return;
    try {
      const { rows } = await pool.query(
        "DELETE FROM book WHERE id = $1 RETURNING id",
        [id]
      );
      if (!rows[0]) return res.status(404).json({ error: "Book not found" });
      res.status(200).json({ message: "Book deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // 404 fallback — must be after all routes
  app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" });
  });

  // 500 error handler — 4-argument signature required by Express
  app.use((error, _req, res, _next) => {
    const isBadJson = error instanceof SyntaxError && error.status === 400;
    if (!isBadJson) console.error("Unhandled request error:", error);
    res
      .status(isBadJson ? 400 : 500)
      .json({ error: isBadJson ? "Invalid JSON request body" : "Internal server error" });
  });

  return app;
}

// ---------------------------------------------------------------------------
// Server startup (skipped when imported by tests)
// ---------------------------------------------------------------------------

async function initializeDBAndServer() {
  if (!process.env.DATABASE_URL) {
    const error = new Error("DATABASE_URL must be set before starting the server");
    console.error(error.message);
    process.exitCode = 1;
    throw error;
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await initializeDatabase(pool);
    const app    = createApp(pool);
    const server = app.listen(PORT, () => {
      console.log(`Lab 3 Books API listening at http://localhost:${PORT}`);
      console.log("Connected to the PostgreSQL database configured by DATABASE_URL");
    });
    return { app, pool, server };
  } catch (error) {
    await pool.end().catch(() => {});
    console.error("Could not connect to or initialise the PostgreSQL database:", error.message);
    process.exitCode = 1;
    throw error;
  }
}

if (require.main === module) {
  initializeDBAndServer().catch(() => {});
}

module.exports = {
  createApp,
  initializeDatabase,
  initializeDBAndServer,
  seedBooksIfEmpty,
  validateBook,
};
