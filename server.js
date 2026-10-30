
const express = require("express");
const session = require("express-session");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DB = path.join(__dirname, "data.json");

app.set("trust proxy", 1);
app.use(express.json());

const required = [
  "DISCORD_CLIENT_ID",
  "DISCORD_CLIENT_SECRET",
  "DISCORD_REDIRECT_URI",
  "SESSION_SECRET",
  "DASHBOARD_API_KEY"
];

for (const key of required) {
  if (!process.env[key]) {
    console.error("Missing environment variable:", key);
  }
}

app.use(session({
  name: "aysarp.sid",
  secret: process.env.SESSION_SECRET || "temporary-secret-change-this",
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    httpOnly: true,
    secure: "auto",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000
  }
}));

function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB, "utf8"));
  } catch {
    return {};
  }
}

function writeDB(data) {
  fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

async function discordRequest(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error_description || data.message || "Discord API error");
  }

  return data;
}

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Please sign in with Discord." });
  }
  next();
}

function canManage(guild) {
  const permissions = BigInt(guild.permissions || "0");
  return (permissions & 0x20n) === 0x20n ||
         (permissions & 0x8n) === 0x8n;
}

app.get("/auth/discord", (req, res, next) => {
  const state = crypto.randomBytes(24).toString("hex");
  req.session.oauthState = state;

  req.session.save((err) => {
    if (err) return next(err);

    const params = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      redirect_uri: process.env.DISCORD_REDIRECT_URI,
      response_type: "code",
      scope: "identify guilds",
      state
    });

    res.redirect("https://discord.com/oauth2/authorize?" + params);
  });
});

app.get("/auth/callback", async (req, res, next) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).send("Discord authorization was cancelled.");
    }

    if (!code || !state || !req.session.oauthState ||
        state !== req.session.oauthState) {
      return res.status(400).send(
        "Login state mismatch. Clear site cookies and try again."
      );
    }

    delete req.session.oauthState;

    const tokenData = await discordRequest(
      "https://discord.com/api/oauth2/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.DISCORD_CLIENT_ID,
          client_secret: process.env.DISCORD_CLIENT_SECRET,
          grant_type: "authorization_code",
          code,
          redirect_uri: process.env.DISCORD_REDIRECT_URI
        })
      }
    );

    const headers = {
      Authorization: `Bearer ${tokenData.access_token}`
    };

    const user = await discordRequest(
      "https://discord.com/api/users/@me",
      { headers }
    );

    const guilds = await discordRequest(
      "https://discord.com/api/users/@me/guilds",
      { headers }
    );

    req.session.user = {
      id: user.id,
      username: user.global_name || user.username,
      avatar: user.avatar
    };

    req.session.guilds = guilds.filter(canManage);

    req.session.save((err) => {
      if (err) return next(err);
      res.redirect("/");
    });
  } catch (err) {
    console.error("OAuth callback error:", err);
    res.status(500).send("Discord OAuth failed. Check Render logs.");
  }
});

app.get("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("aysarp.sid");
    res.redirect("/");
  });
});

app.get("/api/me", requireLogin, (req, res) => {
  res.json({
    user: req.session.user,
    username: req.session.user.username,
    guilds: req.session.guilds || []
  });
});

app.get("/api/config/:guildId", requireLogin, (req, res) => {
  const allowed = (req.session.guilds || []).some(
    guild => guild.id === req.params.guildId
  );

  if (!allowed) return res.sendStatus(403);

  const db = readDB();
  res.json(db[req.params.guildId] || {
    enabled: true,
    title: "Welcome to AYS+ARP",
    description: "Thanks for joining our server!",
    color: "#00ffff",
    footer: "Welcome to the community!",
    imageUrl: "",
    welcomeChannelId: "",
    rulesChannelId: "",
    chatChannelId: "",
    updatesChannelId: ""
  });
});

app.put("/api/config/:guildId", requireLogin, (req, res) => {
  const allowed = (req.session.guilds || []).some(
    guild => guild.id === req.params.guildId
  );

  if (!allowed) return res.sendStatus(403);

  const allowedKeys = [
    "enabled", "title", "description", "color", "footer",
    "imageUrl", "welcomeChannelId", "rulesChannelId",
    "chatChannelId", "updatesChannelId"
  ];

  const config = {};
  for (const key of allowedKeys) {
    if (req.body[key] !== undefined) {
      config[key] = req.body[key];
    }
  }

  const db = readDB();
  db[req.params.guildId] = {
    ...(db[req.params.guildId] || {}),
    ...config
  };

  writeDB(db);
  res.json({ ok: true });
});

app.get("/api/bdfd/config", (req, res) => {
  if (req.get("x-dashboard-key") !== process.env.DASHBOARD_API_KEY) {
    return res.sendStatus(401);
  }

  const guildId = req.query.guild;
  if (!guildId) return res.status(400).json({ error: "Missing guild ID" });

  const db = readDB();
  res.json(db[guildId] || {});
});

app.use(express.static(path.join(__dirname, "public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log("AYS+ARP Dashboard running on port", PORT);
});
