const Database = require('better-sqlite3');
const db = new Database('./database.sqlite'); 

db.exec(`
    CREATE TABLE IF NOT EXISTS players (
        discordId TEXT,
        position TEXT,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        mvps INTEGER DEFAULT 0,
        PRIMARY KEY (discordId, position)
    );

    CREATE TABLE IF NOT EXISTS match_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        winner_team TEXT,
        mvp_id TEXT
    );

    CREATE TABLE IF NOT EXISTS server_config (
        key TEXT PRIMARY KEY,
        value INTEGER
    );

    INSERT OR IGNORE INTO server_config (key, value) VALUES ('current_season', 1);

    -- Tabela past_seasons ATUALIZADA com a posição
    CREATE TABLE IF NOT EXISTS past_seasons (
        discordId TEXT,
        position TEXT,
        season INTEGER,
        wins INTEGER,
        losses INTEGER,
        mvps INTEGER,
        PRIMARY KEY (discordId, position, season)
    );
`);

function getDB() {
    return db;
}

module.exports = { getDB };