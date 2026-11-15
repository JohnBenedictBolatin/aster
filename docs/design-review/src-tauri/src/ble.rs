use std::sync::Mutex;
use std::time::Duration;

use btleplug::api::{Central, Manager as BleManager, Peripheral as BlePeripheral, ScanFilter};
use btleplug::platform::{Manager, Peripheral};
use futures_util::StreamExt;
use serde::Serialize;
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

const HEART_RATE_SERVICE: Uuid = Uuid::from_u128(0x0000180d_0000_1000_8000_00805f9b34fb);
const HEART_RATE_MEASUREMENT: Uuid = Uuid::from_u128(0x00002a37_0000_1000_8000_00805f9b34fb);

#[derive(Default)]
pub struct BleMonitor(Mutex<Option<ActiveMonitor>>);

struct ActiveMonitor {
    peripheral: Peripheral,
    task: tauri::async_runtime::JoinHandle<()>,
}

#[derive(Clone, Serialize)]
struct HeartRateSample {
    bpm: u16,
    received_at: u64,
    sensor_contact: &'static str,
}

#[tauri::command]
pub async fn start_heart_rate_monitor(app: AppHandle, monitor: State<'_, BleMonitor>) -> Result<String, String> {
    stop_active_monitor(&monitor).await;
    let manager = Manager::new().await.map_err(|error| format!("Could not access Bluetooth: {error}"))?;
    let adapters = manager.adapters().await.map_err(|error| format!("Could not find a Bluetooth adapter: {error}"))?;
    if adapters.is_empty() {
        return Err("No Bluetooth adapter is available on this device.".to_string());
    }

    let mut match_device: Option<(Peripheral, String)> = None;
    for adapter in adapters {
        adapter.start_scan(ScanFilter { services: vec![HEART_RATE_SERVICE] }).await
            .map_err(|error| format!("Could not scan for heart-rate monitors: {error}"))?;
        tokio::time::sleep(Duration::from_secs(3)).await;
        let devices = adapter.peripherals().await.map_err(|error| format!("Could not read nearby devices: {error}"))?;
        for peripheral in devices {
            let properties = peripheral.properties().await.map_err(|error| format!("Could not inspect a nearby device: {error}"))?;
            if let Some(properties) = properties {
                if properties.services.contains(&HEART_RATE_SERVICE) {
                    let name = properties.local_name.filter(|name| !name.trim().is_empty()).unwrap_or_else(|| "Heart-rate monitor".to_string());
                    match_device = Some((peripheral, name));
                    break;
                }
            }
        }
        let _ = adapter.stop_scan().await;
        if match_device.is_some() { break; }
    }
    let (peripheral, device_name) = match_device.ok_or_else(|| "No nearby monitor advertises the standard heart-rate service.".to_string())?;
    peripheral.connect().await.map_err(|error| format!("Could not connect to {device_name}: {error}"))?;
    peripheral.discover_services().await.map_err(|error| format!("Could not read monitor services: {error}"))?;
    let characteristic = peripheral.characteristics().into_iter()
        .find(|characteristic| characteristic.uuid == HEART_RATE_MEASUREMENT)
        .ok_or_else(|| "The monitor does not expose the standard heart-rate measurement.".to_string())?;
    peripheral.subscribe(&characteristic).await.map_err(|error| format!("Could not subscribe to heart-rate samples: {error}"))?;
    let mut notifications = peripheral.notifications().await.map_err(|error| format!("Could not listen to heart-rate samples: {error}"))?;
    let peripheral_for_task = peripheral.clone();
    let task = tauri::async_runtime::spawn(async move {
        while let Some(notification) = notifications.next().await {
            if notification.uuid != HEART_RATE_MEASUREMENT || notification.value.len() < 2 { continue; }
            let flags = notification.value[0];
            let is_16_bit = flags & 0x01 != 0;
            let bpm = if is_16_bit {
                if notification.value.len() < 3 { continue; }
                u16::from_le_bytes([notification.value[1], notification.value[2]])
            } else {
                notification.value[1] as u16
            };
            if bpm == 0 { continue; }
            let sensor_contact = if flags & 0x04 != 0 { "detected" } else if flags & 0x02 != 0 { "not-detected" } else { "unknown" };
            let sample = HeartRateSample { bpm, received_at: chrono_millis(), sensor_contact };
            if app.emit("aster-hr-sample", sample).is_err() { break; }
        }
        let _ = peripheral_for_task.disconnect().await;
        let _ = app.emit("aster-hr-status", "disconnected");
    });
    *monitor.0.lock().map_err(|_| "Bluetooth monitor state is unavailable".to_string())? = Some(ActiveMonitor { peripheral, task });
    Ok(device_name)
}

#[tauri::command]
pub async fn stop_heart_rate_monitor(monitor: State<'_, BleMonitor>) -> Result<(), String> {
    stop_active_monitor(&monitor).await;
    Ok(())
}

async fn stop_active_monitor(monitor: &BleMonitor) {
    let active = monitor.0.lock().ok().and_then(|mut active| active.take());
    if let Some(active) = active {
        active.task.abort();
        let _ = active.peripheral.disconnect().await;
    }
}

fn chrono_millis() -> u64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64
}
