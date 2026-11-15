mod ble;
mod vault;

use std::fs;
use tauri::Manager;
use vault::Vault;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            fs::create_dir_all(&data_dir)?;
            let database_path = data_dir.join("aster.sqlite3");
            app.manage(Vault::open(database_path)?);
            app.manage(ble::BleMonitor::default());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            vault::load_vault,
            vault::save_vault,
            ble::start_heart_rate_monitor,
            ble::stop_heart_rate_monitor
        ])
        .run(tauri::generate_context!())
        .expect("Aster desktop runtime failed");
}
