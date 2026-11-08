"use strict";

const assert = require("node:assert/strict");
const { after, before, describe, it } = require("node:test");
const request = require("supertest");
const { newDb } = require("pg-mem");
const {
  createApp,
  initializeDatabase,
  seedBooksIfEmpty,
  validateBook,
} = require("../server");

// ---------------------------------------------------------------------------
// Shared test state — set up once for the whole file
// ---------------------------------------------------------------------------

let client; // supertest agent
let pool;   // pg-mem pool

before(async () => {
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  pool = new Pool();
  await initializeDatabase(pool);
  client = request(createApp(pool));
});

after(async () => pool.end());

// ---------------------------------------------------------------------------
// GET /books — defaults and listing
// ---------------------------------------------------------------------------

describe("GET /books — defaults", () => {
  it("returns 200 and all 10 seeded books", async () => {
    const res = await client.get("/books");
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 10);
  });

  it("first book is The Alchemist (default sort: id asc)", async () => {
    const res = await client.get("/books");
    assert.equal(res.status, 200);
    assert.equal(res.body[0].title, "The Alchemist");
  });
});

// ---------------------------------------------------------------------------
// GET /books — search_q
// ---------------------------------------------------------------------------

describe("GET /books — search_q", () => {
  it("filters by title substring (case-insensitive)", async () => {
    const res = await client.get("/books?search_q=clean");
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].title, "Clean Code");
  });

  it("filters by author substring (case-insensitive)", async () => {
    const res = await client.get("/books?search_q=orwell");
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].author, "George Orwell");
  });

  it("matches titles starting with 'the' (case-insensitive)", async () => {
    const res = await client.get("/books?search_q=The");
    assert.equal(res.status, 200);
    // The Alchemist, The Hobbit, The Blue Umbrella, The Little Prince
    assert.ok(res.body.length >= 4);
    assert.ok(
      res.body.every(
        (b) =>
          b.title.toLowerCase().includes("the") ||
          b.author.toLowerCase().includes("the")
      )
    );
  });

  it("returns empty array when no match", async () => {
    const res = await client.get("/books?search_q=zzzzznotfound");
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 0);
  });
});

// ---------------------------------------------------------------------------
// GET /books — order_by and order
// ---------------------------------------------------------------------------

describe("GET /books — sorting", () => {
  it("sorts by price descending", async () => {
    const res = await client.get("/books?order_by=price&order=desc");
    assert.equal(res.status, 200);
    assert.equal(res.body[0].title, "Clean Code"); // price 799
    // Verify descending order
    for (let i = 1; i < res.body.length; i++) {
      assert.ok(res.body[i - 1].price >= res.body[i].price);
    }
  });

  it("sorts by price descending with uppercase DESC", async () => {
    const res = await client.get("/books?order_by=PRICE&order=DESC");
    assert.equal(res.status, 200);
    assert.equal(res.body[0].title, "Clean Code");
    for (let i = 1; i < res.body.length; i++) {
      assert.ok(res.body[i - 1].price >= res.body[i].price);
    }
  });

  it("sorts by price ascending", async () => {
    const res = await client.get("/books?order_by=price&order=asc");
    assert.equal(res.status, 200);
    assert.equal(res.body[0].title, "The Blue Umbrella"); // price 199
  });

  it("sorts by price ascending with uppercase ASC", async () => {
    const res = await client.get("/books?order_by=price&order=ASC");
    assert.equal(res.status, 200);
    assert.equal(res.body[0].title, "The Blue Umbrella");
  });

  it("sorts by title ascending", async () => {
    const res = await client.get("/books?order_by=title&order=asc");
    assert.equal(res.status, 200);
    // '1984' sorts before 'A...' in ASCII order
    assert.equal(res.body[0].title, "1984");
  });

  it("returns 400 for an unrecognised order_by field", async () => {
    const res = await client.get("/books?order_by=invalid");
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it("returns 400 for an invalid order direction", async () => {
    const res = await client.get("/books?order=sideways");
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });
});

// ---------------------------------------------------------------------------
// GET /books — pagination
// ---------------------------------------------------------------------------

describe("GET /books — pagination", () => {
  it("limits results with limit=3", async () => {
    const res = await client.get("/books?limit=3");
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 3);
  });

  it("page 1 and page 2 contain different records", async () => {
    const page1 = await client.get("/books?limit=3&offset=0");
    const page2 = await client.get("/books?limit=3&offset=3");
    assert.equal(page1.status, 200);
    assert.equal(page2.status, 200);
    assert.equal(page1.body.length, 3);
    assert.equal(page2.body.length, 3);
    const ids1 = page1.body.map((b) => b.id);
    const ids2 = page2.body.map((b) => b.id);
    assert.ok(ids1.every((id) => !ids2.includes(id)));
  });

  it("returns 400 for non-integer limit", async () => {
    const res = await client.get("/books?limit=abc");
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it("returns 400 for limit=0", async () => {
    const res = await client.get("/books?limit=0");
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it("returns 400 for negative offset", async () => {
    const res = await client.get("/books?offset=-1");
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it("returns 400 for non-integer offset", async () => {
    const res = await client.get("/books?offset=two");
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });
});

// ---------------------------------------------------------------------------
// GET /books — price filter
// ---------------------------------------------------------------------------

describe("GET /books — price filter", () => {
  it("filters by min_price", async () => {
    const res = await client.get("/books?min_price=499");
    assert.equal(res.status, 200);
    assert.ok(res.body.length >= 1);
    assert.ok(res.body.every((b) => b.price >= 499));
  });

  it("filters by max_price", async () => {
    const res = await client.get("/books?max_price=250");
    assert.equal(res.status, 200);
    assert.ok(res.body.every((b) => b.price <= 250));
  });

  it("filters by min_price and max_price together", async () => {
    const res = await client.get("/books?min_price=300&max_price=500");
    assert.equal(res.status, 200);
    assert.ok(res.body.every((b) => b.price >= 300 && b.price <= 500));
  });

  it("returns 400 for non-integer min_price", async () => {
    const res = await client.get("/books?min_price=free");
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it("returns 400 for non-integer max_price", async () => {
    const res = await client.get("/books?max_price=expensive");
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it("returns 400 when max_price < min_price", async () => {
    const res = await client.get("/books?min_price=500&max_price=200");
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });
});

// ---------------------------------------------------------------------------
// GET /books — combined parameters
// ---------------------------------------------------------------------------

describe("GET /books — combined parameters", () => {
  it("combines search, sort, and pagination correctly", async () => {
    const res = await client.get(
      "/books?search_q=clean&order_by=price&order=asc&limit=5&offset=0"
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].title, "Clean Code");
  });

  it("combines min_price filter with descending sort", async () => {
    const res = await client.get("/books?min_price=400&order_by=price&order=desc");
    assert.equal(res.status, 200);
    assert.ok(res.body.every((b) => b.price >= 400));
    for (let i = 1; i < res.body.length; i++) {
      assert.ok(res.body[i - 1].price >= res.body[i].price);
    }
  });
});

// ---------------------------------------------------------------------------
// POST /books
// ---------------------------------------------------------------------------

describe("POST /books", () => {
  it("creates a book and returns 201 with the new record", async () => {
    const res = await client.post("/books").send({
      title:  "Test Book",
      author: "Test Author",
      price:  299,
      pages:  200,
    });
    assert.equal(res.status, 201);
    assert.ok(res.body.id);
    assert.equal(res.body.title,  "Test Book");
    assert.equal(res.body.author, "Test Author");
    assert.equal(res.body.price,  299);
    assert.equal(res.body.pages,  200);
  });

  it("trims whitespace from title and author", async () => {
    const res = await client.post("/books").send({
      title:  "  Trimmed  ",
      author: "  Author  ",
      price:  100,
      pages:  50,
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.title,  "Trimmed");
    assert.equal(res.body.author, "Author");
  });

  it("returns 400 when title is missing", async () => {
    const res = await client.post("/books").send({ author: "A", price: 100, pages: 50 });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it("returns 400 when author is an empty string", async () => {
    const res = await client.post("/books").send({ title: "T", author: "", price: 100, pages: 50 });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it("returns 400 when price is a string", async () => {
    const res = await client
      .post("/books")
      .send({ title: "T", author: "A", price: "free", pages: 50 });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it("returns 400 when price is negative", async () => {
    const res = await client
      .post("/books")
      .send({ title: "T", author: "A", price: -1, pages: 50 });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it("returns 400 when pages is 0", async () => {
    const res = await client
      .post("/books")
      .send({ title: "T", author: "A", price: 100, pages: 0 });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it("returns 400 for malformed JSON body", async () => {
    const res = await client
      .post("/books")
      .set("Content-Type", "application/json")
      .send("{bad json}");
    assert.equal(res.status, 400);
  });

  it("accepts price=0 as a valid non-negative integer", async () => {
    const res = await client.post("/books").send({ title: "Free", author: "A", price: 0, pages: 1 });
    assert.equal(res.status, 201);
    assert.equal(res.body.price, 0);
  });
});

// ---------------------------------------------------------------------------
// PUT /books/:id
// ---------------------------------------------------------------------------

describe("PUT /books/:id", () => {
  let bookId;

  before(async () => {
    const res = await client.post("/books").send({
      title:  "Put Target",
      author: "Put Author",
      price:  150,
      pages:  100,
    });
    bookId = res.body.id;
  });

  it("updates a book and returns 200 with the updated record", async () => {
    const res = await client.put(`/books/${bookId}`).send({
      title:  "Updated Title",
      author: "Updated Author",
      price:  200,
      pages:  120,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.id,     bookId);
    assert.equal(res.body.title,  "Updated Title");
    assert.equal(res.body.price,  200);
  });

  it("returns 400 for a non-integer id (string)", async () => {
    const res = await client
      .put("/books/abc")
      .send({ title: "T", author: "A", price: 1, pages: 1 });
    assert.equal(res.status, 400);
  });

  it("returns 400 for id=0", async () => {
    const res = await client
      .put("/books/0")
      .send({ title: "T", author: "A", price: 1, pages: 1 });
    assert.equal(res.status, 400);
  });

  it("returns 404 when the id does not exist", async () => {
    const res = await client
      .put("/books/99999")
      .send({ title: "T", author: "A", price: 1, pages: 1 });
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
  });

  it("returns 400 for an invalid body", async () => {
    const res = await client
      .put(`/books/${bookId}`)
      .send({ title: "", author: "A", price: 1, pages: 1 });
    assert.equal(res.status, 400);
  });
});

// ---------------------------------------------------------------------------
// DELETE /books/:id
// ---------------------------------------------------------------------------

describe("DELETE /books/:id", () => {
  let bookId;

  before(async () => {
    const res = await client.post("/books").send({
      title:  "Delete Target",
      author: "Delete Author",
      price:  50,
      pages:  50,
    });
    bookId = res.body.id;
  });

  it("deletes a book and returns 200 with success message", async () => {
    const res = await client.delete(`/books/${bookId}`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { message: "Book deleted successfully" });
  });

  it("returns 404 when deleting the same id again", async () => {
    const res = await client.delete(`/books/${bookId}`);
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
  });

  it("returns 400 for a non-integer id", async () => {
    const res = await client.delete("/books/xyz");
    assert.equal(res.status, 400);
  });

  it("returns 404 for a non-existent id", async () => {
    const res = await client.delete("/books/99999");
    assert.equal(res.status, 404);
  });
});

// ---------------------------------------------------------------------------
// 404 fallback
// ---------------------------------------------------------------------------

describe("Unknown routes", () => {
  it("returns 404 JSON for an unmatched GET route", async () => {
    const res = await client.get("/unknown");
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
  });

  it("returns 404 JSON for an unmatched POST route", async () => {
    const res = await client.post("/nope").send({});
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe("Error handling", () => {
  it("returns 500 when the database pool throws", async () => {
    const failingPool = {
      query: async () => {
        throw new Error("database unavailable");
      },
    };
    const res = await request(createApp(failingPool)).get("/books");
    assert.equal(res.status, 500);
    assert.deepEqual(res.body, { error: "Internal server error" });
  });

  it("seeding is idempotent — running twice keeps exactly 10 records", async () => {
    const db = newDb();
    const { Pool } = db.adapters.createPg();
    const seedPool = new Pool();
    try {
      await initializeDatabase(seedPool);
      const { rows: first } = await seedPool.query(
        "SELECT COUNT(*) AS count FROM book"
      );
      assert.equal(Number(first[0].count), 10);

      // Second call must not insert duplicates
      await seedBooksIfEmpty(seedPool);
      const { rows: second } = await seedPool.query(
        "SELECT COUNT(*) AS count FROM book"
      );
      assert.equal(Number(second[0].count), 10);
    } finally {
      await seedPool.end();
    }
  });
});

// ---------------------------------------------------------------------------
// validateBook — unit tests
// ---------------------------------------------------------------------------

describe("validateBook helper", () => {
  it("returns { book } for a valid input", () => {
    const result = validateBook({ title: "T", author: "A", price: 0, pages: 1 });
    assert.ok(result.book);
    assert.equal(result.error, undefined);
  });

  it("trims title and author whitespace", () => {
    const result = validateBook({ title: "  Hi  ", author: "  Bye  ", price: 1, pages: 1 });
    assert.equal(result.book.title,  "Hi");
    assert.equal(result.book.author, "Bye");
  });

  it("returns error for null body", () => {
    assert.ok(validateBook(null).error);
  });

  it("returns error for array body", () => {
    assert.ok(validateBook([]).error);
  });

  it("returns error when price is a float", () => {
    assert.ok(validateBook({ title: "T", author: "A", price: 9.99, pages: 1 }).error);
  });
});
