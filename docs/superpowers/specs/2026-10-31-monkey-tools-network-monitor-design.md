# Design Spec: Real-time System Network Monitor for monkey-tools (macOS)

- **Date:** 2026-10-31
- **Status:** Proposed (Awaiting Approval)
- **Target Repository:** `monkey-tools` (`/Users/pakkawat/Documents/clipboard/monkey-tools`)
- **Target Platform:** macOS 13.0+ (Swift 5.9+, AppKit & SwiftUI)

---

## 1. Intent & Context (The "Why")

`monkey-tools` is an all-in-one macOS productivity suite living in the system menu bar, currently uniting Clipboard History (`Win + V`), an instant Emoji Picker, and a smart Selection Translator.

Users frequently need to know their current MacBook internet bandwidth and speed in real-time (e.g., when downloading large files, video conferencing, watching live streams, or diagnosing slow Wi-Fi), without opening Activity Monitor or browser DevTools.

This feature adds a lightweight, system-wide, real-time Network Monitor directly into `monkey-tools`, displaying live download and upload speeds in the macOS menu bar with zero overhead and full user configurability.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **Real-Time Bandwidth Engine (`NetworkMonitorService`)**:
  - Sample network interface counters via native BSD `getifaddrs` every 1 second.
  - Accurately calculate system-wide `Download Speed` ($\Delta \text{ibytes}/\text{sec}$) and `Upload Speed` ($\Delta \text{obytes}/\text{sec}$).
  - Track session total transferred data (Total Downloaded & Total Uploaded).
  - Stop polling timer when the feature is toggled off to ensure zero CPU/energy waste.
- **Menu Bar Presentation (`StatusMenuController`)**:
  - When enabled: display the monkey icon alongside compact live speed text (e.g., `⬇ 1.2 MB/s  ⬆ 85 KB/s`) using monospaced digit typography to prevent horizontal jitter.
  - When disabled: seamlessly revert to the standalone monkey template icon.
  - In the menu bar context menu (right-click / Ctrl-click): display live speeds and session cumulative data transfer.
- **Configuration & Settings (`AppSettings` & `SettingsView`)**:
  - Toggle switch: Enable / Disable Network Monitor.
  - Unit Selector:
    - **Auto Bytes (Default):** B/s, KB/s, MB/s, GB/s.
    - **Bits (Network standard):** bps, Kbps, Mbps, Gbps.
    - **Fixed KB/s:** always in KB/s.
    - **Fixed MB/s:** always in MB/s.
  - Settings persisted automatically via `UserDefaults`.
- **Full Localization (`LocalizationManager`)**:
  - Localized strings for Thai (🇹🇭), English (🇺🇸), and Simplified Chinese (🇨🇳).
- **Unit Testing**:
  - Comprehensive unit tests covering rate calculation, byte/bit unit formatting, and timer lifecycle.

### Non-Goals
- Per-process network traffic breakdown (this requires root privileges / Network Extension entitlement, whereas system-wide `getifaddrs` requires zero special permissions and runs safely sandboxed).
- Deep packet inspection or VPN proxying.

### Anti-Goals
- Never cause menu bar flickering or UI hitching during periodic updates.
- Never poll interfaces when the user has turned the feature off.
- Never exceed 0.1% CPU utilization during active 1-second sampling.

---

## 3. Approaches Considered

### Approach 1: Menu Bar Live Text + Settings Configuration (Selected)
- Display live download/upload metrics directly on the macOS menu bar next to the icon, backed by a 1s BSD `getifaddrs` timer. Full toggle and unit configuration in `SettingsView`.
- **Trade-offs:** Minimal menu bar space used, but provides at-a-glance visibility without requiring clicks or hotkeys. Can be turned off at will.

### Approach 2: Floating HUD Popover
- Keep the menu bar icon plain and summon a floating HUD window via hotkey or click to view network gauges.
- **Trade-offs:** Keeps menu bar compact, but requires manual user action every time they want to check speed.

### Approach 3: Hybrid (Compact Menu Bar + In-Depth Popover)
- Show ultra-compact numbers on menu bar with a dedicated popover graph on click.
- **Trade-offs:** Higher UI complexity for initial release; can be expanded in future versions.

*Decision:* Approach 1 was selected for its direct utility, intuitive macOS experience, and lightweight architecture.

---

## 4. Architecture & Implementation Plan

### A. Core Components

1. **`NetworkSpeedUnit.swift` (Model)**:
   - Enum with cases: `autoBytes`, `bits`, `fixedKB`, `fixedMB`.
   - Helper methods to format raw bytes per second into human-readable strings with customizable units.

2. **`NetworkMonitorService.swift` (Service)**:
   - Singleton `NetworkMonitorService.shared: ObservableObject`.
   - Properties:
     - `@Published public private(set) var downloadSpeed: Double = 0` (bytes/sec)
     - `@Published public private(set) var uploadSpeed: Double = 0` (bytes/sec)
     - `@Published public private(set) var sessionDownloadBytes: UInt64 = 0`
     - `@Published public private(set) var sessionUploadBytes: UInt64 = 0`
     - `@Published public private(set) var formattedSpeedString: String = ""`
   - Core functions:
     - `startMonitoring()`: schedules 1s `Timer` or `DispatchSourceTimer` on a dedicated background queue, publishes state to main queue.
     - `stopMonitoring()`: cancels timer and resets instantaneous speeds to 0.
     - `sampleInterfaceBytes() -> (ibytes: UInt64, obytes: UInt64)`: iterates linked list from `getifaddrs`, filters `(ifa_flags & IFF_UP) != 0 && (ifa_flags & IFF_LOOPBACK) == 0`, and sums `ifi_ibytes` and `ifi_obytes`.

3. **`AppSettings.swift` (Persistence)**:
   - Keys: `app_network_monitor_enabled`, `app_network_speed_unit`.
   - `@Published public var networkMonitorEnabled: Bool` (defaults to `true`).
   - `@Published public var networkSpeedUnit: NetworkSpeedUnit` (defaults to `.autoBytes`).
   - Observers trigger `NetworkMonitorService.shared.startMonitoring()` or `stopMonitoring()` accordingly.

4. **`StatusMenuController.swift` (UI Presentation)**:
   - Subscribes to `NetworkMonitorService.shared.$formattedSpeedString` and `AppSettings.shared.$networkMonitorEnabled`.
   - Updates `statusItem?.button?.attributedTitle` or `title` using `NSFont.monospacedDigitSystemFont(ofSize: 11, weight: .medium)`.
   - Ensures monkey icon remains visible with template rendering alongside speed text.
   - When right-clicked (`showMenu()`), displays a disabled informational menu item with current speed and session data totals.

5. **`SettingsView.swift` (User Interface)**:
   - New Section: **"🌐 Network Monitor (ตรวจสอบความเร็วเน็ต)"**.
   - Toggle: "เปิดใช้งานการตรวจสอบความเร็วเน็ต (Enable Real-time Monitor)".
   - Picker: "หน่วยความเร็ว (Speed Unit)" with options for Auto Bytes, Bits, Fixed KB/s, Fixed MB/s.
   - Live preview label showing current speed formatted according to selected settings.

6. **`LocalizationManager.swift` (Multi-Language)**:
   - Localization keys:
     - `settings_network_heading`
     - `settings_network_enable`
     - `settings_network_unit`
     - `unit_auto_bytes`, `unit_bits`, `unit_fixed_kb`, `unit_fixed_mb`
     - `menu_network_speed`, `menu_network_session_total`

---

## 5. Verification & Testing Strategy

1. **Automated Unit Tests (`NetworkMonitorTests.swift`)**:
   - Test byte-to-string formatters across edge cases ($0$ B/s, $500$ B/s, $1.5$ KB/s, $25.4$ MB/s, $1.2$ GB/s).
   - Test bits formatting conversion (multiplying bytes by 8 and formatting bps/Kbps/Mbps/Gbps).
   - Test start/stop lifecycle and timer idempotency.
2. **Build Verification**:
   - Run `swift build` and `swift test` in `monkey-tools/`.
3. **Manual App Verification**:
   - Launch `monkey-tools` and verify menu bar display.
   - Generate network traffic (e.g. streaming or curl download) and observe real-time speed adjustments.
   - Change speed unit in Settings and verify immediate UI update.
   - Toggle off the feature in Settings and verify menu bar returns cleanly to icon-only mode.
