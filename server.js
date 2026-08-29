const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
app.use(bodyParser.raw({ type: "application/vnd.google.protobuf", limit: "50mb" }));
app.use(bodyParser.raw({ type: "*/*", limit: "50mb" }));

const LOG_DIR = path.join(__dirname, "logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);

function logRequest(req, body) {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, method: req.method, url: req.url, path: req.path, query: req.query, headers: req.headers, bodyLength: body ? body.length : 0 };
  if (body && body.length > 0) { try { logEntry.bodyJson = JSON.parse(body.toString("utf8")); } catch(e) { logEntry.bodyHex = body.toString("hex").substring(0, 2000); } }
  const logFile = path.join(LOG_DIR, `${timestamp.split("T")[0]}.jsonl`);
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + "\n");
  console.log(`[${timestamp}] ${req.method} ${req.url} (${body ? body.length : 0} bytes)`);
  return logEntry;
}

app.all("/health", (req, res) => res.status(200).json({ status: "ok", server: "frever-adapter" }));

app.get("/api/client/urls", (req, res) => {
  const host = req.headers.host || "localhost:3000";
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const baseUrl = `${protocol}://${host}`;
  console.log(`[CONFIG] Serving client URLs from ${baseUrl}`);
  res.json({ webSocketServerUrl: baseUrl, webUrl: baseUrl, apiBaseUrl: baseUrl, contentUrl: baseUrl });
});

app.get("/api/Client/SupportedVersions", (req, res) => res.json({ minVersion: "4.0.5", latestVersion: "4.0.5", isSupported: true }));

app.post("/connect/token", (req, res) => {
  logRequest(req, req.body);
  const { grant_type } = req.body || {};
  const userId = crypto.randomUUID();
  const token = crypto.randomBytes(32).toString("hex");
  console.log(`[AUTH] Token request: ${grant_type}, user: ${userId}`);
  res.json({ access_token: token, token_type: "Bearer", expires_in: 3600, refresh_token: crypto.randomBytes(32).toString("hex"), userId });
});

app.post("/account/RegisterTemporaryAccount", (req, res) => {
  logRequest(req, req.body);
  const userId = crypto.randomUUID();
  console.log(`[ACCOUNT] Temp account: ${userId}`);
  res.json({ userId, nickname: "Player" + Math.floor(Math.random() * 9999), accessToken: crypto.randomBytes(32).toString("hex"), refreshToken: crypto.randomBytes(32).toString("hex"), expiresIn: 3600 });
});

app.post("/account/update", (req, res) => { logRequest(req, req.body); res.json({ success: true }); });
app.post("/account/ValidatePassword", (req, res) => { logRequest(req, req.body); res.json({ isValid: true, strength: "strong" }); });
app.get("/account/suggestnicknames", (req, res) => { const count = parseInt(req.query.count) || 5; res.json({ nicknames: Array.from({ length: count }, () => "Player" + Math.floor(Math.random() * 99999)) }); });
app.post("/account/assignparentemail", (req, res) => { logRequest(req, req.body); res.json({ success: true }); });
app.post("/account/verifyparentemail", (req, res) => { logRequest(req, req.body); res.json({ success: true }); });
app.get("/account/CheckIfParentEmailBound", (req, res) => res.json({ bound: false }));
app.post("/account/ConfigureParentalConsent", (req, res) => { logRequest(req, req.body); res.json({ success: true }); });

app.get("/crew/:id", (req, res) => { logRequest(req, null); res.json({ id: req.params.id, name: "Test Crew", memberCount: 1 }); });
app.get("/crew/:id/members/top-list", (req, res) => res.json({ members: [] }));
app.post("/crew/join", (req, res) => { logRequest(req, req.body); res.json({ success: true }); });
app.post("/crew/leave", (req, res) => { logRequest(req, req.body); res.json({ success: true }); });
app.get("/crew/invitations", (req, res) => res.json({ invitations: [] }));
app.get("/crew/my/chat", (req, res) => res.json({ channels: [] }));
app.get("/crew/top", (req, res) => res.json({ crews: [] }));
app.get("/crew/validate", (req, res) => res.json({ available: true }));

app.get("/creator-code/my", (req, res) => res.json({ code: null, level: 0 }));
app.get("/creator-code/usage", (req, res) => res.json({ usage: [] }));
app.get("/creator-code/my/supporters/count", (req, res) => res.json({ count: 0 }));

app.get("/daily-quest/:id", (req, res) => res.json({ quests: [] }));
app.get("/deals/season-level", (req, res) => res.json({ deals: [] }));
app.get("/battle/:id", (req, res) => res.json({ battles: [] }));
app.get("/achievement", (req, res) => res.json({ achievements: [] }));

app.get("/baking/characters", (req, res) => res.json({ characters: [] }));
app.get("/baking/non-baked", (req, res) => res.json({ count: 0 }));
app.get("/asset/moderation/wardrobe/baking/availability", (req, res) => res.json({ available: true }));

app.post("/ai/text-to-image/stable-diffusion-xl-1024-v1-0", (req, res) => { logRequest(req, req.body); res.json({ jobId: crypto.randomUUID(), status: "processing" }); });
app.post("/ai/v1/replicate", (req, res) => { logRequest(req, req.body); res.json({ jobId: crypto.randomUUID(), status: "processing" }); });
app.get("/ai/poll-status/:id", (req, res) => res.json({ status: "completed", result: null }));

app.get("/create-page", (req, res) => res.json({ sections: [] }));
app.get("/create-page/content", (req, res) => res.json({ content: [] }));

app.post("/reroute", (req, res) => {
  logRequest(req, req.body);
  console.log(`\n=== /reroute === Content-Type: ${req.headers["content-type"]}, Body: ${req.body ? req.body.length : 0} bytes`);
  res.setHeader("Content-Type", "application/json");
  res.status(200).send(JSON.stringify({ status: "ok" }));
});

app.use((req, res) => {
  logRequest(req, req.body);
  console.log(`[CATCH-ALL] ${req.method} ${req.url}`);
  res.status(200).json({ status: "ok", path: req.url });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\nFrever Adapter v2 — port ${PORT}`);
  console.log(`Health: /health | Config: /api/client/urls | Reroute: /reroute\n`);
});