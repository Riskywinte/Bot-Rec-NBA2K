const Database = require('better-sqlite3');
const db = new Database('./database.sqlite'); 

db.exec(`
    CREATE TABLE IF NOT EXISTS players (
        discordId TEXT,
        position TEXT,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        PRIMARY KEY (discordId, position)
    );

    CREATE TABLE IF NOT EXISTS match_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        winner_team TEXT,
        team1_members TEXT,
        team2_members TEXT
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
        PRIMARY KEY (discordId, position, season)
    );
`);

const matchHistoryColumns = db.prepare('PRAGMA table_info(match_history)').all().map(col => col.name);
if (!matchHistoryColumns.includes('team1_members')) {
    db.prepare('ALTER TABLE match_history ADD COLUMN team1_members TEXT').run();
}
if (!matchHistoryColumns.includes('team2_members')) {
    db.prepare('ALTER TABLE match_history ADD COLUMN team2_members TEXT').run();
}

function getDB() {
    return db;
}

module.exports = { getDB };