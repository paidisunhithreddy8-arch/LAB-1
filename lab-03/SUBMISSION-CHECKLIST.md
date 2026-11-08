# Lab 3 — Submission Checklist

Student: **Paidi Sunhith Reddy** (`252U1R1174`)  
Course: **Backend Development Fundamentals**  
Project: **Lab 3 — Books REST API with Search, Sorting, Pagination, Price Filtering, and Debugging**

---

## 1. Project Organization & Safety
- [x] Created inside separate `lab-03` directory in the repository.
- [x] Existing `lab-01` remains 100% untouched and unmodified.
- [x] Existing `lab-02` remains 100% untouched and unmodified.
- [x] `.gitignore` correctly excludes `node_modules/`, `.env`, and debug logs.
- [x] `.env.example` provided with `PORT=3002` and empty `DATABASE_URL=`.

---

## 2. Dependencies & Runtime Configuration
- [x] `package.json` configured with Express (`^5.1.0`), `pg` (`^8.23.1`), and `dotenv`.
- [x] Dev dependencies configured with `nodemon`, `pg-mem`, and `supertest`.
- [x] Engine requires Node.js `>=20.17.0`.
- [x] `scripts` include `start`, `dev`, and `test`.

---

## 3. Database Architecture & Seeding
- [x] `books.sql` provided as schema and seed reference.
- [x] PostgreSQL table `book` defined with `id`, `title`, `author`, `price`, and `pages`.
- [x] 10 standard seed book records defined and inserted if table is empty.
- [x] Seeding is idempotent and wrapped in a transaction (`BEGIN ... COMMIT`).

---

## 4. API Endpoints Implementation
- [x] `GET /books` lists all books with default ordering (`id ASC`), limit (`10`), and offset (`0`).
- [x] `GET /books?search_q=` implements case-insensitive search across title and author via `ILIKE`.
- [x] `GET /books?order_by=&order=` supports allowable fields and both ASC/DESC orders.
- [x] `GET /books?limit=&offset=` implements pagination with integer validation.
- [x] `GET /books?min_price=&max_price=` implements price filtering with boundary validation.
- [x] `POST /books` creates records with input validation and returns HTTP `201 Created`.
- [x] `PUT /books/:id` updates records by integer ID and returns HTTP `200 OK` or `404 Not Found`.
- [x] `DELETE /books/:id` deletes records by integer ID and returns HTTP `200 OK` or `404 Not Found`.
- [x] Global fallback handler returns HTTP `404 Not Found` in consistent JSON format.
- [x] 4-argument Express error middleware converts unexpected server exceptions to HTTP `500`.

---

## 5. Status Codes Compliance
- [x] `200 OK` for successful `GET`, `PUT`, and `DELETE`.
- [x] `201 Created` for successful `POST`.
- [x] `400 Bad Request` for malformed body, invalid query parameters, or bad `:id` formats.
- [x] `404 Not Found` for missing record IDs during update/delete and unmatched paths.
- [x] `500 Internal Server Error` for database failures.

---

## 6. Debugging Exercises
- [x] **Bug 1: EADDRINUSE port conflict** diagnosed and resolved using dynamic `process.env.PORT || 3002`.
- [x] **Bug 2: Wrong import path** diagnosed and resolved (`require("pg")`).
- [x] **Bug 3: Table-name typo** diagnosed and resolved (`SELECT * FROM book`).
- [x] **Bug 4: Missing await** diagnosed and resolved (`await pool.query(...)`).

---

## 7. Testing & Verification
- [x] Automated test suite in `test/books.test.js` using `node:test`, `pg-mem`, and `supertest`.
- [x] **54 automated tests pass with 0 failures**.
- [x] Server verified to bind cleanly to port 3002.
- [x] Complete 18-request Postman test collection in `Postman-Lab-3-Collection.json`.
- [x] `screenshots/` directory created for saving Postman test execution screenshots.

---

## 8. Documentation
- [x] Comprehensive `README.md` containing student info, endpoint specs, status codes, debugging logs, and viva Q&A.
- [x] `SUBMISSION-CHECKLIST.md` completed.
