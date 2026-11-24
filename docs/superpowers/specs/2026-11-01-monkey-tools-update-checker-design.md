# Design Spec: Update Checker via pliw-app for monkey-tools

- **Date:** 2026-11-01
- **Status:** Proposed (Awaiting Approval)
- **Target Repository:** `monkey-tools` (`/Users/pakkawat/Documents/clipboard/monkey-tools`) & `pliw-app` (`/Users/pakkawat/Documents/clipboard/pliw-app`)
- **Target Platform:** macOS 13.0+ (Swift 5.9+, AppKit & SwiftUI)

---

## 1. Intent & Context (The "Why")

`pakkawatkh/monkey-tools` is a private development repository, while `pliw-app` (`https://pakkawatkh.github.io/pliw-app/`) serves as the official public web portal and distribution hub.

Users currently have no automated way to know when a new version of `monkey-tools` is released. 

This feature introduces an automated, lightweight Update Checker in `monkey-tools` that checks for updates against a static public manifest hosted on `pliw-app` once every 24 hours (or manually on-demand), and alerts users with one-click installer download options.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **Manifest on `pliw-app` (`pliw-app/monkey-tools/version.json`)**:
  - Provide a clean, public, CDN-cached JSON manifest without GitHub API rate limits.
  - Manifest schema:
    ```json
    {
      "latestVersion": "2.1.0",
      "releaseDate": "2026-11-01",
      "downloadUrl": "https://pakkawatkh.github.io/pliw-app/monkey-tools/monkey-tools-Installer.dmg",
      "pageUrl": "https://pakkawatkh.github.io/pliw-app/monkey-tools/",
      "releaseNotes": "Real-time Network Monitor, Fixed Menu Bar Slot, and Modular Settings Tabs"
    }
    ```
- **Update Check Service (`UpdateCheckService.swift`)**:
  - Automatically queries the manifest in the background on app launch, **throttled to at most once per 24 hours** (persisted in `UserDefaults`).
  - Supports on-demand manual check (bypassing the 24-hour throttle) via "Check for Updates" button.
  - Compares versions using semantic versioning (`isNewer(remoteVersion, currentVersion)`).
- **Presentation in Settings (`SettingsView` - General Tab)**:
  - Displays current version (e.g. `v2.1.0`) and last checked timestamp.
  - "Check for Updates" button with loading indicator.
  - If a newer version is found: displays a prominent recommendation card with release notes and a direct "Download Update" button.
  - If already up to date: displays a reassuring "You're up to date" checkmark badge.
- **Menu Bar Integration (`StatusMenuController`)**:
  - When an update is detected, dynamically adds a highlighted item in the menu: `✨ Update Available (vX.X.X) - Click to Download`.
  - Also includes a standard `🔄 Check for Updates...` menu item.
- **Trilingual Localization (`LocalizationManager`)**:
  - Full translations for Thai (🇹🇭), English (🇺🇸), and Simplified Chinese (🇨🇳).

### Non-Goals
- Silent in-place binary patching / background daemon installation (macOS app bundles require user confirmation and Gatekeeper quarantine handling; downloading `.dmg` directly from `pliw-app` provides the cleanest, safest user experience).
- Checking against the private `pakkawatkh/monkey-tools` repository.

### Anti-Goals
- Never spam the network: strict 24-hour rate limit on automated background checks.
- Never block the UI thread during network fetches.
- Never throw intrusive modal popups that interrupt user workflow.

---

## 3. Approaches Considered

### Approach 1: Static `version.json` on `pliw-app` (Selected)
- Host `version.json` on GitHub Pages (`https://pakkawatkh.github.io/pliw-app/monkey-tools/version.json`) with fallback to raw GitHub content.
- **Trade-offs:** 100% public, 0 rate limit errors, seamless integration with the existing `pliw-app` distribution hub.

### Approach 2: GitHub Releases API on `pakkawatkh/pliw-app`
- Query GitHub's API endpoint `api.github.com/repos/pakkawatkh/pliw-app/releases/latest`.
- **Trade-offs:** Imposes a 60 request/hour IP rate limit, requiring release tag creation in `pliw-app` instead of editing the web static files.

*Decision:* Approach 1 was selected for its reliability, zero rate limits, and simplicity.

---

## 4. Architecture & Implementation Details

### A. Manifest File (`pliw-app/monkey-tools/version.json`)
Created in `pliw-app/monkey-tools/version.json` with keys `latestVersion`, `releaseDate`, `downloadUrl`, `pageUrl`, and `releaseNotes`.

### B. Models & Semantic Versioning (`UpdateInfo.swift`)
```swift
public struct UpdateInfo: Codable, Equatable {
    public let latestVersion: String
    public let releaseDate: String
    public let downloadUrl: String
    public let pageUrl: String
    public let releaseNotes: String

    public static func isVersion(_ remote: String, newerThan local: String) -> Bool {
        let vRemote = remote.trimmingCharacters(in: CharacterSet(charactersIn: "vV")).split(separator: ".").compactMap { Int($0) }
        let vLocal = local.trimmingCharacters(in: CharacterSet(charactersIn: "vV")).split(separator: ".").compactMap { Int($0) }
        let maxCount = max(vRemote.count, vLocal.count)
        for i in 0..<maxCount {
            let r = i < vRemote.count ? vRemote[i] : 0
            let l = i < vLocal.count ? vLocal[i] : 0
            if r > l { return true }
            if r < l { return false }
        }
        return false
    }
}
```

### C. UpdateCheckService (`UpdateCheckService.swift`)
- Singleton `UpdateCheckService.shared: ObservableObject`
- Method `checkForUpdates(force: Bool = false)`:
  - If `!force`: checks `lastCheckDate` in `UserDefaults`. If `< 86400` seconds ago, returns without request.
  - Queries `https://pakkawatkh.github.io/pliw-app/monkey-tools/version.json` with fallback to `raw.githubusercontent.com/pakkawatkh/pliw-app/main/monkey-tools/version.json`.
  - Updates `@Published var updateAvailable: Bool` and `@Published var latestUpdateInfo: UpdateInfo?`.

### D. Settings UI & Menu Bar
- Added to `GeneralTabContent` in `SettingsView.swift`:
  - Section with Current Version, Last Checked time, Check for Updates button, and Update Alert card with Download button (`NSWorkspace.shared.open(downloadUrl)`).
- Added to `StatusMenuController.swift`:
  - Menu item `🔄 Check for Updates...` and dynamic `✨ Update Available (v...)` item.

---

## 5. Verification & Testing Strategy

1. **Unit Tests (`UpdateInfoTests.swift`)**:
   - Test version comparison logic:
     - `2.1.1` > `2.1.0` -> `true`
     - `2.2.0` > `2.1.0` -> `true`
     - `3.0.0` > `2.1.0` -> `true`
     - `2.1.0` vs `2.1.0` -> `false`
     - `2.0.1` vs `2.1.0` -> `false`
     - Prefix handles `v2.1.1` cleanly.
   - Test JSON decoder for `version.json` payload.
2. **Automated Throttling Tests**:
   - Verify that non-forced checks within 24 hours are suppressed.
   - Verify that forced checks always execute.
3. **Build & Manual Verification**:
   - Run `swift test` and `swift build -c release`.
   - Verify UI layout in General tab and Menu bar context menu.
