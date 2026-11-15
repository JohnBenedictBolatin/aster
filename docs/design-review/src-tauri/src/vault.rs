use std::path::PathBuf;
use std::sync::Mutex;

use rusqlite::{params, Connection, Transaction};
use serde_json::Value;
use tauri::State;

pub struct Vault(pub Mutex<Connection>);

impl Vault {
    pub fn open(path: PathBuf) -> Result<Self, Box<dyn std::error::Error>> {
        let connection = Connection::open(path)?;
        connection.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA foreign_keys = ON;
             CREATE TABLE IF NOT EXISTS vault_meta (
               key TEXT PRIMARY KEY NOT NULL,
               value TEXT NOT NULL
             );
             CREATE TABLE IF NOT EXISTS observations (
               scenario_id TEXT NOT NULL, id TEXT NOT NULL, occurred_at TEXT, synthetic INTEGER NOT NULL,
               payload TEXT NOT NULL, PRIMARY KEY (scenario_id, id)
             );
             CREATE TABLE IF NOT EXISTS contexts (
               scenario_id TEXT NOT NULL, id TEXT NOT NULL, occurred_at TEXT, synthetic INTEGER NOT NULL,
               payload TEXT NOT NULL, PRIMARY KEY (scenario_id, id)
             );
             CREATE TABLE IF NOT EXISTS investigations (
               scenario_id TEXT NOT NULL, id TEXT NOT NULL, occurred_at TEXT, synthetic INTEGER NOT NULL,
               payload TEXT NOT NULL, PRIMARY KEY (scenario_id, id)
             );
             CREATE TABLE IF NOT EXISTS tasks (
               scenario_id TEXT NOT NULL, id TEXT NOT NULL, occurred_at TEXT, synthetic INTEGER NOT NULL,
               payload TEXT NOT NULL, PRIMARY KEY (scenario_id, id)
             );
             CREATE TABLE IF NOT EXISTS mission_events (
               scenario_id TEXT NOT NULL, id TEXT NOT NULL, occurred_at TEXT, synthetic INTEGER NOT NULL,
               payload TEXT NOT NULL, PRIMARY KEY (scenario_id, id)
             );
             CREATE TABLE IF NOT EXISTS cabin_readings (
               scenario_id TEXT NOT NULL, id TEXT NOT NULL, occurred_at TEXT, synthetic INTEGER NOT NULL,
               payload TEXT NOT NULL, PRIMARY KEY (scenario_id, id)
             );
             CREATE TABLE IF NOT EXISTS radiation_readings (
               scenario_id TEXT NOT NULL, id TEXT NOT NULL, occurred_at TEXT, synthetic INTEGER NOT NULL,
               payload TEXT NOT NULL, PRIMARY KEY (scenario_id, id)
             );
             CREATE TABLE IF NOT EXISTS reaction_sessions (
               scenario_id TEXT NOT NULL, id TEXT NOT NULL, occurred_at TEXT, synthetic INTEGER NOT NULL,
               payload TEXT NOT NULL, PRIMARY KEY (scenario_id, id)
             );
             CREATE TABLE IF NOT EXISTS handoffs (
               scenario_id TEXT NOT NULL, id TEXT NOT NULL, occurred_at TEXT, synthetic INTEGER NOT NULL,
               payload TEXT NOT NULL, PRIMARY KEY (scenario_id, id)
             );
             CREATE TABLE IF NOT EXISTS live_observations (
               id TEXT PRIMARY KEY NOT NULL, occurred_at TEXT, synthetic INTEGER NOT NULL,
               payload TEXT NOT NULL
             );",
        )?;
        Ok(Self(Mutex::new(connection)))
    }
}

#[tauri::command]
pub fn load_vault(vault: State<'_, Vault>) -> Result<Option<Value>, String> {
    let connection = vault.0.lock().map_err(|_| "Local vault is unavailable".to_string())?;
    let serialized = connection
        .query_row("SELECT value FROM vault_meta WHERE key = 'current_snapshot'", [], |row| row.get::<_, String>(0))
        .optional()
        .map_err(|error| format!("Could not read the local vault: {error}"))?;
    serialized.map(|value| serde_json::from_str(&value).map_err(|error| format!("Saved record is unreadable: {error}"))).transpose()
}

#[tauri::command]
pub fn save_vault(vault: State<'_, Vault>, snapshot: Value) -> Result<(), String> {
    if snapshot.get("schemaVersion").and_then(Value::as_u64) != Some(2) {
        return Err("Unsupported Aster vault version".to_string());
    }
    let serialized = serde_json::to_string(&snapshot).map_err(|error| format!("Could not prepare local records: {error}"))?;
    let mut connection = vault.0.lock().map_err(|_| "Local vault is unavailable".to_string())?;
    let transaction = connection.transaction().map_err(|error| format!("Could not start local save: {error}"))?;
    let result = persist_snapshot(&transaction, &snapshot, &serialized);
    match result {
        Ok(()) => transaction.commit().map_err(|error| format!("Could not complete local save: {error}")),
        Err(error) => {
            let _ = transaction.rollback();
            Err(error)
        }
    }
}

fn persist_snapshot(transaction: &Transaction<'_>, snapshot: &Value, serialized: &str) -> Result<(), String> {
    transaction.execute(
        "INSERT INTO vault_meta (key, value) VALUES ('current_snapshot', ?1)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![serialized],
    ).map_err(|error| format!("Could not update local snapshot: {error}"))?;
    transaction.execute(
        "INSERT INTO vault_meta (key, value) VALUES ('schema_version', '2')
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [],
    ).map_err(|error| format!("Could not update the vault schema version: {error}"))?;

    let tables = [
        "observations", "contexts", "investigations", "tasks", "mission_events", "cabin_readings",
        "radiation_readings", "reaction_sessions", "handoffs", "live_observations",
    ];
    for table in tables {
        transaction.execute(&format!("DELETE FROM {table}"), [])
            .map_err(|error| format!("Could not update {table}: {error}"))?;
    }

    for scenario in ["recovery", "cabin", "radiation"] {
        let workspace = snapshot.pointer(&format!("/workspaces/{scenario}"));
        for (table, property) in [
            ("observations", "observations"), ("contexts", "contexts"), ("investigations", "investigations"),
            ("tasks", "tasks"), ("mission_events", "events"), ("cabin_readings", "cabinReadings"),
            ("radiation_readings", "radiationReadings"), ("reaction_sessions", "reactionSessions"),
            ("handoffs", "handoffs"),
        ] {
            if let Some(rows) = workspace.and_then(|value| value.get(property)).and_then(Value::as_array) {
                for row in rows {
                    store_row(transaction, table, Some(scenario), row)?;
                }
            }
        }
    }
    if let Some(rows) = snapshot.get("liveObservations").and_then(Value::as_array) {
        for row in rows {
            store_row(transaction, "live_observations", None, row)?;
        }
    }
    Ok(())
}

fn store_row(transaction: &Transaction<'_>, table: &str, scenario: Option<&str>, row: &Value) -> Result<(), String> {
    let id = row.get("id").and_then(Value::as_str).ok_or_else(|| format!("A {table} record is missing its identifier"))?;
    let occurred_at = ["at", "openedAt", "createdAt", "queuedAt", "startedAt", "due"]
        .iter().find_map(|key| row.get(*key).and_then(Value::as_str));
    let synthetic = row.get("synthetic").and_then(Value::as_bool).unwrap_or(table != "live_observations");
    let payload = serde_json::to_string(row).map_err(|error| format!("Could not serialize {table}: {error}"))?;
    let query = if scenario.is_some() {
        format!("INSERT INTO {table} (scenario_id, id, occurred_at, synthetic, payload) VALUES (?1, ?2, ?3, ?4, ?5)")
    } else {
        format!("INSERT INTO {table} (id, occurred_at, synthetic, payload) VALUES (?1, ?2, ?3, ?4)")
    };
    if let Some(scenario_id) = scenario {
        transaction.execute(&query, params![scenario_id, id, occurred_at, synthetic, payload])
    } else {
        transaction.execute(&query, params![id, occurred_at, synthetic, payload])
    }.map_err(|error| format!("Could not save {table} record {id}: {error}"))?;
    Ok(())
}

use rusqlite::OptionalExtension;
