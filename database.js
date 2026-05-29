const Database = require('better-sqlite3');
const db = new Database('./database.sqlite'); // Conexão síncrona simples

// Cria a tabela de jogadores, histórico e as novas tabelas de Temporadas
db.exec(`
    CREATE TABLE IF NOT EXISTS players (
        discordId TEXT PRIMARY KEY,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        mvps INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS match_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        winner_team TEXT,
        mvp_id TEXT
    );

    -- NOVA TABELA: Guarda configurações globais (como a Temporada Atual)
    CREATE TABLE IF NOT EXISTS server_config (
        key TEXT PRIMARY KEY,
        value INTEGER
    );

    -- Se não existir, define a temporada inicial como 1
    INSERT OR IGNORE INTO server_config (key, value) VALUES ('current_season', 1);

    -- NOVA TABELA: Arquiva o status dos jogadores das temporadas anteriores
    CREATE TABLE IF NOT EXISTS past_seasons (
        discordId TEXT,
        season INTEGER,
        wins INTEGER,
        losses INTEGER,
        mvps INTEGER,
        PRIMARY KEY (discordId, season)
    );
`);

function getDB() {
    return db;
}

module.exports = { getDB };