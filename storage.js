const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "data");
const dbFile = path.join(dataDir, "db.json");

const defaultDb = {
  guilds: {}
};

let db = structuredClone(defaultDb);

function ensureDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

function loadDB() {
  ensureDir();
  if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify(defaultDb, null, 2));
    db = structuredClone(defaultDb);
    return db;
  }

  try {
    const raw = fs.readFileSync(dbFile, "utf8");
    db = JSON.parse(raw || "{}");
    db.guilds ||= {};
  } catch {
    db = structuredClone(defaultDb);
  }

  return db;
}

function saveDB() {
  ensureDir();
  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
}

function guild(guildId) {
  db.guilds[guildId] ||= {
    config: {
      autoroleId: null,
      welcome: null,
      goodbye: null,
      logChannelId: null,
      staffApplyMessage: null,
      staffApplyLink: null,
      ticketLogChannelId: null
    },
    afk: {},
    warnings: {},
    offenses: {},
    chatFilters: [],
    giveaways: [],
    tickets: {}
  };

  const g = db.guilds[guildId];
  g.config ||= {};
  g.afk ||= {};
  g.warnings ||= {};
  g.offenses ||= {};
  g.chatFilters ||= [];
  g.giveaways ||= [];
  g.tickets ||= {};
  return g;
}

module.exports = {
  db,
  loadDB,
  saveDB,
  guild
};