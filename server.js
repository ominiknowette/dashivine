const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 8080);
const ROOT = __dirname;
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function loadEnvFile() {
  const envPath = path.join(ROOT, ".env");
  console.log("Loading env file from:", envPath);
  if (!fs.existsSync(envPath)) {
    console.log("No .env file found");
    return;
  }

  const raw = fs.readFileSync(envPath);
  let content;
  if (raw.length >= 2 && raw[0] === 0xff && raw[1] === 0xfe) {
    content = raw.toString("utf16le");
  } else {
    content = raw.toString("utf8");
  }

  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const splitIndex = trimmed.indexOf("=");
    if (splitIndex === -1) return;
    const key = trimmed.slice(0, splitIndex).trim();
    const value = trimmed.slice(splitIndex + 1).trim();
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  });

  console.log("Env loaded:", {
    hasTwilioSid: Boolean(process.env.TWILIO_ACCOUNT_SID),
    hasTwilioToken: Boolean(process.env.TWILIO_AUTH_TOKEN),
    whatsappFrom: process.env.WHATSAPP_FROM || null,
    whatsappTo: process.env.WHATSAPP_TO || null
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

function serveFile(filePath, response) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendJson(response, 404, { error: "Not found" });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream"
    });
    response.end(data);
  });
}

async function notify(payload) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const whatsappFrom = process.env.WHATSAPP_FROM;
  const whatsappTo = (process.env.WHATSAPP_TO || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!accountSid || !authToken || !whatsappFrom || whatsappTo.length === 0) {
    throw new Error("Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, WHATSAPP_FROM, or WHATSAPP_TO");
  }

  const scoreLine = `${payload.correctAnswers}/${payload.totalQuestions} (${payload.score}%)`;
  const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const body = new URLSearchParams();
  body.set("From", whatsappFrom);
  body.set("Body", "Come outside your hostel.");
  whatsappTo.forEach((entry) => body.append("To", entry));

  console.log("Attempting WhatsApp send", {
    from: whatsappFrom,
    to: whatsappTo,
    scoreLine
  });

  const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString()
  });

  if (!twilioResponse.ok) {
    const responseBody = await twilioResponse.text();
    throw new Error(`Twilio request failed: ${responseBody}`);
  }

  const successBody = await twilioResponse.text();
  console.log("WhatsApp send response", successBody);
}

loadEnvFile();

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "POST" && requestUrl.pathname === "/api/notify") {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
    });
    request.on("end", async () => {
      try {
        const payload = raw ? JSON.parse(raw) : {};
        console.log("Received notify request", payload);
        await notify(payload);
        sendJson(response, 200, { ok: true });
      } catch (error) {
        console.error("Notify route failed:", error.message);
        sendJson(response, 500, { error: error.message });
      }
    });
    return;
  }

  const decodedPathname = decodeURIComponent(requestUrl.pathname);
  let filePath = decodedPathname === "/" ? path.join(ROOT, "index.html") : path.join(ROOT, decodedPathname);
  filePath = path.normalize(filePath);

  if (!filePath.startsWith(ROOT)) {
    sendJson(response, 403, { error: "Forbidden" });
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  serveFile(filePath, response);
});

server.listen(PORT, () => {
  console.log(`Dashivine site running on http://localhost:${PORT}`);
});
