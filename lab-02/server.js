const express = require("express");
const { Pool } = require("pg");

const PORT = Number(process.env.PORT) || 3001;
const SAMPLE_BOOKS = [
  ["The Alchemist", "Paulo Coelho", 399, 208],
  ["Wings of Fire", "A. P. J. Abdul Kalam", 250, 180],
  ["Atomic Habits", "James Clear", 499, 320],
  ["The Hobbit", "J. R. R. Tolkien", 450, 310],
  ["Pride and Prejudice", "Jane Austen", 299, 432],
  ["1984", "George Orwell", 350, 328],
  ["The Blue Umbrella", "Ruskin Bond", 199, 120],
  ["Ikigai", "Hector Garcia and Francesc Miralles", 399, 208],
  ["Clean Code", "Robert C. Martin", 799, 464],
  ["The Little Prince", "Antoine de Saint-Exupery", 275, 96],
];

const CREATE_BOOK_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS book (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    price INTEGER NOT NULL CHECK (price >= 0),
    pages INTEGER NOT NULL CHECK (pages > 0)
  )
`;
const INSERT_BOOK_SQL = "INSERT INTO book (title, author, price, pages) VALUES ($1, $2, $3, $4)";

async function initializeDatabase(pool) {
  await pool.query(CREATE_BOOK_TABLE_SQL);
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

function createApp(pool) {
  const app = express();
  app.use(express.json());

  app.get("/books/", async (_req, res, next) => {
    try {
      const { rows } = await pool.query("SELECT * FROM book ORDER BY id");
      res.status(200).json(rows);
    } catch (error) {
      next(error);
    }
  });

  app.get("/books/:bookId/", async (req, res, next) => {
    const bookId = parseBookId(req.params.bookId, res);
    if (bookId === null) return;
    try {
      const { rows } = await pool.query("SELECT * FROM book WHERE id = $1", [bookId]);
      if (!rows[0]) return res.status(404).json({ error: "Book not found" });
      res.status(200).json(rows[0]);
    } catch (error) {
      next(error);
    }
  });

  app.post("/books/", async (req, res, next) => {
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

  app.put("/books/:bookId/", async (req, res, next) => {
    const bookId = parseBookId(req.params.bookId, res);
    if (bookId === null) return;
    const input = validateBook(req.body);
    if (input.error) return res.status(400).json({ error: input.error });
    try {
      const { rows } = await pool.query(
        "UPDATE book SET title = $1, author = $2, price = $3, pages = $4 WHERE id = $5 RETURNING *",
        [input.book.title, input.book.author, input.book.price, input.book.pages, bookId]
      );
      if (!rows[0]) return res.status(404).json({ error: "Book not found" });
      res.status(200).json(rows[0]);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/books/:bookId/", async (req, res, next) => {
    const bookId = parseBookId(req.params.bookId, res);
    if (bookId === null) return;
    try {
      const { rows } = await pool.query("DELETE FROM book WHERE id = $1 RETURNING id", [bookId]);
      if (!rows[0]) return res.status(404).json({ error: "Book not found" });
      res.status(200).json({ message: "Book deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  app.use((error, _req, res, _next) => {
    const status = error instanceof SyntaxError && error.status === 400 ? 400 : 500;
    if (status !== 400) console.error("Request failed:", error);
    res.status(status).json({ error: status === 400 ? "Invalid JSON request body" : "Internal server error" });
  });
  return app;
}

function parseBookId(value, res) {
  if (!/^\d+$/.test(value) || Number(value) < 1 || !Number.isSafeInteger(Number(value))) {
    res.status(400).json({ error: "bookId must be a positive integer" });
    return null;
  }
  return Number(value);
}

function validateBook(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be a JSON object" };
  }
  const { title, author, price, pages } = body;
  if (typeof title !== "string" || !title.trim()) return { error: "title is required" };
  if (typeof author !== "string" || !author.trim()) return { error: "author is required" };
  if (!Number.isInteger(price) || price < 0) return { error: "price must be a non-negative integer" };
  if (!Number.isInteger(pages) || pages < 1) return { error: "pages must be a positive integer" };
  return { book: { title: title.trim(), author: author.trim(), price, pages } };
}

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
    const app = createApp(pool);
    const server = app.listen(PORT, () => {
      console.log(`Lab 2 API listening at http://localhost:${PORT}`);
      console.log("Connected to the PostgreSQL database configured by DATABASE_URL");
    });
    return { app, pool, server };
  } catch (error) {
    await pool.end().catch(() => {});
    console.error("Could not connect to or initialize the PostgreSQL database:", error.message);
    process.exitCode = 1;
    throw error;
  }
}

if (require.main === module) {
  initializeDBAndServer().catch(() => {});
}

module.exports = { createApp, initializeDatabase, initializeDBAndServer, seedBooksIfEmpty, validateBook };
