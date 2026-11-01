# Lab 2 — SQLite Database and CRUD Routes

> The original lab used SQLite. The hosted application has now been migrated to PostgreSQL so it can use a free managed database rather than local disk storage. The five endpoint paths and response formats are retained.

## Student details

| Field | Details |
| --- | --- |
| Name | Paidi Sunhith Reddy |
| Registration number | 252U1R1174 |
| Class | 214 |
| Section | CSE1D |
| College | Aurora Deemed to be University |
| Course | Backend Development Fundamentals |

## Deployment

**Status:** Successfully deployed on Render and connected to Neon PostgreSQL through the `DATABASE_URL` environment variable.

**Live API:** https://lab-02-5ug9.onrender.com

The live service was verified through all five CRUD endpoints: GET all books, GET book by ID, POST, PUT, and DELETE. POST created book ID 11, PUT updated it, and DELETE removed it successfully. The Render logs confirmed the PostgreSQL connection and that the service was live.

## What this lab teaches

Express receives HTTP requests and PostgreSQL stores the books in a managed database. Database operations are asynchronous. User supplied values are sent as bound PostgreSQL parameters (`$1`, `$2`, and so on), separate from SQL instructions.

## Project structure

```text
lab-02/
├── .env.example
├── .gitignore
├── README.md
├── books.db                 # retained SQLite file from the original lab; not used by the migrated server
├── books.sql                # retained SQLite setup script; not used by the migrated server
├── package.json
├── package-lock.json
├── Postman-Lab-2-Collection.json
├── render.yaml
├── server.js                # Express API, PostgreSQL setup and sample seeding
├── screenshots/             # existing evidence; see note below
└── test/
    └── books.test.js        # CRUD and seeding tests using pg-mem
```

`node_modules/` is installed locally and ignored by Git. `.env` is ignored too. `.env.example` contains a blank `DATABASE_URL` setting; it does not contain a real database credential. The old SQLite database and SQL file are retained for reference and are no longer read or written by the application.

## Requirements and installation

Install Node.js 20.17+ and npm. Express provides the HTTP routes, `pg` connects to PostgreSQL, nodemon restarts the local server after code changes, and `pg-mem` plus Supertest support automated tests without connecting to a real Neon project.

In PowerShell, open a terminal in this `lab-02/` folder and run:

```powershell
npm.cmd install
npm.cmd test
```

## Database setup

The application connects using the `DATABASE_URL` environment variable. Create a free PostgreSQL project in Neon and copy its pooled connection string from the Neon dashboard. Keep the connection string private; do not paste it into source code or commit it.

For local development in PowerShell, set the variable in the terminal before starting the app. Substitute the connection string copied from your Neon dashboard:

```powershell
$env:DATABASE_URL = "<your Neon PostgreSQL connection string>"
```

The server creates the PostgreSQL `book` table when it starts. Its columns are `id` (generated primary key), `title`, `author`, `price`, and `pages`. Startup inserts the ten sample books inside a transaction only when the table is empty. Repeated starts leave existing records as they are.

## Run the server

After setting `DATABASE_URL`, run nodemon:

```powershell
npm.cmd run dev
```

The API listens at `http://localhost:3001`. Keep the terminal open while testing. Press `Ctrl+C` to stop it. For a normal start without watching files, run `npm.cmd start`.

`initializeDBAndServer()` checks that `DATABASE_URL` is present, connects to PostgreSQL, creates the table and seeds it if empty. Express starts only after those database steps succeed. If the connection or initialization fails, the server does not start.

## API endpoints

All request and response bodies are JSON. For POST and PUT, send `title` and `author` as non-empty strings, `price` as a non-negative integer, and `pages` as a positive integer.

| Method | Path | Description | Success status |
| --- | --- | --- | --- |
| GET | `/books/` | Return all books | 200 |
| GET | `/books/:bookId/` | Return one book by ID | 200 |
| POST | `/books/` | Create a book | 201 |
| PUT | `/books/:bookId/` | Replace a book's editable fields | 200 |
| DELETE | `/books/:bookId/` | Delete a book | 200 |

Examples: `GET http://localhost:3001/books/` and `GET http://localhost:3001/books/1/`.

### Status codes

- `200 OK`: a read, update, or delete succeeded.
- `201 Created`: a book was added.
- `400 Bad Request`: an ID or request body is invalid.
- `404 Not Found`: the requested book ID does not exist.
- `500 Internal Server Error`: an unexpected server/database request error occurred.

Every SQL statement that uses request values binds them with PostgreSQL parameters. Request data is never concatenated into SQL text.

## Automated verification

Run the automated tests with:

```powershell
npm.cmd test
```

Tests use `pg-mem`, an in-memory PostgreSQL-compatible test database. They exercise all five routes, invalid IDs and input, missing records, parameter binding, automatic seeding, repeat initialization, and error responses. Tests do not require a Neon URL and do not replace manual verification against the deployed database or the assignment's Postman evidence.

The importable collection is [`Postman-Lab-2-Collection.json`](Postman-Lab-2-Collection.json). It contains the five CRUD requests in order and saves the returned POST ID as `bookId` for PUT and DELETE. For local testing, set the collection's request URLs to `http://localhost:3001` and use Postman's Desktop Agent (a cloud agent cannot reach your computer's localhost). For deployed testing, change the base URL to the actual Render service URL after deployment.

### Capture genuine screenshots

Capture each screenshot only after its real request and response are visible. Keep the request method, URL, response status, response body, and Postman test result in view. Use Windows Snipping Tool (`Win+Shift+S`) or another real screen capture tool and save unaltered captures in `lab-02/screenshots/`.

The screenshots currently in the repository were captured from the original SQLite implementation and are historical evidence. The migrated PostgreSQL API has since been tested live on Render using Postman. Replace these historical images with the new live Postman captures before final submission. For database evidence, use the Neon SQL Editor to run `SELECT id, title, author, price, pages FROM book ORDER BY id;` and capture the actual results.

## Screenshots / Evidence

### GET All Books

Existing capture (from the original SQLite implementation; replace with a genuine capture of the migrated API before submission).

![GET All Books response](screenshots/get-all-books.png)

### GET Book by ID

Existing capture (from the original SQLite implementation; replace with a genuine capture of the migrated API before submission).

![GET Book by ID response](screenshots/get-one-book.png)

### POST Create Book

Existing capture (from the original SQLite implementation; replace with a genuine capture of the migrated API before submission).

![POST Create Book response](screenshots/post-book.png)

### PUT Update Book

Existing capture (from the original SQLite implementation; replace with a genuine capture of the migrated API before submission).

![PUT Update Book response](screenshots/put-book.png)

### DELETE Book

Existing capture (from the original SQLite implementation; replace with a genuine capture of the migrated API before submission).

![DELETE Book response](screenshots/delete-book.png)

### Database Records

Existing SQLite CLI capture from the original implementation. It is not evidence of Neon PostgreSQL records; capture the SQL query results from Neon after deployment.

![SQLite database records](screenshots/sqlite-records.png)

## Problems faced and solutions

The original SQLite setup encountered a Windows npm cache issue while downloading the native `sqlite3` module. The hosted version was migrated to PostgreSQL so it could use a managed database instead of Render's temporary local filesystem. The deployed Render logs confirmed a successful PostgreSQL connection, and all five CRUD routes were manually tested against the live API.

## Render and Neon deployment

The [`render.yaml`](render.yaml) Blueprint selects Render's Free Web Service plan, uses `lab-02` as the service root, and does not attach a disk. Render's local filesystem is ephemeral, so the application stores all runtime book records in Neon PostgreSQL instead. Free Render web services can sleep when idle; the first request after sleep may take about a minute. Render free services have monthly usage limits. Neon Free currently includes 100 compute hours and 1 GB of database storage per project, and its free plan does not require a credit card. Review current provider limits before setup; do not select a paid plan or add a paid add-on.

The service is deployed at https://lab-02-5ug9.onrender.com. It uses the Render Free Web Service plan and Neon PostgreSQL through the private `DATABASE_URL` environment variable. The connection string is not stored in this repository. All five CRUD routes have been manually tested against the live URL. For future redeployments, push changes to the connected GitHub branch and confirm the Render deployment succeeds.

Render may suspend free builds or services at free-tier limits. Keep payment details off the Render account if you require a hard no-charge guarantee; without a payment method, Render documents that it suspends free services/builds rather than billing for overages.

## Submission checklist

- [x] Lab 2 source migrated to PostgreSQL with all five route paths and response formats preserved.
- [x] Startup seeding inserts the ten sample books only into an empty table.
- [x] Render Blueprint uses Free Web Service configuration and has no persistent disk.
- [x] Install dependencies and run `npm.cmd test` successfully (8 tests passed).
- [x] Configure the private `DATABASE_URL` environment variable in Render.
- [x] Deploy the API and confirm the Render service connects to PostgreSQL.
- [x] Manually test all five CRUD routes against the live service using Postman.
- [ ] Replace historical screenshots with genuine live Postman captures and Neon database evidence.
- [x] Preserve `lab-01/` unchanged.
