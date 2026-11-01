const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const request = require("supertest");
const { newDb } = require("pg-mem");
const { createApp, initializeDatabase, seedBooksIfEmpty } = require("../server");

let pool;
let client;

before(async () => {
  const memoryDatabase = newDb();
  const { Pool } = memoryDatabase.adapters.createPg();
  pool = new Pool();
  await initializeDatabase(pool);
  client = request(createApp(pool));
});

after(async () => pool.end());

test("GET /books/ lists the seeded books", async () => {
  const response = await client.get("/books/");
  assert.equal(response.status, 200);
  assert.equal(response.body.length, 10);
  assert.equal(response.body[0].title, "The Alchemist");
});

test("GET /books/:bookId/ finds one book and handles invalid or missing IDs", async () => {
  const found = await client.get("/books/1/");
  assert.equal(found.status, 200);
  assert.equal(found.body.title, "The Alchemist");
  assert.equal((await client.get("/books/nope/")).status, 400);
  assert.equal((await client.get("/books/99999/")).status, 404);
});

test("POST /books/ validates input and inserts a book", async () => {
  const created = await client.post("/books/").send({
    title: "New Book",
    author: "Writer",
    price: 200,
    pages: 140,
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.title, "New Book");
  assert.ok(created.body.id);
  assert.equal((await client.post("/books/").send({ title: "Missing fields" })).status, 400);
  assert.equal((await client.post("/books/").send({ title: "Bad", author: "Writer", price: "free", pages: 10 })).status, 400);
  assert.equal((await client.post("/books/").set("Content-Type", "application/json").send("{")).status, 400);
});

test("PUT /books/:bookId/ updates a row and validates input", async () => {
  const updated = await client.put("/books/1/").send({
    title: "Updated",
    author: "Writer",
    price: 400,
    pages: 210,
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.title, "Updated");
  assert.equal((await client.put("/books/0/").send({})).status, 400);
  assert.equal((await client.put("/books/99999/").send({ title: "x", author: "y", price: 1, pages: 1 })).status, 404);
});

test("DELETE /books/:bookId/ removes a row", async () => {
  assert.equal((await client.delete("/books/1/")).status, 200);
  assert.equal((await client.get("/books/1/")).status, 404);
  assert.equal((await client.delete("/books/1/")).status, 404);
});

test("request input is bound as a PostgreSQL parameter", async () => {
  const injectionLikeTitle = "Book'); DROP TABLE book; --";
  const created = await client.post("/books/").send({
    title: injectionLikeTitle,
    author: "Writer",
    price: 1,
    pages: 1,
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.title, injectionLikeTitle);
  const tableStillWorks = await client.get("/books/");
  assert.equal(tableStillWorks.status, 200);
});

test("seeding does not duplicate records or overwrite existing database rows", async () => {
  const memoryDatabase = newDb();
  const { Pool } = memoryDatabase.adapters.createPg();
  const seedingPool = new Pool();
  try {
    await initializeDatabase(seedingPool);
    assert.equal(Number((await seedingPool.query("SELECT COUNT(*) AS count FROM book")).rows[0].count), 10);

    await seedingPool.query(
      "INSERT INTO book (title, author, price, pages) VALUES ($1, $2, $3, $4)",
      ["Persistence Check", "Test Author", 100, 50]
    );
    await seedBooksIfEmpty(seedingPool);
    const { rows } = await seedingPool.query("SELECT COUNT(*) AS count FROM book");
    assert.equal(Number(rows[0].count), 11);
    const preserved = await seedingPool.query("SELECT title FROM book WHERE title = $1", ["Persistence Check"]);
    assert.equal(preserved.rows[0].title, "Persistence Check");
  } finally {
    await seedingPool.end();
  }
});

test("database failures are converted to the existing 500 response shape", async () => {
  const failingPool = {
    query: async () => { throw new Error("database unavailable"); },
  };
  const response = await request(createApp(failingPool)).get("/books/");
  assert.equal(response.status, 500);
  assert.deepEqual(response.body, { error: "Internal server error" });
});
