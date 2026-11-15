# Lab 3 — Books REST API (Node.js + Express + PostgreSQL)

> **Live Deployment URL:** *(to be updated after Render deployment)*
>
> **GET /books live:** *(to be updated)*

---

## Student Details

| Field               | Value                             |
|---------------------|-----------------------------------|
| **Name**            | Paidi Sunhith Reddy               |
| **Registration No.**| 252U1R1174                        |
| **Class**           | 214                               |
| **Section**         | CSE1D                             |
| **College**         | Aurora Deemed to be University    |
| **Course**          | Backend Development Fundamentals  |
| **Faculty**         | Joel Prashanth D                  |
| **Lab**             | Lab 3 — PostgreSQL REST API       |

---

## Objective

Build a complete Books REST API using Node.js, Express and PostgreSQL that supports:

- Full CRUD: Create, Read, Update, Delete books
- Case-insensitive full-text search across title and author
- Sorting by any column (asc/desc)
- Pagination (limit/offset)
- Price range filtering (min_price/max_price)
- Parameterized SQL queries (no SQL injection)
- Input validation with correct HTTP status codes
- Automated tests using `pg-mem` (in-memory PostgreSQL)
- Deployment to Render with a live PostgreSQL database

---

## Project Structure

```
lab-03/
├── server.js                    # Express API + PostgreSQL logic
├── package.json
├── package-lock.json
├── books.sql                    # Reference SQL schema + seed data
├── .env.example                 # Template for local environment variables
├── .gitignore
├── Postman-Lab-3-Collection.json
├── README.md
├── SUBMISSION-CHECKLIST.md
├── screenshots/                 # Postman evidence screenshots
└── test/
    └── books.test.js            # 54 automated tests (pg-mem)
```

---

## Prerequisites

| Tool     | Version   |
|----------|-----------|
| Node.js  | >= 20.17  |
| npm      | >= 9      |
| PostgreSQL | Any (local or Render) |

---

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/paidisunhithreddy8-arch/LAB-1.git
cd LAB-1/lab-03
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```
PORT=3002
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

> **Never commit `.env` to Git.** It is listed in `.gitignore`.

### 4. Start the server

```bash
npm start
```

The server will:
1. Connect to PostgreSQL using `DATABASE_URL`
2. Create the `book` table if it does not exist
3. Seed 10 books if the table is empty
4. Start listening on `http://localhost:3002`

---

## npm Scripts

| Script           | Command               | Purpose                        |
|------------------|-----------------------|-------------------------------|
| `npm start`      | `node server.js`      | Start production server        |
| `npm run dev`    | `nodemon server.js`   | Start with auto-reload         |
| `npm test`       | `node --test`         | Run all 54 automated tests     |

---

## API Endpoints

### `GET /` — Health / Info

Returns API status and available routes.

**Response 200:**
```json
{
  "api": "Lab 3 — Books REST API",
  "status": "running",
  "version": "1.0.0",
  "routes": ["GET /books", "POST /books", "PUT /books/:id", "DELETE /books/:id"]
}
```

---

### `GET /books` — List Books

Returns a paginated, filtered, sorted list of books.

**Query Parameters:**

| Parameter    | Type    | Default | Description                                   |
|--------------|---------|---------|-----------------------------------------------|
| `search_q`   | string  | —       | Case-insensitive search in title and author   |
| `order_by`   | string  | `id`    | Sort field: `id`, `title`, `author`, `price`, `pages` |
| `order`      | string  | `asc`   | Sort direction: `asc` or `desc`               |
| `limit`      | integer | `10`    | Max results per page (must be > 0)            |
| `offset`     | integer | `0`     | Number of records to skip (must be >= 0)      |
| `min_price`  | integer | —       | Minimum price filter (inclusive)              |
| `max_price`  | integer | —       | Maximum price filter (inclusive)              |

**Example Requests:**

```
GET /books
GET /books?search_q=clean
GET /books?order_by=price&order=desc
GET /books?limit=3&offset=0
GET /books?min_price=300&max_price=500
GET /books?search_q=the&order_by=price&order=asc&limit=5
```

**Response 200:** Array of book objects  
**Response 400:** Validation error (bad parameter values)

---

### `POST /books` — Create a Book

**Request Body (JSON):**

```json
{
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "price": 799,
  "pages": 464
}
```

**Rules:** title and author must be non-empty strings; price must be a non-negative integer; pages must be a positive integer.

**Response 201:** Created book object with `id`  
**Response 400:** Validation error

---

### `PUT /books/:id` — Update a Book

Same body as POST. Replaces all fields.

**Response 200:** Updated book object  
**Response 400:** Invalid id or body  
**Response 404:** Book not found

---

### `DELETE /books/:id` — Delete a Book

**Response 200:**
```json
{ "message": "Book deleted successfully" }
```
**Response 400:** Invalid id  
**Response 404:** Book not found

---

## HTTP Status Codes

| Code | Meaning                  | When                                |
|------|--------------------------|-------------------------------------|
| 200  | OK                       | Successful GET, PUT, DELETE         |
| 201  | Created                  | Successful POST                     |
| 400  | Bad Request              | Invalid input / parameters          |
| 404  | Not Found                | Book id doesn't exist / unknown route |
| 500  | Internal Server Error    | Unexpected database error           |

---

## PostgreSQL Setup

### Schema

```sql
CREATE TABLE IF NOT EXISTS book (
  id     SERIAL PRIMARY KEY,
  title  TEXT    NOT NULL,
  author TEXT    NOT NULL,
  price  INTEGER NOT NULL CHECK (price >= 0),
  pages  INTEGER NOT NULL CHECK (pages > 0)
);
```

The server creates this table automatically at startup. See `books.sql` for the full reference schema with seed data.

### Local PostgreSQL

```bash
psql -U postgres -c "CREATE DATABASE lab3;"
# Set DATABASE_URL=postgresql://postgres:password@localhost:5432/lab3
npm start
```

---

## Render Deployment

### Step 1 — Create a PostgreSQL database on Render

1. Go to https://dashboard.render.com
2. Click **New → PostgreSQL**
3. Choose the free plan, give it a name (e.g. `lab3-db`)
4. After creation, copy the **Internal Database URL**

### Step 2 — Create a Web Service

1. Click **New → Web Service**
2. Connect your GitHub account and select `paidisunhithreddy8-arch/LAB-1`
3. Configure:

| Setting          | Value              |
|------------------|--------------------|
| Root Directory   | `lab-03`           |
| Runtime          | Node               |
| Build Command    | `npm install`      |
| Start Command    | `npm start`        |

4. Under **Environment Variables**, add:

| Key            | Value                              |
|----------------|------------------------------------|
| `DATABASE_URL` | *(paste the Internal Database URL)*|
| `NODE_ENV`     | `production`                       |

> Setting `NODE_ENV=production` enables the SSL configuration required by Render's managed PostgreSQL.

5. Click **Deploy**. The first deploy may take 1–2 minutes.

### Step 3 — Verify

Once deployed, test these URLs in your browser or Postman:

```
GET https://<your-app>.onrender.com/
GET https://<your-app>.onrender.com/books
GET https://<your-app>.onrender.com/books?limit=3
GET https://<your-app>.onrender.com/books?order_by=price&order=desc
GET https://<your-app>.onrender.com/books?search_q=clean
```

---

## Testing

Tests use `pg-mem` (in-memory PostgreSQL) — no real database needed.

```bash
npm test
```

**Expected output:**
```
ℹ tests 54
ℹ pass 54
ℹ fail 0
```

---

## Postman Testing

Import `Postman-Lab-3-Collection.json` into Postman:

1. Open Postman → Import → select `Postman-Lab-3-Collection.json`
2. Set the base URL variable to `http://localhost:3002` (local) or your Render URL
3. Run the collection

---

## Screenshots

Screenshots of Postman test evidence are saved in `screenshots/` (01–18).

---

## Remaining Tasks

- [ ] Deploy to Render and update the deployment URL at the top of this file
- [ ] Test all endpoints against the live Render URL
- [ ] Submit via the Google Form for Lab 3
- [ ] Submit lab report through ERP
