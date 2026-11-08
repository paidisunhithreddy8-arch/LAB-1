# Lab 3 — Books REST API with Search, Sorting, Pagination & Price Filtering

## Student Information

| Field | Details |
|---|---|
| **Student Name** | Paidi Sunhith Reddy |
| **Registration Number** | 252U1R1174 |
| **Class** | 214 |
| **Section** | CSE1D |
| **College** | Aurora Deemed to be University |
| **Course** | Backend Development Fundamentals |
| **Academic Year** | II |
| **Branch** | CSE |
| **Faculty** | Shiva Teja |
| **GitHub Username** | [paidisunhithreddy8-arch](https://github.com/paidisunhithreddy8-arch) |

---

## Objective

Build an Express and PostgreSQL REST API for a **Books** resource supporting advanced querying capabilities:
1. **Search** across book title and author using case-insensitive SQL `LIKE` / `ILIKE` pattern matching.
2. **Sorting** by allowable fields (`id`, `title`, `author`, `price`, `pages`) in ascending or descending order.
3. **Pagination** with configurable `limit` and `offset` (defaulting to 10 and 0).
4. **Price range filtering** using `min_price` and `max_price`.
5. **Creation (`POST /books`)** with strict input validation for title, author, price, and pages.
6. **Updates (`PUT /books/:id`)** and **Deletions (`DELETE /books/:id`)**.
7. Correct **HTTP status codes** (`200 OK`, `201 Created`, `400 Bad Request`, `404 Not Found`, `500 Internal Server Error`).
8. Identify, document, and resolve **four official debugging exercises** encountered during backend development.

---

## Project Structure

```text
lab-03/
├── .env.example                    # Environment variable template (PORT=3002, DATABASE_URL)
├── .gitignore                      # Excludes node_modules, .env, and debug logs
├── books.sql                       # PostgreSQL schema definition and 10 reference seed records
├── package.json                    # Project manifest, scripts, runtime & dev dependencies
├── package-lock.json               # Locked dependency tree
├── Postman-Lab-3-Collection.json   # 18-request Postman test suite
├── README.md                       # Complete documentation, architecture, and viva guide
├── SUBMISSION-CHECKLIST.md         # Step-by-step verification and submission checklist
├── server.js                       # Express application factory, SQL query builder, and endpoints
├── screenshots/                    # Postman execution evidence
└── test/
    └── books.test.js               # 54 automated tests using pg-mem, Supertest, and node:test
```

---

## Database Architecture & Seed Data

The project uses PostgreSQL with parameterized SQL statements to safeguard against SQL injection. The database table is created automatically at startup if it does not already exist:

```sql
CREATE TABLE IF NOT EXISTS book (
  id     SERIAL PRIMARY KEY,
  title  TEXT    NOT NULL,
  author TEXT    NOT NULL,
  price  INTEGER NOT NULL CHECK (price >= 0),
  pages  INTEGER NOT NULL CHECK (pages > 0)
);
```

### Initial Seed Records

When the server starts against an empty database, it transactionally seeds the following 10 records:

| id | title | author | price | pages |
|---|---|---|---|---|
| 1 | The Alchemist | Paulo Coelho | 399 | 208 |
| 2 | Wings of Fire | A. P. J. Abdul Kalam | 250 | 180 |
| 3 | Atomic Habits | James Clear | 499 | 320 |
| 4 | The Hobbit | J. R. R. Tolkien | 450 | 310 |
| 5 | Pride and Prejudice | Jane Austen | 299 | 432 |
| 6 | 1984 | George Orwell | 350 | 328 |
| 7 | The Blue Umbrella | Ruskin Bond | 199 | 120 |
| 8 | Ikigai | Hector Garcia and Francesc Miralles | 399 | 208 |
| 9 | Clean Code | Robert C. Martin | 799 | 464 |
| 10 | The Little Prince | Antoine de Saint-Exupery | 275 | 96 |

Seeding is idempotent (`seedBooksIfEmpty`), ensuring existing records are never duplicated on subsequent server restarts.

---

## API Endpoints

All requests and responses use JSON formatting.

| Method | Endpoint | Description | Success Status | Error Statuses |
|---|---|---|---|---|
| `GET` | `/books` | List books with optional search, sort, pagination & price filters | `200 OK` | `400 Bad Request` |
| `POST` | `/books` | Create a new book record | `201 Created` | `400 Bad Request` |
| `PUT` | `/books/:id` | Update an existing book record by integer ID | `200 OK` | `400 Bad Request`, `404 Not Found` |
| `DELETE` | `/books/:id` | Delete a book record by integer ID | `200 OK` | `400 Bad Request`, `404 Not Found` |
| `*` | Any unmatched route | Global not-found fallback handler | — | `404 Not Found` |

### Query Parameters for `GET /books`

All query parameters are optional and can be combined:

| Parameter | Type | Default | Valid Values | Description |
|---|---|---|---|---|
| `search_q` | string | none | Any text string | Case-insensitive substring match against `title` or `author` using SQL `ILIKE`. |
| `order_by` | string | `id` | `id`, `title`, `author`, `price`, `pages` | Column to sort by. Invalid column names return 400. |
| `order` | string | `asc` | `asc`, `desc`, `ASC`, `DESC` | Sort direction. Values other than `asc` or `desc` return 400. |
| `limit` | integer | `10` | Positive integer (`> 0`) | Maximum number of rows to return. Non-integers or values $\le 0$ return 400. |
| `offset` | integer | `0` | Non-negative integer ($\ge 0$) | Number of rows to skip. Non-integers or negative values return 400. |
| `min_price`| integer | none | Non-negative integer ($\ge 0$) | Filters rows where `price >= min_price`. |
| `max_price`| integer | none | Non-negative integer ($\ge 0$) | Filters rows where `price <= max_price`. Must be $\ge min\_price$ if both are set. |

### Request Body Schema (`POST /books` & `PUT /books/:id`)

```json
{
  "title": "Designing Data-Intensive Applications",
  "author": "Martin Kleppmann",
  "price": 850,
  "pages": 616
}
```

Validation criteria:
- `title`: Non-empty string (trimmed).
- `author`: Non-empty string (trimmed).
- `price`: Non-negative integer (`price >= 0`).
- `pages`: Positive integer (`pages >= 1`).

---

## HTTP Status Codes

- **200 OK**: Request succeeded (GET books list, PUT book updated, DELETE book deleted).
- **201 Created**: Resource successfully created via POST.
- **400 Bad Request**: Malformed JSON, validation failure on request body, invalid `:id`, or invalid query parameters.
- **404 Not Found**: The target book ID does not exist, or the requested URL path is unregistered.
- **500 Internal Server Error**: Unexpected database or server exception caught by Express error middleware.

---

## Debugging Exercises

Lab 3 emphasizes real-world backend debugging techniques. Four specific bugs were investigated, analyzed, and resolved:

### 1. EADDRINUSE Port Conflict
- **Symptom**: `Error: listen EADDRINUSE: address already in use :::3002`.
- **Root Cause**: The application hardcoded port `3002` without checking the environment, causing a fatal collision whenever a background process or previous test instance was still holding the port.
- **Resolution**: Dynamically read port from `process.env.PORT` with fallback:
  ```javascript
  const PORT = Number(process.env.PORT) || 3002;
  ```
  In tests, `createApp(pool)` is tested directly with Supertest or bound to port `0` for zero-collision ephemeral ports.

### 2. Wrong Import Path
- **Symptom**: `Error: Cannot find module './pg'` or `MODULE_NOT_FOUND`.
- **Root Cause**: The developer attempted a relative path import `require("./pg")` instead of importing the installed npm package `require("pg")`.
- **Resolution**: Corrected the require statement to reference the package name directly:
  ```javascript
  const { Pool } = require("pg");
  ```

### 3. Table-Name Typo (No Such Table)
- **Symptom**: PostgreSQL error `relation "books" does not exist`.
- **Root Cause**: The database table was defined as singular `book` in the DDL schema, but the query string in `server.js` queried `SELECT * FROM books`.
- **Resolution**: Standardized the query to match the table name:
  ```javascript
  const sql = `SELECT * FROM book ${whereClause} ...`;
  ```

### 4. Missing `await`
- **Symptom**: Route handler returned an empty response, unresolved promise, or failed silently without waiting for database query execution.
- **Root Cause**: Calling `pool.query(...)` without the `await` keyword in an asynchronous route handler means `rows` is undefined when sending the response.
- **Resolution**: Prefixed the query call with `await`:
  ```javascript
  const { rows } = await pool.query(result.sql, result.params);
  res.status(200).json(rows);
  ```

---

## Prerequisites & Installation

### Prerequisites
- Node.js 20.17.0 or higher.
- npm (Node Package Manager).

### Installation

From the `lab-03/` directory:

```powershell
npm.cmd install
```

### Running Automated Tests

Tests execute in-memory using `pg-mem`, requiring no live database connection:

```powershell
npm.cmd test
```

### Starting the Server

Create a `.env` file copying from `.env.example`:

```powershell
PORT=3002
DATABASE_URL=postgresql://user:password@hostname:5432/dbname?sslmode=require
```

Start the server:

```powershell
# Production mode
npm.cmd start

# Development mode (auto-restart on file save via nodemon)
npm.cmd run dev
```

---

## Automated Verification

The test suite in [`test/books.test.js`](test/books.test.js) uses Node's native test runner (`node:test`), `supertest`, and `pg-mem`.

**Result:** 54 passing tests across 12 test suites:
- Defaults and initial 10 records verification.
- Substring searches by title and author (`ILIKE`).
- Ascending and descending sorting (`asc`, `desc`, `ASC`, `DESC`).
- Positive and boundary pagination tests (`limit`, `offset`).
- Single and combined price filters (`min_price`, `max_price`).
- Combined multi-parameter queries.
- POST creation, trimming, and validation error branches.
- PUT updates, ID validation, and 404 handling.
- DELETE removals, idempotency checks, and 404 handling.
- Global 404 fallback verification.
- Database 500 error handling and seed idempotency.
- Unit validation testing for `validateBook`.

---

## Postman Collection Testing

A complete 18-request Postman test collection is provided in [`Postman-Lab-3-Collection.json`](Postman-Lab-3-Collection.json).

### Requests Included
1. `GET /books` — All 10 books (200 OK)
2. `GET /books?search_q=orwell` — Search by author (200 OK)
3. `GET /books?search_q=the` — Search by title substring (200 OK)
4. `GET /books?order_by=price&order=desc` — Sort by price descending (200 OK)
5. `GET /books?min_price=300&max_price=500` — Price range filter (200 OK)
6. `GET /books?limit=3&offset=0` — Page 1 pagination (200 OK)
7. `GET /books?limit=3&offset=3` — Page 2 pagination (200 OK)
8. `GET /books?search_q=clean&order_by=price&order=asc&limit=5&offset=0` — Combined parameters (200 OK)
9. `GET /books?order_by=invalid` — Invalid sort column (400 Bad Request)
10. `GET /books?limit=abc` — Invalid pagination limit (400 Bad Request)
11. `POST /books` — Create book & store dynamic `bookId` (201 Created)
12. `POST /books` — Missing required title (400 Bad Request)
13. `POST /books` — Invalid non-numeric price (400 Bad Request)
14. `PUT /books/:id` — Update created book using `{{bookId}}` (200 OK)
15. `PUT /books/99999` — Update non-existent ID (404 Not Found)
16. `DELETE /books/:id` — Delete created book using `{{bookId}}` (200 OK)
17. `DELETE /books/99999` — Delete non-existent ID (404 Not Found)
18. `GET /unknown-route` — Unregistered route fallback (404 Not Found)

---

## Viva Questions & Answers

1. **What is the difference between SQL `LIKE` and `ILIKE`?**
   `LIKE` is case-sensitive, whereas `ILIKE` is PostgreSQL's extension for case-insensitive pattern matching.

2. **Why should user query parameters like `limit` and `offset` be parameterized ($1, $2)?**
   To prevent SQL injection attacks. Parameterization ensures that database drivers treat inputs strictly as values rather than executable SQL commands.

3. **Why shouldn't `order_by` column names be directly passed as SQL parameters?**
   SQL prepared statements do not allow column identifiers or table names as bind parameters ($1). Instead, column names must be validated against a strict server-side allowlist (`ALLOWED_ORDER_BY`) before being interpolated.

4. **What does `RETURNING *` do in PostgreSQL `INSERT` and `UPDATE` statements?**
   It instructs PostgreSQL to return the inserted or updated row directly, avoiding the need for a secondary `SELECT` query to retrieve generated values like `id`.

5. **How does Express handle unhandled errors?**
   Express identifies error-handling middleware by its 4-argument signature: `(err, req, res, next)`. When any route calls `next(error)`, execution jumps straight to this handler.

6. **What is the purpose of `pg-mem` in testing?**
   `pg-mem` is an in-memory emulator of PostgreSQL that runs entirely within Node.js, providing isolated, ultra-fast test execution without requiring network access or external PostgreSQL credentials.

7. **What is an idempotent operation in HTTP?**
   An HTTP method is idempotent if making the request multiple times produces the same server state as making it once. `GET`, `PUT`, and `DELETE` are idempotent; `POST` is non-idempotent.

8. **What causes an `EADDRINUSE` error in Node.js?**
   Attempting to bind a network server to an IP and port combination that is already bound by another running process.

9. **What is the difference between `status(200)` and `status(201)`?**
   `200 OK` denotes generic request success, while `201 Created` specifically indicates that a new resource was successfully generated as a result of the request.

10. **Why should `app.listen()` be placed inside an `if (require.main === module)` check?**
    It prevents the server from binding to a network port when imported by automated test files (e.g. Supertest), allowing tests to manage their own lifecycle.
