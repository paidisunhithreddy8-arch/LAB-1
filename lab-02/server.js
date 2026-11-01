const path = require("node:path");
const express = require("express");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const PORT = Number(process.env.PORT) || 3001;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "books.db");
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

const INSERT_BOOK_SQL = "INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?)";

async function initializeDatabase(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS book (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      price INTEGER NOT NULL CHECK (price >= 0),
      pages INTEGER NOT NULL CHECK (pages > 0)
    )
  `);

  // Lock the empty-table check and inserts together so concurrent startups
  // cannot seed the same database twice.
  await db.exec("BEGIN IMMEDIATE");
  try {
    const { count } = await db.get("SELECT COUNT(*) AS count FROM book");
    if (count === 0) {
      for (const book of SAMPLE_BOOKS) {
        await db.run(INSERT_BOOK_SQL, book);
      }
    }
    await db.exec("COMMIT");
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}

function createApp(db) {
  const app = express();
  app.use(express.json());

  app.get("/books/", async (_req, res, next) => {
    try {
      const books = await db.all("SELECT * FROM book ORDER BY id");
      res.status(200).json(books);
    } catch (error) {
      next(error);
    }
  });

  app.get("/books/:bookId/", async (req, res, next) => {
    const bookId = parseBookId(req.params.bookId, res);
    if (bookId === null) return;
    try {
      const book = await db.get("SELECT * FROM book WHERE id = ?", [bookId]);
      if (!book) return res.status(404).json({ error: "Book not found" });
      res.status(200).json(book);
    } catch (error) {
      next(error);
    }
  });

  app.post("/books/", async (req, res, next) => {
    const input = validateBook(req.body);
    if (input.error) return res.status(400).json({ error: input.error });
    try {
      const result = await db.run(
        "INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?)",
        [input.book.title, input.book.author, input.book.price, input.book.pages]
      );
      const createdBook = await db.get("SELECT * FROM book WHERE id = ?", [result.lastID]);
      res.status(201).json(createdBook);
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
      const result = await db.run(
        "UPDATE book SET title = ?, author = ?, price = ?, pages = ? WHERE id = ?",
        [input.book.title, input.book.author, input.book.price, input.book.pages, bookId]
      );
      if (result.changes === 0) return res.status(404).json({ error: "Book not found" });
      const updatedBook = await db.get("SELECT * FROM book WHERE id = ?", [bookId]);
      res.status(200).json(updatedBook);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/books/:bookId/", async (req, res, next) => {
    const bookId = parseBookId(req.params.bookId, res);
    if (bookId === null) return;
    try {
      const result = await db.run("DELETE FROM book WHERE id = ?", [bookId]);
      if (result.changes === 0) return res.status(404).json({ error: "Book not found" });
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
  let db;
  try {
    db = await open({ filename: DB_PATH, driver: sqlite3.Database });
    await initializeDatabase(db);
    const app = createApp(db);
    const server = app.listen(PORT, () => {
      console.log(`Lab 2 API listening at http://localhost:${PORT}`);
      console.log(`SQLite database: ${DB_PATH}`);
    });
    return { app, db, server };
  } catch (error) {
    if (db) await db.close().catch(() => {});
    console.error("Could not open or initialize the SQLite database:", error.message);
    process.exitCode = 1;
    throw error;
  }
}

if (require.main === module) {
  initializeDBAndServer().catch(() => {});
}

module.exports = { createApp, initializeDatabase, initializeDBAndServer, validateBook };
