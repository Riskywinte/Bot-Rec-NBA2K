const Database = require('better-sqlite3');
const db = new Database('./database.sqlite'); // Conexão síncrona simples

// Cria a tabela caso não exista
db.exec(`
    CREATE TABLE IF NOT EXISTS players (
        discordId TEXT PRIMARY KEY,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        mvps INTEGER DEFAULT 0
    )
`);

function getDB() {
    return db;
}

module.exports = { getDB };