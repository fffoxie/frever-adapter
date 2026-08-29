const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.raw({ type: "application/vnd.google.protobuf", limit: "50mb" }));
app.use(bodyParser.raw({ type: "*/*", limit: "50mb" }));

const LOG_DIR = path.join(__dirname, "logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);

function logRequest(req, body) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    method: req.method,
    url: req.url,
    headers: req.headers,
    bodyLength: body ? body.length : 0,
    bodyHex: body ? body.toString("hex").substring(0, 2000) : null,
    bodyBase64: body ? body.toString("base64").substring(0, 2000) : null,
  };
  const logFile = path.join(LOG_DIR, `${timestamp.split("T")[0]}.jsonl`);
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + "\n");
  console.log(`[${timestamp}] ${req.method} ${req.url} (${body ? body.length : 0} bytes)`);
  return logEntry;
}

app.get("/health", (req, res) => {
  console.log("[HEALTH CHECK]");
  res.status(200).json({ status: "ok", server: "frever-adapter", timestamp: new Date().toISOString() });
});

app.post("/health", (req, res) => {
  console.log("[HEALTH CHECK POST]");
  res.status(200).json({ status: "ok", server: "frever-adapter", timestamp: new Date().toISOString() });
});

app.post("/reroute", (req, res) => {
  const body = req.body;
  const logEntry = logRequest(req, body);
  console.log("\\n=== INCOMING REQUEST ===");
  console.log("URL:", req.url);
  console.log("Content-Type:", req.headers["content-type"]);
  console.log("Body length:", body ? body.length : 0, "bytes");
  if (body && body.length > 0) {
    console.log("Body (hex):", body.toString("hex").substring(0, 500));
    console.log("Body (base64):", body.toString("base64").substring(0, 500));
    const readable = body.toString("utf8").replace(/[\\x00-\\x08\\x0e-\\x1f]/g, "");
    if (readable.length > 10) console.log("Readable strings:", readable.substring(0, 500));
  }
  const mockResponse = Buffer.from([0x08, 0x01, 0x12, 0x00]);
  res.setHeader("Content-Type", "application/vnd.google.protobuf");
  res.status(200).send(mockResponse);
  console.log("=== SENT MOCK RESPONSE ===\\n");
});

app.use((req, res) => {
  logRequest(req, req.body);
  console.log(`[CATCH-ALL] ${req.method} ${req.url}`);
  res.status(200).json({ status: "ok", message: "Adapter received request", path: req.url, method: req.method });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\\nFrever Adapter Server running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`Reroute: http://localhost:${PORT}/reroute`);
});