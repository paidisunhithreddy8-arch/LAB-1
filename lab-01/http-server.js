const http = require("node:http");

const PORT = process.env.PORT || 3000;

// Keep the factory export so the automated tests can use a temporary port.
function createHttpServer() {
  return http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Hello");
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 - Page Not Found");
  });
}

if (require.main === module) {
  createHttpServer().listen(PORT, () => {
    console.log(`Plain Node.js HTTP server running at http://localhost:${PORT}`);
  });
}

module.exports = { createHttpServer };
