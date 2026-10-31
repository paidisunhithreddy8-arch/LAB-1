const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const request = require("supertest");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const { createApp } = require("../server");

let db;
let client;

before(async () => {
  db = await open({ filename: ":memory:", driver: sqlite3.Database });
  await db.exec(`CREATE TABLE book (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    price INTEGER NOT NULL CHECK (price >= 0),
    pages INTEGER NOT NULL CHECK (pages > 0)
  )`);
  await db.run("INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?)", ["Test Book", "Test Author", 350, 200]);
  client = request(createApp(db));
});

after(async () => db.close());

test("GET /books/ lists books", async () => {
  const response = await client.get("/books/");
  assert.equal(response.status, 200);
  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].title, "Test Book");
});

test("GET /books/:bookId/ finds one book and handles invalid or missing IDs", async () => {
  assert.equal((await client.get("/books/1/")).status, 200);
  assert.equal((await client.get("/books/nope/")).status, 400);
  assert.equal((await client.get("/books/999/")).status, 404);
});

test("POST /books/ validates and inserts a book", async () => {
  const created = await client.post("/books/").send({ title: "New Book", author: "Writer", price: 200, pages: 140 });
  assert.equal(created.status, 201);
  assert.equal(created.body.title, "New Book");
  assert.equal((await client.post("/books/").send({ title: "Missing fields" })).status, 400);
  assert.equal((await client.post("/books/").send({ title: "Bad", author: "Writer", price: "free", pages: 10 })).status, 400);
  assert.equal((await client.post("/books/").set("Content-Type", "application/json").send("{")).status, 400);
});

test("PUT /books/:bookId/ updates a row and validates input", async () => {
  const updated = await client.put("/books/1/").send({ title: "Updated", author: "Writer", price: 400, pages: 210 });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.title, "Updated");
  assert.equal((await client.put("/books/0/").send({})).status, 400);
  assert.equal((await client.put("/books/999/").send({ title: "x", author: "y", price: 1, pages: 1 })).status, 404);
});

test("DELETE /books/:bookId/ removes a row", async () => {
  assert.equal((await client.delete("/books/1/")).status, 200);
  assert.equal((await client.get("/books/1/")).status, 404);
  assert.equal((await client.delete("/books/1/")).status, 404);
});

test("user input is sent to SQLite as bound query parameters", async () => {
  const injectionLikeTitle = "Book'); DROP TABLE book; --";
  const created = await client.post("/books/").send({ title: injectionLikeTitle, author: "Writer", price: 1, pages: 1 });
  assert.equal(created.status, 201);
  assert.equal(created.body.title, injectionLikeTitle);
  assert.equal((await db.get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?", ["book"])) .name, "book");
});
