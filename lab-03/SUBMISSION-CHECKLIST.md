# SUBMISSION CHECKLIST — Lab 3: PostgreSQL REST API

**Student:** Paidi Sunhith Reddy | Reg. No.: 252U1R1174 | Class: 214 | Section: CSE1D
**College:** Aurora Deemed to be University | Faculty: Joel Prashanth D

---

## Implementation

- [x] `GET /` health/info endpoint returns JSON with API status
- [x] `GET /books` returns all seeded books with correct status 200
- [x] `GET /books?search_q=` filters by title or author (case-insensitive)
- [x] `GET /books?order_by=&order=` sorts by any allowed column
- [x] `GET /books?limit=&offset=` pagination works correctly
- [x] `GET /books?min_price=&max_price=` price range filter works
- [x] `POST /books` creates a book and returns 201 with the new record
- [x] `PUT /books/:id` updates a book and returns 200 with updated record
- [x] `DELETE /books/:id` deletes a book and returns 200
- [x] Invalid inputs return 400 with an error message
- [x] Missing book IDs return 404 with an error message
- [x] Unknown routes return 404 JSON
- [x] Database errors return 500 JSON
- [x] All SQL queries use parameterized statements (no SQL injection)
- [x] Table uses `book` (not `books`) — matching the actual schema
- [x] Server listens on `process.env.PORT || 3002`
- [x] SSL configured for Render PostgreSQL (`NODE_ENV=production`)

## Tests

- [x] `npm test` runs successfully
- [x] **54 tests pass, 0 failures**
- [x] Tests cover: GET defaults, search, sorting, pagination, price filter, combined params
- [x] Tests cover: POST create, validation (7 cases)
- [x] Tests cover: PUT update, validation, 404
- [x] Tests cover: DELETE, 404 on second delete
- [x] Tests cover: Unknown routes (404)
- [x] Tests cover: Error handling (500 on DB failure, idempotent seeding)
- [x] Tests cover: `validateBook` unit tests

## Database

- [x] PostgreSQL table `book` auto-created on startup
- [x] 10 seed books inserted when table is empty (idempotent)
- [x] `DATABASE_URL` used as the connection string (never hardcoded)
- [x] `.env` is in `.gitignore` — never committed
- [ ] Render PostgreSQL database created and connected

## Documentation

- [x] `README.md` updated with all required sections
- [x] API endpoint table with query parameters
- [x] PostgreSQL setup instructions
- [x] Render deployment instructions
- [x] `books.sql` reference schema present
- [x] `.env.example` present (no real credentials)
- [x] Postman collection present (`Postman-Lab-3-Collection.json`)
- [x] Screenshots saved in `screenshots/` (18 Postman evidence screenshots)

## GitHub

- [x] Repository: `paidisunhithreddy8-arch/LAB-1`
- [x] Code is in `lab-03/` directory only
- [x] Lab 1 and Lab 2 not modified
- [x] `node_modules/` not committed (in `.gitignore`)
- [x] `.env` not committed (in `.gitignore`)
- [ ] Final commit pushed to `origin main`

## Deployment

- [ ] Render Web Service created with root directory `lab-03`
- [ ] `DATABASE_URL` environment variable set in Render
- [ ] `NODE_ENV=production` set in Render
- [ ] Deployment build succeeded
- [ ] `GET /` returns 200 at the live URL
- [ ] `GET /books` returns all seeded books at the live URL
- [ ] All four endpoints tested at the live URL
- [ ] `README.md` updated with the actual Render deployment URL

## Submission

- [ ] Google Form submitted (link provided by faculty)
- [ ] Lab report submitted through ERP with the GitHub repository link
