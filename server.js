const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const Database = require("better-sqlite3");

const app = express();
const port = process.env.PORT || 3000;
const adminPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(18).toString("base64url");
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const sessionDuration = 8 * 60 * 60 * 1000;
const databasePath = process.env.DB_PATH || path.join(__dirname, "rsvps.db");
fs.mkdirSync(path.dirname(databasePath), { recursive: true });
const database = new Database(databasePath);

database.pragma("journal_mode = WAL");
database.exec(`
    CREATE TABLE IF NOT EXISTS rsvps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guest_name TEXT NOT NULL,
        guest_count INTEGER NOT NULL CHECK (guest_count BETWEEN 1 AND 10),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
`);

app.use(express.json());
app.use(express.static(__dirname));

app.post("/api/admin/login", (request, response) => {
    const password = typeof request.body.password === "string" ? request.body.password : "";

    if (!safeEqual(password, adminPassword)) {
        return response.status(401).json({ error: "Incorrect admin password." });
    }

    const token = createSessionToken();
    const secureCookie = process.env.NODE_ENV === "production" ? "; Secure" : "";
    response.setHeader("Set-Cookie", `admin_session=${token}; HttpOnly; SameSite=Strict; Max-Age=${sessionDuration / 1000}; Path=/${secureCookie}`);
    return response.json({ authenticated: true });
});

app.get("/api/admin/session", (request, response) => {
    return response.json({ authenticated: isAdmin(request) });
});

app.post("/api/admin/logout", (request, response) => {
    const secureCookie = process.env.NODE_ENV === "production" ? "; Secure" : "";
    response.setHeader("Set-Cookie", `admin_session=; HttpOnly; SameSite=Strict; Max-Age=0; Path=/${secureCookie}`);
    return response.json({ authenticated: false });
});

app.post("/api/rsvps", (request, response) => {
    const guestName = typeof request.body.guestName === "string"
        ? request.body.guestName.trim()
        : "";
    const guestCount = Number(request.body.guestCount);

    if (!guestName || guestName.length > 100 || !Number.isInteger(guestCount) || guestCount < 1 || guestCount > 10) {
        return response.status(400).json({ error: "Enter a name and choose between 1 and 10 attendees." });
    }

    const result = database.prepare(
        "INSERT INTO rsvps (guest_name, guest_count) VALUES (?, ?)"
    ).run(guestName, guestCount);

    return response.status(201).json({ id: result.lastInsertRowid });
});

app.get("/api/rsvps", (request, response) => {
    if (!isAdmin(request)) {
        return response.status(401).json({ error: "Admin login required." });
    }

    const rows = database.prepare(
        "SELECT id, guest_name AS name, guest_count AS count, created_at AS submittedAt FROM rsvps ORDER BY created_at DESC"
    ).all();
    return response.json(rows);
});

app.listen(port, () => {
    console.log(`Wedding invitation running at http://localhost:${port}`);
    console.log(`RSVP dashboard: http://localhost:${port}/dashboard.html`);
    if (!process.env.ADMIN_PASSWORD) {
        console.log(`Generated admin password: ${adminPassword}`);
    }
});

function createSessionToken() {
    const expiresAt = Date.now() + sessionDuration;
    const value = `${expiresAt}.${crypto.randomBytes(18).toString("hex")}`;
    const signature = crypto.createHmac("sha256", sessionSecret).update(value).digest("hex");
    return `${value}.${signature}`;
}

function isAdmin(request) {
    const cookies = parseCookies(request.headers.cookie || "");
    const token = cookies.admin_session || "";
    const parts = token.split(".");

    if (parts.length !== 3 || Number(parts[0]) < Date.now()) {
        return false;
    }

    const value = `${parts[0]}.${parts[1]}`;
    const expectedSignature = crypto.createHmac("sha256", sessionSecret).update(value).digest("hex");
    return safeEqual(parts[2], expectedSignature);
}

function parseCookies(cookieHeader) {
    return Object.fromEntries(cookieHeader.split(";").filter(Boolean).map((cookie) => {
        const separator = cookie.indexOf("=");
        return [cookie.slice(0, separator).trim(), decodeURIComponent(cookie.slice(separator + 1).trim())];
    }));
}

function safeEqual(left, right) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
