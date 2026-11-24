# Update Checker via pliw-app Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an update checking feature in `monkey-tools` that checks against `version.json` hosted on `pliw-app` once every 24 hours (or on-demand), and alerts users with download recommendations when a newer version is available.

**Architecture:** A lightweight `UpdateCheckService` fetches `version.json` via HTTPS, compares semver values against the local app version, enforces a 24-hour throttle for background checks, and exposes state via `@Published` properties. The UI integrates into `SettingsView` (General Tab) and `StatusMenuController`.

**Tech Stack:** Swift 5.9+, URLSession, Combine, SwiftUI, AppKit.

**Spec:** `docs/superpowers/specs/2026-11-01-monkey-tools-update-checker-design.md`

## Global Constraints

- Target Platform: macOS 13.0+
- Distribution Source: Only via `pliw-app` (`https://pakkawatkh.github.io/pliw-app/monkey-tools/`), never the private `monkey-tools` repo.
- Throttling: Background auto-checks must occur at most once every 24 hours (86,400s). Manual checks bypass throttling.
- Network Resiliency: Timeouts must be bounded (10s), network calls run asynchronously off the main thread, and offline/error states must fail gracefully without throwing user-facing modals.
- Localization: Support Thai (`th`), English (`en`), and Simplified Chinese (`zh`).

## Review Focus

1. **Version Parsing Edge Cases:** Handles prefixes (`v2.1.0` vs `2.1.0`), differing component counts (`2.1` vs `2.1.0`), and patch version increments (`2.1.1` > `2.1.0`).
2. **Offline & HTTP 404 / Parsing Failure:** When Mac is offline or URL returns error, service fails gracefully without crashing or clearing existing state.
3. **24-hour Throttle Precision:** Ensures background check is strictly skipped if `now - lastCheck < 86,400s`.
4. **Manual Check Bypass:** On-demand check button in Settings must ignore the 24-hour window and fetch immediately.
5. **URL Opening Safety:** When user clicks download, safely opens URL with `NSWorkspace.shared.open`.

---

### Task 1: version.json on pliw-app & UpdateInfo Model with Semver (TDD)

**Files:**
- Create: `pliw-app/monkey-tools/version.json`
- Create: `monkey-tools/Sources/MonkeyTools/Models/UpdateInfo.swift`
- Test: `monkey-tools/Tests/MonkeyToolsTests/UpdateInfoTests.swift`

**Interfaces:**
- Produces:
  ```swift
  public struct UpdateInfo: Codable, Equatable {
      public let latestVersion: String
      public let releaseDate: String
      public let downloadUrl: String
      public let pageUrl: String
      public let releaseNotes: String

      public static func isVersion(_ remote: String, newerThan local: String) -> Bool
  }
  ```

- [ ] **Step 1: Create `pliw-app/monkey-tools/version.json`**

Write standard JSON manifest containing `latestVersion`: "2.1.0", downloadUrl, and releaseNotes.

- [ ] **Step 2: Write failing unit test for `UpdateInfo`**

In `monkey-tools/Tests/MonkeyToolsTests/UpdateInfoTests.swift`:
```swift
import XCTest
@testable import MonkeyTools

final class UpdateInfoTests: XCTestCase {
    func testSemverComparison() {
        XCTAssertTrue(UpdateInfo.isVersion("2.1.1", newerThan: "2.1.0"))
        XCTAssertTrue(UpdateInfo.isVersion("v2.2.0", newerThan: "2.1.0"))
        XCTAssertTrue(UpdateInfo.isVersion("3.0.0", newerThan: "v2.1.0"))
        XCTAssertFalse(UpdateInfo.isVersion("2.1.0", newerThan: "2.1.0"))
        XCTAssertFalse(UpdateInfo.isVersion("2.0.1", newerThan: "2.1.0"))
        XCTAssertFalse(UpdateInfo.isVersion("2.1", newerThan: "2.1.0"))
        XCTAssertTrue(UpdateInfo.isVersion("2.1.1", newerThan: "2.1"))
    }

    func testUpdateInfoJSONDecoding() throws {
        let json = """
        {
            "latestVersion": "2.2.0",
            "releaseDate": "2026-11-01",
            "downloadUrl": "https://pakkawatkh.github.io/pliw-app/monkey-tools/monkey-tools-Installer.dmg",
            "pageUrl": "https://pakkawatkh.github.io/pliw-app/monkey-tools/",
            "releaseNotes": "Bug fixes and improvements"
        }
        """.data(using: .utf8)!

        let info = try JSONDecoder().decode(UpdateInfo.self, from: json)
        XCTAssertEqual(info.latestVersion, "2.2.0")
        XCTAssertEqual(info.releaseDate, "2026-11-01")
        XCTAssertEqual(info.downloadUrl, "https://pakkawatkh.github.io/pliw-app/monkey-tools/monkey-tools-Installer.dmg")
    }
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd monkey-tools && swift test --filter UpdateInfoTests`
Expected: FAIL (Cannot find `UpdateInfo` in scope)

- [ ] **Step 4: Implement `UpdateInfo.swift`**

Create `monkey-tools/Sources/MonkeyTools/Models/UpdateInfo.swift` implementing Codable and `isVersion(_:newerThan:)`.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd monkey-tools && swift test --filter UpdateInfoTests`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd monkey-tools && git add Sources/MonkeyTools/Models/UpdateInfo.swift Tests/MonkeyToolsTests/UpdateInfoTests.swift
git commit -m "feat(update): add UpdateInfo model and semver comparison logic"
```

---

### Task 2: UpdateCheckService & 24-Hour Throttling (TDD)

**Files:**
- Create: `monkey-tools/Sources/MonkeyTools/Services/UpdateCheckService.swift`
- Test: `monkey-tools/Tests/MonkeyToolsTests/UpdateCheckServiceTests.swift`

**Interfaces:**
- Consumes: `UpdateInfo` from Task 1
- Produces:
  ```swift
  public final class UpdateCheckService: ObservableObject {
      public static let shared = UpdateCheckService()
      @Published public private(set) var isChecking: Bool = false
      @Published public private(set) var updateAvailable: Bool = false
      @Published public private(set) var latestUpdateInfo: UpdateInfo? = nil
      @Published public private(set) var lastCheckDate: Date? = nil
      @Published public private(set) var checkErrorMessage: String? = nil

      public var currentAppVersion: String { get }
      public func shouldCheck(now: Date, lastCheck: Date?) -> Bool
      public func checkForUpdates(force: Bool, completion: ((Bool) -> Void)? = nil)
  }
  ```

- [ ] **Step 1: Write failing tests for `UpdateCheckService`**

In `monkey-tools/Tests/MonkeyToolsTests/UpdateCheckServiceTests.swift`:
```swift
import XCTest
@testable import MonkeyTools

final class UpdateCheckServiceTests: XCTestCase {
    func testThrottlingLogic() {
        let service = UpdateCheckService()
        let now = Date()

        // No previous check -> should check
        XCTAssertTrue(service.shouldCheck(now: now, lastCheck: nil))

        // Checked 1 hour ago -> should NOT check
        let oneHourAgo = now.addingTimeInterval(-3600)
        XCTAssertFalse(service.shouldCheck(now: now, lastCheck: oneHourAgo))

        // Checked 23 hours ago -> should NOT check
        let twentyThreeHoursAgo = now.addingTimeInterval(-23 * 3600)
        XCTAssertFalse(service.shouldCheck(now: now, lastCheck: twentyThreeHoursAgo))

        // Checked 25 hours ago -> should check
        let twentyFiveHoursAgo = now.addingTimeInterval(-25 * 3600)
        XCTAssertTrue(service.shouldCheck(now: now, lastCheck: twentyFiveHoursAgo))
    }

    func testCurrentAppVersionNotEmpty() {
        let service = UpdateCheckService()
        XCTAssertFalse(service.currentAppVersion.isEmpty)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd monkey-tools && swift test --filter UpdateCheckServiceTests`
Expected: FAIL (Cannot find `UpdateCheckService` in scope)

- [ ] **Step 3: Implement `UpdateCheckService.swift`**

Create `monkey-tools/Sources/MonkeyTools/Services/UpdateCheckService.swift`:
- Query `https://pakkawatkh.github.io/pliw-app/monkey-tools/version.json` with fallback.
- Read/write `lastCheckDate` to `UserDefaults.standard`.
- Compare version against `currentAppVersion`.
- Publish results to main thread.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd monkey-tools && swift test --filter UpdateCheckServiceTests`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd monkey-tools && git add Sources/MonkeyTools/Services/UpdateCheckService.swift Tests/MonkeyToolsTests/UpdateCheckServiceTests.swift
git commit -m "feat(update): implement UpdateCheckService with 24-hour rate limiting"
```

---

### Task 3: Localization Integration (TDD)

**Files:**
- Modify: `monkey-tools/Sources/MonkeyTools/Services/LocalizationManager.swift`
- Test: `monkey-tools/Tests/MonkeyToolsTests/UpdateLocalizationTests.swift`

**Interfaces:**
- Produces keys:
  - `update_heading`
  - `update_current_version`
  - `update_last_checked`
  - `update_check_button`
  - `update_checking`
  - `update_available_title`
  - `update_download_button`
  - `update_up_to_date`
  - `menu_check_updates`
  - `menu_update_available`

- [ ] **Step 1: Write failing test for update localization keys**

In `monkey-tools/Tests/MonkeyToolsTests/UpdateLocalizationTests.swift`:
Test all 10 keys exist and are non-empty across `th`, `en`, `zh`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd monkey-tools && swift test --filter UpdateLocalizationTests`
Expected: FAIL

- [ ] **Step 3: Add translations to `LocalizationManager.swift`**

- [ ] **Step 4: Run test to verify it passes**

Run: `cd monkey-tools && swift test --filter UpdateLocalizationTests`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd monkey-tools && git add Sources/MonkeyTools/Services/LocalizationManager.swift Tests/MonkeyToolsTests/UpdateLocalizationTests.swift
git commit -m "feat(update): add trilingual localization for update checker"
```

---

### Task 4: UI Integration in SettingsView & StatusMenuController

**Files:**
- Modify: `monkey-tools/Sources/MonkeyTools/UI/SettingsView.swift`
- Modify: `monkey-tools/Sources/MonkeyTools/UI/StatusMenuController.swift`
- Modify: `monkey-tools/Sources/MonkeyTools/AppDelegate.swift`

- [ ] **Step 1: Update `SettingsView.swift` (General Tab)**

Add the Software Update section in `generalTabContent`:
- Current version display
- Last checked timestamp
- "Check for Updates" button
- Alert card with "Download Update" button when `updateCheck.updateAvailable` is true.

- [ ] **Step 2: Update `StatusMenuController.swift`**

In `showMenu()`:
- Add `menu_check_updates` item.
- If `updateAvailable` is true, add highlighted `menu_update_available` item.

- [ ] **Step 3: Trigger background check on launch in `AppDelegate.swift`**

In `applicationDidFinishLaunching`:
Call `UpdateCheckService.shared.checkForUpdates(force: false)` to run the 24-hour throttled check.

- [ ] **Step 4: Run all unit tests**

Run: `cd monkey-tools && swift test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd monkey-tools && git add Sources/MonkeyTools/UI/SettingsView.swift Sources/MonkeyTools/UI/StatusMenuController.swift Sources/MonkeyTools/AppDelegate.swift
git commit -m "feat(update): integrate update checker into SettingsView, StatusMenu, and launch lifecycle"
```

---

### Task 5: End-to-End Build, Test Verification & App Installation

- [ ] **Step 1: Run comprehensive tests**

Run: `cd monkey-tools && swift test`
Expected: All tests pass with 0 failures.

- [ ] **Step 2: Build release and install**

Run: `cd monkey-tools && ./scripts/build_app.sh && ./scripts/run.sh`
Expected: Clean build and launch of updated `/Applications/monkey-tools.app`.

- [ ] **Step 3: Commit documentation & manifest updates**

```bash
cd monkey-tools && git status
```
