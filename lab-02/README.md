# Lab 2 — SQLite Database and CRUD Routes

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

**Status: Not deployed.** This app is configured for a Render persistent disk in [`render.yaml`](render.yaml), because a SQLite database must live on persistent storage. Create the service from this blueprint and attach/confirm the persistent disk before relying on a public deployment. Do not configure the SQLite file on an ephemeral filesystem. No live URL is claimed yet.

## What this lab teaches

The app uses Express to receive HTTP requests and SQLite to store books in a local relational database. Each route awaits its database operation before it sends the response. SQL placeholders (`?`) keep user supplied values separate from SQL instructions.

## Project structure

```text
lab-02/
├── .env.example
├── .gitignore
├── README.md
├── books.sql
├── books.db                 # generated SQLite database, intentionally tracked
├── package.json
├── package-lock.json
├── render.yaml
├── server.js
├── screenshots/             # capture real Postman/SQLite evidence here
└── test/
    └── books.test.js
```

`node_modules/` is created locally by npm and ignored by Git. `.env` is ignored as well; copy `.env.example` to `.env` only if you want local environment overrides. The committed `books.db` is the starter database, while the Render service must set `DB_PATH=/var/data/books.db` so changes survive restarts and redeployments.

## Requirements and installation

Install Node.js 20.17+ and npm. The project uses Express for HTTP routes, `sqlite` for Promise-based database calls, `sqlite3` as the SQLite driver, and nodemon for automatic restarts. Supertest is used by the automated route tests.

In PowerShell, open a terminal in this `lab-02/` directory and run:

```powershell
npm.cmd install
```

On Windows, `npm.cmd` avoids PowerShell script execution policy restrictions.

## Database setup

The database file is `books.db`; its table is `book` with `id INTEGER PRIMARY KEY`, `title TEXT`, `author TEXT`, `price INTEGER`, and `pages INTEGER`. The schema and ten sample rows are in [`books.sql`](books.sql). A new empty database is initialized with the same table schema on server startup; the committed starter database already has the sample books.

To create/reseed it using the SQLite command-line program, run this from the `lab-02/` folder (the `-bail` flag stops at SQL errors):

```powershell
sqlite3.exe -bail books.db ".read books.sql"
```

If `sqlite3.exe` is not installed, download the official **sqlite-tools-win-x64** bundle from the [SQLite download page](https://www.sqlite.org/download.html), extract it, and either add its folder to `PATH` or run the command with the full path to `sqlite3.exe`.

`books.sql` inserts the ten starter rows, so use this command only to create a fresh database or when you intentionally want to restore those sample records. To inspect existing data without changing it:

```powershell
sqlite3.exe books.db "SELECT * FROM book;"
```

## Run the server

Start with nodemon during development:

```powershell
npm.cmd run dev
```

Nodemon watches the project JavaScript and restarts the server after code changes. The API is at `http://localhost:3001`. Keep that terminal open while testing. Press `Ctrl+C` to stop the process. For a normal start without watching files, run `npm.cmd start`.

The asynchronous `initializeDBAndServer()` function opens SQLite and waits for that connection, initializes the table if needed, and only then starts Express. If opening or preparing the database fails, it logs the error and the server does not start.

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

Every SQL statement that uses a request value binds it with `?` parameters. No request value is concatenated into SQL text.

## Verification

Run the automated tests with:

```powershell
npm.cmd test
```

Tests exercise all five routes, invalid IDs and input, missing records, database writes, and a SQL injection-like title. These automated tests do not replace the assignment's Postman evidence. For manual Postman verification:

1. Start the server, then create a Postman request for each method and path in the endpoint table.
2. For POST, send `{"title":"Postman Sample","author":"Student","price":275,"pages":150}` as raw JSON. Record the returned ID.
3. GET the new ID, PUT it with updated values, GET it again, then DELETE it and confirm GET returns `404`.
4. Also try a nonnumeric ID, a nonexistent numeric ID, a missing field, and an invalid price. Note their `400` or `404` responses.
5. Run `sqlite3.exe books.db "SELECT * FROM book;"` and compare the stored rows to the API results.
6. Capture genuine screenshots with the request URL, method, response status, and response body visible. Save the five request captures and database capture using the filenames listed in [`screenshots/README.md`](screenshots/README.md). No screenshots are included until real captures are provided.

## Problems faced and solutions

During setup, the Windows shared npm cache blocked a native `sqlite3` prebuilt download, causing npm to attempt a local compile without Visual Studio C++ Build Tools. Installing with a project-local npm cache fixed the download. A newer `sqlite3` release also replaced an older release whose build-time dependency tree was flagged by npm's audit; this project therefore requires Node.js 20.17 or newer. The issue is recorded here; it does not imply that Postman or deployment has been completed.

## Deployment with persistent SQLite data

The Render blueprint in `render.yaml` points the service root at `lab-02` and mounts a persistent disk at `/var/data`; it configures SQLite to write to `/var/data/books.db`. Render currently requires a paid web-service plan for persistent disks. Create the service from the blueprint, select a plan that supports the disk, wait for a successful deploy, and test the public endpoint URLs. A disk-backed SQLite file persists across service restarts; without the disk, filesystem changes may be lost. Add the real public base URL here only after deployment and live endpoint checks succeed.

## Submission checklist

- [x] Lab 2 source, database seed SQL, dependency manifests, and Render persistent-disk configuration are in `lab-02/`.
- [ ] Install dependencies successfully and run `npm.cmd test`.
- [ ] Test all routes and error cases in Postman.
- [ ] Capture and add the five genuine Postman screenshots and one SQLite CLI screenshot.
- [ ] Confirm database rows after POST, PUT, and DELETE using SQLite CLI.
- [ ] Create the Render service with its persistent disk and test the deployed API.
- [ ] Re-run Lab 1 checks and confirm `lab-01/` remains unchanged.
