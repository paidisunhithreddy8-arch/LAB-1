const assert = require("node:assert/strict");
const { after, before, describe, it } = require("node:test");
const app = require("../server");
const { createHttpServer } = require("../http-server");

let expressServer;
let httpServer;
let expressBase;
let httpBase;

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.removeListener("error", reject);
      resolve(server.address().port);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

before(async () => {
  expressServer = app.listen(0, "127.0.0.1");
  httpServer = createHttpServer();
  const [expressPort, httpPort] = await Promise.all([
    new Promise((resolve) => expressServer.once("listening", () => resolve(expressServer.address().port))),
    listen(httpServer)
  ]);
  expressBase = `http://127.0.0.1:${expressPort}`;
  httpBase = `http://127.0.0.1:${httpPort}`;
});

after(async () => {
  await Promise.all([close(expressServer), close(httpServer)]);
});

describe("Express server", () => {
  it("GET / returns the welcome message with status 200", async () => {
    const response = await fetch(`${expressBase}/`);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "Welcome to my Node.js and Express server!");
  });

  it("GET /about returns the required student details", async () => {
    const response = await fetch(`${expressBase}/about`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      name: "Paidi Sunhith Reddy",
      registrationNumber: "252U1R1174",
      class: "214",
      section: "CSE1D",
      college: "Aurora Deemed to be University",
      faculty: "Shiva Teja"
    });
  });

  it("GET /time returns a valid ISO timestamp", async () => {
    const response = await fetch(`${expressBase}/time`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(typeof body.time, "string");
    assert.equal(new Date(body.time).toISOString(), body.time);
  });

  it("unknown paths return status 404 and the not-found message", async () => {
    const response = await fetch(`${expressBase}/unknown`);
    assert.equal(response.status, 404);
    assert.equal(await response.text(), "404 - Page Not Found");
  });
});

describe("plain Node.js HTTP server", () => {
  it("GET / returns exactly Hello with status 200", async () => {
    const response = await fetch(`${httpBase}/`);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "Hello");
  });

  it("unknown paths return status 404 and the not-found message", async () => {
    const response = await fetch(`${httpBase}/unknown`);
    assert.equal(response.status, 404);
    assert.equal(await response.text(), "404 - Page Not Found");
  });
});
