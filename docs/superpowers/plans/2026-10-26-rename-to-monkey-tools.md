# Rename Application to monkey-tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the application from `monkey-copy` / `MonkeyCopy` to `monkey-tools` / `MonkeyTools` across SPM package configuration, source targets, UI text, storage path (with backward migration), build scripts, DMG packager, and documentation.

**Architecture:** Update Swift Package Manager structure (`Package.swift`, source directory `Sources/MonkeyTools`, test directory `Tests/MonkeyToolsTests`). Update application metadata, bundle identifier (`com.local.monkey-tools`), menu items, window titles, and localization keys. Provide seamless clipboard database migration from legacy `monkey-copy` directory in Application Support. Update packaging scripts (`build_app.sh`, `run.sh`, `create_dmg.sh`) to assemble `/Applications/monkey-tools.app`.

**Tech Stack:** Swift 5.9, AppKit, SwiftUI, Swift Package Manager, macOS shell scripting.

**Spec:** User instruction: "เปลี่ยนชื่แอพเป็น monkey-tools".

## Global Constraints

- App bundle name: `monkey-tools.app`
- App executable name: `monkey-tools`
- Swift module name: `MonkeyTools`
- Bundle identifier: `com.local.monkey-tools`
- Storage directory: `~/Library/Application Support/monkey-tools` (with migration from `monkey-copy` if present)
- Existing tests must pass (36/36)
- Maintain backward compatibility for existing user clipboard history

## Review Focus

1. User data persistence: Existing clipboard history in `~/Library/Application Support/monkey-copy` must migrate automatically without data loss.
2. Single-instance running check: Running check in `AppDelegate.swift` must filter by `com.local.monkey-tools`.
3. Self-window exclusion in `TextSelectionMonitor`: Must check `Bundle.main.bundleIdentifier` correctly so selecting text inside monkey-tools never triggers selection popover.
4. Process termination during script updates: `build_app.sh` and `run.sh` must terminate running instances of `monkey-tools` (and `monkey-copy`).
5. Window and Menu titles: Must display `monkey-tools` across all supported languages (Thai, English, Chinese).

---

### Task 1: Package & Module Renaming

**Files:**
- Modify: `Package.swift`
- Move: `Sources/MonkeyCopy` -> `Sources/MonkeyTools`
- Move: `Tests/MonkeyCopyTests` -> `Tests/MonkeyToolsTests`
- Modify: All files in `Tests/MonkeyToolsTests/` (`@testable import MonkeyTools`)

**Interfaces:**
- Consumes: Existing Swift source and test files
- Produces: `MonkeyTools` module, `monkey-tools` executable

- [ ] **Step 1: Update `Package.swift`**
  Set package name to `monkey-tools`, executable product name to `monkey-tools` targeting `MonkeyTools`, target `MonkeyTools` at path `Sources/MonkeyTools`, and test target `MonkeyToolsTests` at path `Tests/MonkeyToolsTests`.

- [ ] **Step 2: Rename source and test directories via git mv**
  Run:
  `git mv Sources/MonkeyCopy Sources/MonkeyTools`
  `git mv Tests/MonkeyCopyTests Tests/MonkeyToolsTests`

- [ ] **Step 3: Update `@testable import` in test files**
  Replace `@testable import MonkeyCopy` with `@testable import MonkeyTools` in:
  - `Tests/MonkeyToolsTests/ClipboardManagerTests.swift`
  - `Tests/MonkeyToolsTests/SpeechAndLanguageTests.swift`
  - `Tests/MonkeyToolsTests/TextSelectionMonitorTests.swift`
  - `Tests/MonkeyToolsTests/TranslationServiceTests.swift`
  - `Tests/MonkeyToolsTests/TranslationSettingsTests.swift`

- [ ] **Step 4: Verify test build**
  Run: `swift test`
  Expected: Package builds and all tests compile under `MonkeyTools`.

- [ ] **Step 5: Commit**
  ```bash
  git add Package.swift Sources/MonkeyTools Tests/MonkeyToolsTests
  git commit -m "refactor: rename Swift package and targets to monkey-tools and MonkeyTools"
  ```

---

### Task 2: Storage Path & Backward Compatibility Migration

**Files:**
- Modify: `Sources/MonkeyTools/Services/ClipboardStorage.swift`
- Test: `Tests/MonkeyToolsTests/ClipboardManagerTests.swift`

**Interfaces:**
- Consumes: `FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)`
- Produces: `storageDir` pointing to `Application Support/monkey-tools`, with automatic migration from `monkey-copy` if needed

- [ ] **Step 1: Write migration test in `ClipboardManagerTests.swift`**
  Verify that `ClipboardStorage` uses `monkey-tools` as its directory name.

- [ ] **Step 2: Update `ClipboardStorage.swift`**
  Change app directory to `monkey-tools`.
  Before creating a fresh folder, check if `~/Library/Application Support/monkey-tools` does not exist and `~/Library/Application Support/monkey-copy` exists. If so, copy/move items over to preserve existing user data seamlessly.

- [ ] **Step 3: Run tests to verify**
  Run: `swift test --filter ClipboardManagerTests`
  Expected: PASS

- [ ] **Step 4: Commit**
  ```bash
  git add Sources/MonkeyTools/Services/ClipboardStorage.swift Tests/MonkeyToolsTests/ClipboardManagerTests.swift
  git commit -m "feat: update storage directory to monkey-tools with legacy migration"
  ```

---

### Task 3: Application Code, UI Labels & Localization

**Files:**
- Modify: `Sources/MonkeyTools/AppDelegate.swift`
- Modify: `Sources/MonkeyTools/Services/LocalizationManager.swift`
- Modify: `Sources/MonkeyTools/UI/SettingsWindowController.swift`
- Modify: `Sources/MonkeyTools/UI/StatusMenuController.swift`
- Modify: `Sources/MonkeyTools/Services/TextSelectionMonitor.swift`
- Modify: `Tests/MonkeyToolsTests/TranslationSettingsTests.swift`

**Interfaces:**
- Consumes: `LocalizationManager`, `SettingsWindowController`, `StatusMenuController`
- Produces: Consistent `monkey-tools` branding across menus, tooltips, settings titles, and logs

- [ ] **Step 1: Update `AppDelegate.swift`**
  - Bundle ID fallback: `"com.local.monkey-tools"`
  - Log prefixes: `[monkey-tools]`

- [ ] **Step 2: Update `LocalizationManager.swift`**
  - `settings_title`: `การตั้งค่า monkey-tools` / `monkey-tools Settings` / `monkey-tools 设置`
  - `menu_show_monkey`: `เปิด monkey-tools` / `Show monkey-tools` / `打开 monkey-tools`
  - `menu_quit_item`: `ออกจาก monkey-tools` / `Quit monkey-tools` / `退出 monkey-tools`

- [ ] **Step 3: Update `SettingsWindowController.swift` & `StatusMenuController.swift`**
  - Window title: `monkey-tools Preferences`
  - Menu bar icon tooltip: `monkey-tools (คลิกเพื่อเปิดการตั้งค่า / Settings)`

- [ ] **Step 4: Update test expectation in `TranslationSettingsTests.swift`**
  Change expected title in `testSettingsWindowController` to `"monkey-tools Preferences"`.

- [ ] **Step 5: Run tests**
  Run: `swift test`
  Expected: PASS (all 36 tests pass)

- [ ] **Step 6: Commit**
  ```bash
  git add Sources/MonkeyTools/ Tests/MonkeyToolsTests/
  git commit -m "feat: update UI strings, window titles, and bundle IDs to monkey-tools"
  ```

---

### Task 4: Build Scripts, DMG Creator, and Documentation

**Files:**
- Modify: `scripts/build_app.sh`
- Modify: `scripts/run.sh`
- Modify: `scripts/create_dmg.sh`
- Modify: `README.md`

**Interfaces:**
- Consumes: `monkey-tools` binary built by SwiftPM
- Produces: `/Applications/monkey-tools.app`, `monkey-tools-Installer.dmg`

- [ ] **Step 1: Update `scripts/build_app.sh`**
  - `RELEASE_BIN="${PROJECT_DIR}/.build/release/monkey-tools"`
  - `APP_DIR="${PROJECT_DIR}/monkey-tools.app"`
  - Plist: `CFBundleExecutable` = `monkey-tools`, `CFBundleIdentifier` = `com.local.monkey-tools`, `CFBundleName` = `monkey-tools`, `CFBundleDisplayName` = `monkey-tools`
  - Certificate name: `MonkeyToolsDeveloper` (or keep development cert generation matching)
  - Target: `/Applications/monkey-tools.app`
  - Terminate previous `monkey-tools` and `monkey-copy` instances

- [ ] **Step 2: Update `scripts/run.sh`**
  - Kill `monkey-tools` and `monkey-copy`
  - Launch `/Applications/monkey-tools.app` (fallback to `${PROJECT_DIR}/monkey-tools.app`)

- [ ] **Step 3: Update `scripts/create_dmg.sh`**
  - Output DMG name: `monkey-tools-Installer.dmg`
  - Volume name: `monkey-tools Installer`
  - Bundle: `monkey-tools.app`

- [ ] **Step 4: Update `README.md`**
  - Change all documentation headings, badges, download links, and instructions to `monkey-tools`

- [ ] **Step 5: Run build script**
  Run: `./scripts/build_app.sh`
  Expected: Exit 0, successfully builds `/Applications/monkey-tools.app`

- [ ] **Step 6: Commit**
  ```bash
  git add scripts/ README.md
  git commit -m "chore: update build scripts, packaging, and documentation to monkey-tools"
  ```

---

### Task 5: End-to-End Verification

**Files:** None (verification step)

- [ ] **Step 1: Run all unit tests**
  Run: `swift test`
  Expected: 36/36 tests pass

- [ ] **Step 2: Launch application**
  Run: `./scripts/run.sh`
  Expected: App launches successfully from `/Applications/monkey-tools.app`

- [ ] **Step 3: Verify process status**
  Run: `ps aux | grep monkey-tools | grep -v grep`
  Expected: Process `/Applications/monkey-tools.app/Contents/MacOS/monkey-tools` is running
