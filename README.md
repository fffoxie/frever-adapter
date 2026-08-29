# Frever Adapter Server

Protobuf-to-REST adapter for the Frever mobile app.

## What it does

The Frever app communicates with a server using Protobuf-net protocol. This adapter:

1. Receives Protobuf requests from the app on `/reroute`
2. Logs the request details (hex dump, base64, readable strings)
3. Returns mock responses while we analyze the protocol

## Deployment

### Vercel
```bash
vercel deploy
```

### Railway
```bash
railway up
```

### Local
```bash
npm install
npm start
```

## Endpoints

- `GET /health` - Health check
- `POST /reroute` - Main API endpoint (Protobuf)

## Logs

All requests are logged to `logs/YYYY-MM-DD.jsonl` for protocol analysis.