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
├── Postman-Lab-2-Collection.json
├── render.yaml
├── server.js
├── screenshots/             # capture real Postman/SQLite evidence here
└── test/
    └── books.test.js
```

`node_modules/` is created locally by npm and ignored by Git. `.env` is ignored too. `.env.example` lists the available settings, but this app reads variables directly from the shell or hosting platform; it does not auto-load a `.env` file. The committed `books.db` is the starter database, while the Render service must set `DB_PATH=/var/data/books.db` so changes survive restarts and redeployments.

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

## Automated verification

Run the automated tests with:

```powershell
npm.cmd test
```

Tests exercise all five routes, invalid IDs and input, missing records, database writes, and a SQL injection-like title. These automated tests do not replace the assignment's Postman evidence. For manual Postman verification:

The importable Postman collection is [`Postman-Lab-2-Collection.json`](Postman-Lab-2-Collection.json). It contains the five CRUD requests in the required order and includes a status assertion for each request. The POST test saves the actual returned ID as the collection variable `bookId`; PUT and DELETE use that value, and DELETE clears it after success. Its POST pre-request script clears an old ID before a new run, so later requests cannot accidentally use an ID from a previous run.

### Import and run in Postman Web

1. Start the API using `npm.cmd run dev` and keep the terminal open.
2. Open Postman Web and select **Import**. Choose **Files**, then select `lab-02/Postman-Lab-2-Collection.json` from your project folder.
3. The collection appears in the left sidebar. Open it and run its requests in order: GET all, GET one, POST, PUT, DELETE. You can send the requests individually in that order or use the collection Runner. Do not run PUT or DELETE unless POST succeeded and set `bookId`.
4. In Postman Web, the agent selector is in the footer. Click it and select **Cloud Agent** to choose that agent. Important: Cloud Agent sends requests from Postman's servers and cannot reach your computer's `localhost`; these local URLs will fail with Cloud Agent. To actually run this local collection, select **Desktop Agent** in the same menu (install and open it if prompted), or use the Postman desktop app. This limitation is described in [Postman's agent documentation](https://learning.postman.com/docs/getting-started/basics/about-postman-agent).
5. For each request, confirm the response status and the collection's test result. Expected statuses are `200`, `200`, `201`, `200`, `200` in collection order. POST creates a temporary record; the following PUT updates that returned ID, and DELETE removes that same record.

### Capture genuine screenshots

Capture each screenshot only after its actual Postman response is visible. Keep the request method, URL, response status, response body, and Postman test result in view. Use Windows Snipping Tool (`Win+Shift+S`) or another real screen capture tool, then save the unaltered capture in `lab-02/screenshots/` with these names:

| Capture after | Save as |
| --- | --- |
| GET All Books response | `get-all-books.png` |
| GET Book by ID response | `get-one-book.png` |
| POST Create Book response, showing the returned ID | `post-book.png` |
| PUT Update Book response | `put-book.png` |
| DELETE Book response | `delete-book.png` |
| SQLite query showing the updated temporary row after PUT and before DELETE | `sqlite-records.png` |

For the SQLite capture, open a second PowerShell terminal in `lab-02/` and run:

```powershell
sqlite3.exe .\books.db "SELECT id, title, author, price, pages FROM book ORDER BY id;"
```

If `sqlite3.exe` is not on `PATH`, use its full installed path as described in the database setup section above. Capture this output after PUT so the updated temporary row is visible. After DELETE, run the query again and confirm that temporary row is absent; it should not be present in the screenshot captured before deletion.

The error cases can also be tried manually: a nonnumeric ID and missing fields should return `400`, while a nonexistent numeric ID should return `404`. The required evidence filenames are also listed in [`screenshots/README.md`](screenshots/README.md).

## Screenshots / Evidence

### GET All Books

Postman response showing the list of sample books.

![GET All Books response](screenshots/get-all-books.png)

### GET Book by ID

Postman response showing the book returned for ID 1.

![GET Book by ID response](screenshots/get-one-book.png)

### POST Create Book

Postman response showing the newly created book and returned ID.

![POST Create Book response](screenshots/post-book.png)

### PUT Update Book

Postman response showing the updated temporary book.

![PUT Update Book response](screenshots/put-book.png)

### DELETE Book

Postman response confirming deletion of the temporary book.

![DELETE Book response](screenshots/delete-book.png)

### SQLite Database Records

SQLite CLI output showing the database records, including the updated temporary book before deletion.

![SQLite database records](screenshots/sqlite-records.png)

## Problems faced and solutions

During setup, the Windows shared npm cache blocked a native `sqlite3` prebuilt download, causing npm to attempt a local compile without Visual Studio C++ Build Tools. Installing with a project-local npm cache fixed the download. A newer `sqlite3` release also replaced an older release whose build-time dependency tree was flagged by npm's audit; this project therefore requires Node.js 20.17 or newer. The issue is recorded here; it does not imply that Postman or deployment has been completed.

## Deployment with persistent SQLite data

The Render blueprint in `render.yaml` points the service root at `lab-02` and mounts a persistent disk at `/var/data`; it configures SQLite to write to `/var/data/books.db`. When importing the Blueprint, select `lab-02/render.yaml` as the Blueprint file. Render currently requires a paid web-service plan for persistent disks. Create the service from the blueprint, select a plan that supports the disk, wait for a successful deploy, and test the public endpoint URLs. A disk-backed SQLite file persists across service restarts; without the disk, filesystem changes may be lost. Add the real public base URL here only after deployment and live endpoint checks succeed.

## Submission checklist

- [x] Lab 2 source, database seed SQL, dependency manifests, and Render persistent-disk configuration are in `lab-02/`.
- [ ] Install dependencies successfully and run `npm.cmd test`.
- [ ] Test all routes and error cases in Postman.
- [ ] Capture and add the five genuine Postman screenshots and one SQLite CLI screenshot.
- [ ] Confirm database rows after POST, PUT, and DELETE using SQLite CLI.
- [ ] Create the Render service with its persistent disk and test the deployed API.
- [ ] Re-run Lab 1 checks and confirm `lab-01/` remains unchanged.
