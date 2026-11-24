# Real-time System Network Monitor for monkey-tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a lightweight, real-time macOS network bandwidth monitor in `monkey-tools` that displays live download/upload speeds on the macOS menu bar with zero CPU overhead and full user configurability (toggle on/off and customizable speed units).

**Architecture:** Sample BSD network interface counters (`getifaddrs`) on a 1-second background timer within `NetworkMonitorService`. Expose formatted rates via Combine publishers to `StatusMenuController` for menu bar rendering and right-click menu statistics. Persist user preferences in `AppSettings` and render configuration controls in `SettingsView`.

**Tech Stack:** Swift 5.9+, AppKit, SwiftUI, Combine, Darwin BSD C APIs (`getifaddrs`, `net/if.h`).

**Spec:** `docs/superpowers/specs/2026-10-31-monkey-tools-network-monitor-design.md`

## Global Constraints

- Target Platform: macOS 13.0+
- Zero root permissions or external network kernel extensions required.
- Memory & CPU: Active 1-second sampling must use < 0.1% CPU; zero background activity when toggled off.
- Menu Bar Stability: Numerical text must use `NSFont.monospacedDigitSystemFont` to eliminate horizontal text jitter.
- Localization: All UI strings must support Thai (`th`), English (`en`), and Simplified Chinese (`zh`).

## Review Focus

1. **Counter Wrap-Around / Interface Reset:** When an interface resets or disconnects, `currentBytes < previousBytes`. Must clamp delta to 0 and reset baseline without showing astronomical speeds.
2. **Offline / No Active Physical Interfaces:** When Wi-Fi is disconnected, `getifaddrs` yields only loopback. Must display `0 B/s` without crashing.
3. **Sub-Kilobyte Low Speeds:** Near-zero speeds must render cleanly (e.g., `0 B/s`, `150 B/s`) without fractional artifacts (`0.0001 MB/s`).
4. **Gigabit+ High Speeds:** Speeds $\ge 1\text{ GB/s}$ must scale dynamically to `GB/s` / `Gbps` with 1 decimal place.
5. **Rapid Toggle Concurrency:** Rapidly enabling/disabling via Settings must cleanly invalidate timers without thread leaks.

---

### Task 1: NetworkSpeedUnit Model & Formatting Engine

**Files:**
- Create: `monkey-tools/Sources/MonkeyTools/Models/NetworkSpeedUnit.swift`
- Test: `monkey-tools/Tests/MonkeyToolsTests/NetworkSpeedUnitTests.swift`

**Interfaces:**
- Produces:
  ```swift
  public enum NetworkSpeedUnit: String, CaseIterable, Identifiable {
      case autoBytes = "auto_bytes"
      case bits = "bits"
      case fixedKB = "fixed_kb"
      case fixedMB = "fixed_mb"

      public var id: String { rawValue }
      public func formatSpeed(bytesPerSec: Double) -> String
      public static func formatDataSize(bytes: UInt64) -> String
  }
  ```

- [ ] **Step 1: Write failing tests for `NetworkSpeedUnit`**

In `monkey-tools/Tests/MonkeyToolsTests/NetworkSpeedUnitTests.swift`:
```swift
import XCTest
@testable import MonkeyTools

final class NetworkSpeedUnitTests: XCTestCase {
    func testAutoBytesFormatting() {
        XCTAssertEqual(NetworkSpeedUnit.autoBytes.formatSpeed(bytesPerSec: 0), "0 B/s")
        XCTAssertEqual(NetworkSpeedUnit.autoBytes.formatSpeed(bytesPerSec: 512), "512 B/s")
        XCTAssertEqual(NetworkSpeedUnit.autoBytes.formatSpeed(bytesPerSec: 1024 * 1.5), "1.5 KB/s")
        XCTAssertEqual(NetworkSpeedUnit.autoBytes.formatSpeed(bytesPerSec: 1024 * 1024 * 2.4), "2.4 MB/s")
        XCTAssertEqual(NetworkSpeedUnit.autoBytes.formatSpeed(bytesPerSec: 1024 * 1024 * 1024 * 1.2), "1.2 GB/s")
    }

    func testBitsFormatting() {
        XCTAssertEqual(NetworkSpeedUnit.bits.formatSpeed(bytesPerSec: 0), "0 bps")
        XCTAssertEqual(NetworkSpeedUnit.bits.formatSpeed(bytesPerSec: 125), "1.0 Kbps") // 125 * 8 = 1000 bits
        XCTAssertEqual(NetworkSpeedUnit.bits.formatSpeed(bytesPerSec: 125_000), "1.0 Mbps")
    }

    func testFixedUnitsFormatting() {
        XCTAssertEqual(NetworkSpeedUnit.fixedKB.formatSpeed(bytesPerSec: 2048), "2.0 KB/s")
        XCTAssertEqual(NetworkSpeedUnit.fixedMB.formatSpeed(bytesPerSec: 2_097_152), "2.00 MB/s")
    }

    func testCumulativeDataSizeFormatting() {
        XCTAssertEqual(NetworkSpeedUnit.formatDataSize(bytes: 0), "0 B")
        XCTAssertEqual(NetworkSpeedUnit.formatDataSize(bytes: 1024 * 500), "500 KB")
        XCTAssertEqual(NetworkSpeedUnit.formatDataSize(bytes: 1024 * 1024 * 150), "150 MB")
        XCTAssertEqual(NetworkSpeedUnit.formatDataSize(bytes: 1024 * 1024 * 1024 * 3), "3.0 GB")
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd monkey-tools && swift test --filter NetworkSpeedUnitTests`
Expected: FAIL (Cannot find `NetworkSpeedUnit` in scope)

- [ ] **Step 3: Implement `NetworkSpeedUnit.swift`**

Create `monkey-tools/Sources/MonkeyTools/Models/NetworkSpeedUnit.swift` implementing `formatSpeed(bytesPerSec:)` and `formatDataSize(bytes:)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd monkey-tools && swift test --filter NetworkSpeedUnitTests`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd monkey-tools && git add Sources/MonkeyTools/Models/NetworkSpeedUnit.swift Tests/MonkeyToolsTests/NetworkSpeedUnitTests.swift
git commit -m "feat(network): add NetworkSpeedUnit enum and speed formatting logic"
```

---

### Task 2: NetworkMonitorService Core & Sampling Engine

**Files:**
- Create: `monkey-tools/Sources/MonkeyTools/Services/NetworkMonitorService.swift`
- Test: `monkey-tools/Tests/MonkeyToolsTests/NetworkMonitorServiceTests.swift`

**Interfaces:**
- Consumes: `NetworkSpeedUnit` from Task 1
- Produces:
  ```swift
  public final class NetworkMonitorService: ObservableObject {
      public static let shared = NetworkMonitorService()
      @Published public private(set) var downloadSpeed: Double = 0
      @Published public private(set) var uploadSpeed: Double = 0
      @Published public private(set) var sessionDownloadBytes: UInt64 = 0
      @Published public private(set) var sessionUploadBytes: UInt64 = 0
      @Published public private(set) var formattedSpeedString: String = ""

      public func startMonitoring()
      public func stopMonitoring()
      public func sampleInterfaceBytes() -> (ibytes: UInt64, obytes: UInt64)
      public func calculateRates(currentIn: UInt64, currentOut: UInt64, timeDelta: Double) -> (downSpeed: Double, upSpeed: Double)
  }
  ```

- [ ] **Step 1: Write failing tests for `NetworkMonitorService`**

In `monkey-tools/Tests/MonkeyToolsTests/NetworkMonitorServiceTests.swift`:
```swift
import XCTest
@testable import MonkeyTools

final class NetworkMonitorServiceTests: XCTestCase {
    func testCalculateRatesNormal() {
        let service = NetworkMonitorService()
        // 1 MB download, 100 KB upload over 1.0 second
        let rates = service.calculateRates(
            previousIn: 1_000_000, currentIn: 2_048_576,
            previousOut: 500_000, currentOut: 602_400,
            timeDelta: 1.0
        )
        XCTAssertEqual(rates.downSpeed, 1_048_576, accuracy: 1.0)
        XCTAssertEqual(rates.upSpeed, 102_400, accuracy: 1.0)
    }

    func testCalculateRatesWrapAroundOrReset() {
        let service = NetworkMonitorService()
        // Interface reset: current < previous
        let rates = service.calculateRates(
            previousIn: 10_000_000, currentIn: 500,
            previousOut: 5_000_000, currentOut: 200,
            timeDelta: 1.0
        )
        // Must clamp to 0 instead of returning massive underflow
        XCTAssertEqual(rates.downSpeed, 0)
        XCTAssertEqual(rates.upSpeed, 0)
    }

    func testSampleInterfaceBytesDoesNotCrash() {
        let service = NetworkMonitorService()
        let sample = service.sampleInterfaceBytes()
        // Running on macOS: at least loopback or physical interfaces exist
        XCTAssertGreaterThanOrEqual(sample.ibytes, 0)
        XCTAssertGreaterThanOrEqual(sample.obytes, 0)
    }

    func testStartAndStopMonitoringLifecycle() {
        let service = NetworkMonitorService()
        service.startMonitoring()
        XCTAssertTrue(service.isMonitoring)
        service.stopMonitoring()
        XCTAssertFalse(service.isMonitoring)
        XCTAssertEqual(service.downloadSpeed, 0)
        XCTAssertEqual(service.uploadSpeed, 0)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd monkey-tools && swift test --filter NetworkMonitorServiceTests`
Expected: FAIL (Cannot find `NetworkMonitorService` in scope)

- [ ] **Step 3: Implement `NetworkMonitorService.swift`**

Create `monkey-tools/Sources/MonkeyTools/Services/NetworkMonitorService.swift`:
- Iterate `getifaddrs` linked list.
- Check flags: `(ifa_flags & IFF_UP) != 0` and `(ifa_flags & IFF_LOOPBACK) == 0`.
- Cast `ifa_data` to pointer of `if_data`. Sum `ifi_ibytes` and `ifi_obytes`.
- Schedule 1-second `DispatchSourceTimer` on background queue `DispatchQueue(label: "com.monkeytools.networkmonitor")`.
- Calculate delta bytes per second, accumulate session totals, format text string using selected unit, and publish on main queue.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd monkey-tools && swift test --filter NetworkMonitorServiceTests`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd monkey-tools && git add Sources/MonkeyTools/Services/NetworkMonitorService.swift Tests/MonkeyToolsTests/NetworkMonitorServiceTests.swift
git commit -m "feat(network): implement NetworkMonitorService BSD interface sampler and rate calculator"
```

---

### Task 3: AppSettings & Localization Integration

**Files:**
- Modify: `monkey-tools/Sources/MonkeyTools/Services/AppSettings.swift`
- Modify: `monkey-tools/Sources/MonkeyTools/Services/LocalizationManager.swift`
- Test: `monkey-tools/Tests/MonkeyToolsTests/NetworkSettingsTests.swift`

**Interfaces:**
- Consumes: `NetworkSpeedUnit` from Task 1, `NetworkMonitorService` from Task 2
- Produces:
  ```swift
  // In AppSettings.swift
  @Published public var networkMonitorEnabled: Bool
  @Published public var networkSpeedUnit: NetworkSpeedUnit
  ```

- [ ] **Step 1: Write failing test for Network Settings & Localization**

In `monkey-tools/Tests/MonkeyToolsTests/NetworkSettingsTests.swift`:
```swift
import XCTest
@testable import MonkeyTools

final class NetworkSettingsTests: XCTestCase {
    func testNetworkSettingsDefaultsAndPersistence() {
        let settings = AppSettings.shared
        XCTAssertNotNil(settings.networkMonitorEnabled)
        XCTAssertNotNil(settings.networkSpeedUnit)

        settings.networkSpeedUnit = .bits
        XCTAssertEqual(settings.networkSpeedUnit, .bits)
        settings.networkSpeedUnit = .autoBytes
    }

    func testLocalizationKeysExist() {
        let loc = LocalizationManager.shared
        let keys = [
            "settings_network_heading",
            "settings_network_enable",
            "settings_network_unit",
            "unit_auto_bytes",
            "unit_bits",
            "unit_fixed_kb",
            "unit_fixed_mb",
            "menu_network_speed",
            "menu_network_session_total"
        ]
        for key in keys {
            XCTAssertFalse(loc[key].isEmpty, "Missing translation for key \(key)")
            XCTAssertNotEqual(loc[key], key, "Key \(key) was not localized")
        }
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd monkey-tools && swift test --filter NetworkSettingsTests`
Expected: FAIL

- [ ] **Step 3: Update `AppSettings.swift` and `LocalizationManager.swift`**

- In `AppSettings.swift`:
  - Add keys `app_network_monitor_enabled` and `app_network_speed_unit`.
  - Add `@Published public var networkMonitorEnabled: Bool` (default `true`).
  - Add `@Published public var networkSpeedUnit: NetworkSpeedUnit` (default `.autoBytes`).
  - Connect `didSet` hooks to start/stop `NetworkMonitorService.shared` and trigger speed string reformat.
- In `LocalizationManager.swift`:
  - Add dictionary entries for all required keys in `th`, `en`, and `zh`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd monkey-tools && swift test --filter NetworkSettingsTests`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd monkey-tools && git add Sources/MonkeyTools/Services/AppSettings.swift Sources/MonkeyTools/Services/LocalizationManager.swift Tests/MonkeyToolsTests/NetworkSettingsTests.swift
git commit -m "feat(network): integrate settings persistence and trilingual localization"
```

---

### Task 4: Menu Bar Integration in StatusMenuController

**Files:**
- Modify: `monkey-tools/Sources/MonkeyTools/UI/StatusMenuController.swift`
- Test: Build and test suite

**Interfaces:**
- Consumes: `NetworkMonitorService.shared.$formattedSpeedString`, `AppSettings.shared.$networkMonitorEnabled`, `AppSettings.shared.$networkSpeedUnit`

- [ ] **Step 1: Update `StatusMenuController.swift`**

- Subscribe to `NetworkMonitorService.shared.$formattedSpeedString` and `AppSettings.shared.$networkMonitorEnabled`.
- In `updateStatusItemDisplay()`:
  - If `networkMonitorEnabled` is true and formatted string is not empty:
    - Set `button.attributedTitle` with `NSFont.monospacedDigitSystemFont(ofSize: 11, weight: .medium)`.
    - Set `button.imagePosition = .imageLeft` so the monkey icon is neatly placed to the left of the speed text.
  - If `networkMonitorEnabled` is false:
    - Set `button.title = ""`, `button.attributedTitle = NSAttributedString(string: "")`.
    - Set `button.imagePosition = .imageOnly`.
- In `showMenu()`:
  - If `networkMonitorEnabled` is true, add header menu items:
    - `📶 \(loc["menu_network_speed"]): \(NetworkMonitorService.shared.formattedSpeedString)` (disabled item)
    - `📊 \(loc["menu_network_session_total"]): ⬇ \(sessionDown) | ⬆ \(sessionUp)` (disabled item)
    - Separator

- [ ] **Step 2: Run all unit tests**

Run: `cd monkey-tools && swift test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd monkey-tools && git add Sources/MonkeyTools/UI/StatusMenuController.swift
git commit -m "feat(network): display real-time speed in menu bar and session stats in dropdown menu"
```

---

### Task 5: Settings UI in SettingsView

**Files:**
- Modify: `monkey-tools/Sources/MonkeyTools/UI/SettingsView.swift`

- [ ] **Step 1: Add Network Monitor Section to `SettingsView.swift`**

- Inside `ScrollView` in `SettingsView.swift`, add a dedicated section:
  ```swift
  // MARK: - Network Monitor Section
  VStack(alignment: .leading, spacing: 12) {
      Text(loc["settings_network_heading"])
          .font(.system(size: 13, weight: .bold))

      Toggle(loc["settings_network_enable"], isOn: $settings.networkMonitorEnabled)
          .font(.system(size: 13))

      if settings.networkMonitorEnabled {
          HStack(spacing: 12) {
              Text(loc["settings_network_unit"] + ":")
                  .font(.system(size: 13))
                  .foregroundColor(.secondary)

              Picker("", selection: $settings.networkSpeedUnit) {
                  Text(loc["unit_auto_bytes"]).tag(NetworkSpeedUnit.autoBytes)
                  Text(loc["unit_bits"]).tag(NetworkSpeedUnit.bits)
                  Text(loc["unit_fixed_kb"]).tag(NetworkSpeedUnit.fixedKB)
                  Text(loc["unit_fixed_mb"]).tag(NetworkSpeedUnit.fixedMB)
              }
              .pickerStyle(.segmented)
              .frame(maxWidth: 320)
          }

          // Live speed preview badge
          HStack(spacing: 8) {
              Text("⚡")
              Text(NetworkMonitorService.shared.formattedSpeedString.isEmpty ? "⬇ 0 B/s  ⬆ 0 B/s" : NetworkMonitorService.shared.formattedSpeedString)
                  .font(.system(size: 12, weight: .semibold, design: .monospaced))
                  .foregroundColor(.secondary)
          }
          .padding(8)
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(Color.primary.opacity(0.04))
          .clipShape(RoundedRectangle(cornerRadius: 6))
      }

      Divider().padding(.vertical, 4)
  }
  ```

- [ ] **Step 2: Run compiler check & tests**

Run: `cd monkey-tools && swift test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd monkey-tools && git add Sources/MonkeyTools/UI/SettingsView.swift
git commit -m "feat(network): add Network Monitor toggle and unit picker to SettingsView"
```

---

### Task 6: Full Verification, Release Build & Documentation

**Files:**
- Modify: `monkey-tools/README.md`
- Modify: `monkey-tools/FEATURES.md`

- [ ] **Step 1: Run comprehensive tests**

Run: `cd monkey-tools && swift test`
Expected: All tests pass with 0 failures.

- [ ] **Step 2: Run release build**

Run: `cd monkey-tools && swift build -c release`
Expected: Clean build with 0 errors.

- [ ] **Step 3: Update documentation**

Update `README.md` and `FEATURES.md` in `monkey-tools` highlighting the new Real-Time Network Monitor feature and settings options.

- [ ] **Step 4: Commit**

```bash
cd monkey-tools && git add README.md FEATURES.md
git commit -m "docs(network): document real-time network monitor feature in README and FEATURES"
```
