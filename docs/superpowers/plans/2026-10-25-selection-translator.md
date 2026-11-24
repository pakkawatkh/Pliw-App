# Selection Translator (คุมดำแปลภาษา) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a selection translation feature in `monkey-copy` that displays a small floating action bubble near highlighted/selected text on macOS, allowing the user to click and view translations with a switchable engine mode between Google Translate and Apple Native translation.

**Architecture:**
- `TextSelectionMonitor`: Global mouse-up event monitor using macOS Accessibility API (`AXUIElementCopyAttributeValue` for `kAXSelectedTextAttribute` and `kAXBoundsForRangeParameterizedAttribute`) to detect text selection and calculate screen bounding coordinates across all macOS applications.
- `SelectionBubblePanel`: Non-activating floating `NSPanel` rendering a 28×28 pt action bubble near the selection end with smooth fade-in/out and outside-click auto-dismiss.
- `TranslationService` & Engines: Protocol-oriented translation architecture (`TranslationEngine` protocol) supporting both `GoogleTranslationEngine` (free, auto-detect, fast) and `AppleNativeTranslationEngine` (system-integrated macOS dictionary/shortcuts/framework), selectable via `AppSettings`.
- `TranslationPopoverPanel` & View: Floating popover showing source ➔ target language, original text, translated result, with Copy and Replace (CGEvent auto-paste back to selection) buttons.
- Settings Integration: Engine mode toggle in `SettingsView` (`Google Translate` vs `Apple Native`), toggle to enable/disable selection translate.

**Tech Stack:** Swift 6, SwiftUI, AppKit (`NSPanel`, `NSHostingView`), Accessibility API (`ApplicationServices.HIServices`), CoreGraphics Event Tap, Foundation (`URLSession`).

**Spec:** [selection_translate_plan.md](file:///Users/pakkawat/.gemini/antigravity/brain/7ce16779-7eeb-4c74-b7f6-1e04d039c603/selection_translate_plan.md) and User Request.

## Global Constraints

- Platform: macOS 13.0+
- Pure Swift SPM architecture, zero external third-party package dependencies
- Design: Clean High-Contrast Dark Theme matching monkey-copy aesthetic
- Non-intrusive: Selection bubble must dismiss immediately on outside click or keyboard input
- Accessibility permissions: Reuse existing `MonkeyCopyDeveloper` certificate and `AutoPaster` accessibility grants

## Review Focus

1. Whitespace or single non-word character selections must be ignored (do not pop bubble for accidental clicks).
2. Applications that do not implement parameterized text bounds must gracefully fallback to mouse cursor location without crash.
3. Network errors or offline state must display a clear, friendly error banner with a retry button instead of failing silently.
4. Rapid consecutive selections must cancel any pending in-flight requests and cleanly reposition the bubble.
5. The "Replace" action must preserve the user's active window focus and accurately replace the selected text.

---

### Task 1: Translation Engines and Service Core

**Files:**
- Create: `Sources/MonkeyCopy/Services/TranslationEngine.swift`
- Create: `Sources/MonkeyCopy/Services/GoogleTranslationEngine.swift`
- Create: `Sources/MonkeyCopy/Services/AppleNativeTranslationEngine.swift`
- Create: `Sources/MonkeyCopy/Services/TranslationService.swift`
- Test: `Tests/MonkeyCopyTests/TranslationServiceTests.swift`

**Interfaces:**
- Consumes: Foundation (`URLSession`), CoreServices / DictionaryServices
- Produces:
  ```swift
  public enum TranslationEngineMode: String, CaseIterable, Identifiable, Codable {
      case google = "google"
      case appleNative = "apple_native"
      public var id: String { rawValue }
      public var title: String { ... }
  }

  public struct TranslationResult: Equatable {
      public let originalText: String
      public let translatedText: String
      public let sourceLanguage: String
      public let targetLanguage: String
      public let engineUsed: TranslationEngineMode
  }

  public protocol TranslationEngine {
      var mode: TranslationEngineMode { get }
      func translate(text: String, from sourceLang: String?, to targetLang: String) async throws -> TranslationResult
  }

  public final class TranslationService: ObservableObject {
      public static let shared = TranslationService()
      public func translate(text: String, mode: TranslationEngineMode) async throws -> TranslationResult
  }
  ```

- [ ] **Step 1: Write the failing tests for Translation Models and Service**

```swift
// Tests/MonkeyCopyTests/TranslationServiceTests.swift
import XCTest
@testable import MonkeyCopy

final class TranslationServiceTests: XCTestCase {
    func testTranslationEngineModeEnum() {
        XCTAssertEqual(TranslationEngineMode.allCases.count, 2)
        XCTAssertEqual(TranslationEngineMode.google.title, "Google Translate")
        XCTAssertEqual(TranslationEngineMode.appleNative.title, "Apple Native")
    }

    func testGoogleTranslationURLQueryEncoding() {
        let engine = GoogleTranslationEngine()
        let text = "Hello world"
        let url = engine.makeTranslateURL(text: text, from: "auto", to: "th")
        XCTAssertNotNil(url)
        XCTAssertTrue(url!.absoluteString.contains("translate.googleapis.com"))
        XCTAssertTrue(url!.absoluteString.contains("tl=th"))
    }

    func testGoogleTranslationResponseParsing() throws {
        let sampleJSON = "[[[\"สวัสดีชาวโลก\",\"Hello world\",null,null,10]],null,\"en\",null,null,null,null,[]]"
        let engine = GoogleTranslationEngine()
        let result = try engine.parseResponse(jsonString: sampleJSON, originalText: "Hello world", targetLang: "th")
        XCTAssertEqual(result.translatedText, "สวัสดีชาวโลก")
        XCTAssertEqual(result.sourceLanguage, "en")
    }

    func testAppleNativeFallback() async {
        let engine = AppleNativeTranslationEngine()
        let text = "test"
        let result = try? await engine.translate(text: text, from: "en", to: "th")
        XCTAssertNotNil(result)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `swift test --filter TranslationServiceTests`  
Expected: Compilation failure due to missing `TranslationEngine`, `GoogleTranslationEngine`, and `TranslationService`.

- [ ] **Step 3: Implement TranslationEngine protocol and Google / Apple Native engines**

Implement `TranslationEngine.swift`, `GoogleTranslationEngine.swift`, `AppleNativeTranslationEngine.swift`, and `TranslationService.swift` in `Sources/MonkeyCopy/Services/`.
- `GoogleTranslationEngine`: Uses `URLSession.shared.data(from: ...)` with `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=\(target)&dt=t&q=\(encoded)` and parses the multi-segment response.
- `AppleNativeTranslationEngine`: Uses macOS DictionaryServices / `DCSCopyTextDefinition` and system language utilities, falling back to Google engine if system dictionary produces no translation.
- `TranslationService`: Manages active engine, provides async `translate(text:mode:)` with in-memory caching for repeated lookups.

- [ ] **Step 4: Run tests and ensure they pass**

Run: `swift test --filter TranslationServiceTests`  
Expected: PASS with 0 failures.

- [ ] **Step 5: Commit Task 1**

```bash
git add Sources/MonkeyCopy/Services/Translation*.swift Sources/MonkeyCopy/Services/Google*.swift Sources/MonkeyCopy/Services/Apple*.swift Tests/MonkeyCopyTests/TranslationServiceTests.swift
git commit -m "feat(translator): implement TranslationService with Google and Apple Native engines"
```

---

### Task 2: AppSettings Translation Preferences

**Files:**
- Modify: `Sources/MonkeyCopy/Services/AppSettings.swift`
- Test: `Tests/MonkeyCopyTests/TranslationSettingsTests.swift`

**Interfaces:**
- Consumes: `TranslationEngineMode` from Task 1
- Produces:
  ```swift
  extension AppSettings {
      @Published public var selectionTranslateEnabled: Bool
      @Published public var translationEngineMode: TranslationEngineMode
      @Published public var translationTargetLang: String // "auto", "th", "en"
  }
  ```

- [ ] **Step 1: Write failing test for Translation Settings**

```swift
// Tests/MonkeyCopyTests/TranslationSettingsTests.swift
import XCTest
@testable import MonkeyCopy

final class TranslationSettingsTests: XCTestCase {
    func testTranslationSettingsDefaults() {
        let settings = AppSettings.shared
        XCTAssertTrue(settings.selectionTranslateEnabled)
        XCTAssertEqual(settings.translationEngineMode, .google)
        XCTAssertEqual(settings.translationTargetLang, "auto")
    }

    func testTranslationEngineSwitching() {
        let settings = AppSettings.shared
        settings.translationEngineMode = .appleNative
        XCTAssertEqual(settings.translationEngineMode, .appleNative)
        settings.translationEngineMode = .google
        XCTAssertEqual(settings.translationEngineMode, .google)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `swift test --filter TranslationSettingsTests`  
Expected: Compilation error (`selectionTranslateEnabled` and `translationEngineMode` not found on `AppSettings`).

- [ ] **Step 3: Add properties and UserDefaults backing to `AppSettings.swift`**

Add `selectionTranslateEnabled` (default `true`), `translationEngineMode` (default `.google`), and `translationTargetLang` (default `"auto"`).

- [ ] **Step 4: Run test to verify it passes**

Run: `swift test --filter TranslationSettingsTests`  
Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add Sources/MonkeyCopy/Services/AppSettings.swift Tests/MonkeyCopyTests/TranslationSettingsTests.swift
git commit -m "feat(settings): add translation engine mode and selection translate toggle"
```

---

### Task 3: Text Selection & Screen Coordinate Monitor

**Files:**
- Create: `Sources/MonkeyCopy/Services/TextSelectionMonitor.swift`
- Test: `Tests/MonkeyCopyTests/TextSelectionMonitorTests.swift`

**Interfaces:**
- Consumes: Accessibility API (`ApplicationServices.HIServices`), `NSEvent.addGlobalMonitorForEvents`
- Produces:
  ```swift
  public struct TextSelectionEvent: Equatable {
      public let text: String
      public let screenRect: CGRect
      public let sourceAppPID: pid_t
  }

  public final class TextSelectionMonitor: ObservableObject {
      public static let shared = TextSelectionMonitor()
      public var onSelectionDetected: ((TextSelectionEvent) -> Void)?
      public var onSelectionCleared: (() -> Void)?
      public func startMonitoring()
      public func stopMonitoring()
  }
  ```

- [ ] **Step 1: Write unit tests for selection text validation and filtering**

```swift
// Tests/MonkeyCopyTests/TextSelectionMonitorTests.swift
import XCTest
@testable import MonkeyCopy

final class TextSelectionMonitorTests: XCTestCase {
    func testValidSelectionTextFiltering() {
        let monitor = TextSelectionMonitor.shared
        XCTAssertFalse(monitor.isValidSelectionText(""))
        XCTAssertFalse(monitor.isValidSelectionText("   "))
        XCTAssertFalse(monitor.isValidSelectionText("\n\t"))
        XCTAssertTrue(monitor.isValidSelectionText("hello"))
        XCTAssertTrue(monitor.isValidSelectionText("สวัสดี"))
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `swift test --filter TextSelectionMonitorTests`  
Expected: Compilation failure.

- [ ] **Step 3: Implement `TextSelectionMonitor.swift`**

- Set up global mouse monitor for `.leftMouseUp`.
- Debounce 150ms to allow macOS selection highlight to complete.
- Read focused element via `kAXFocusedUIElementAttribute`.
- Extract `kAXSelectedTextAttribute`.
- Extract text range rect using `kAXBoundsForRangeParameterizedAttribute` with fallback to `NSEvent.mouseLocation`.
- Dispatch `TextSelectionEvent` when valid text is selected.

- [ ] **Step 4: Run test to verify it passes**

Run: `swift test --filter TextSelectionMonitorTests`  
Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add Sources/MonkeyCopy/Services/TextSelectionMonitor.swift Tests/MonkeyCopyTests/TextSelectionMonitorTests.swift
git commit -m "feat(selection): implement TextSelectionMonitor with Accessibility API"
```

---

### Task 4: Selection Bubble Floating Panel

**Files:**
- Create: `Sources/MonkeyCopy/UI/SelectionBubblePanel.swift`

**Interfaces:**
- Consumes: `TextSelectionEvent` from Task 3
- Produces:
  ```swift
  public final class SelectionBubblePanel: NSPanel {
      public static let shared = SelectionBubblePanel()
      public func show(at rect: CGRect, selectedText: String)
      public func hide()
  }
  ```

- [ ] **Step 1: Implement `SelectionBubblePanel.swift`**

- Create `NSPanel` with style mask `[.borderless, .nonactivatingPanel]`, `level = .floating`.
- Set frame to 28×28 pt circular bubble.
- SwiftUI View: Icon 🌐 or 🐵 with dark acrylic frosted glass backing, subtle 1pt border stroke, and hover scale animation.
- Position at top-right corner of `rect`.
- Handle click action: Trigger `TranslationPopoverPanel.shared.show(...)`.
- Auto-dismiss on outside click or Esc key.

- [ ] **Step 2: Build and verify compilation**

Run: `swift build`  
Expected: Build complete with zero errors.

- [ ] **Step 3: Commit Task 4**

```bash
git add Sources/MonkeyCopy/UI/SelectionBubblePanel.swift
git commit -m "feat(ui): implement SelectionBubblePanel floating action button"
```

---

### Task 5: Translation Popover Window and Action View

**Files:**
- Create: `Sources/MonkeyCopy/UI/TranslationPopoverView.swift`
- Create: `Sources/MonkeyCopy/UI/TranslationPopoverPanel.swift`

**Interfaces:**
- Consumes: `TranslationService` (Task 1), `AppSettings` (Task 2), `AutoPaster`
- Produces:
  ```swift
  public final class TranslationPopoverPanel: NSPanel {
      public static let shared = TranslationPopoverPanel()
      public func show(text: String, near screenPoint: CGPoint)
      public func hide()
  }
  ```

- [ ] **Step 1: Implement `TranslationPopoverView.swift`**

- SwiftUI View:
  - Header: Source Language ➔ Target Language, Engine Mode Pill (`[Google]` / `[Apple]`) that can be tapped to switch engines on-the-fly.
  - Body:
    - Original text preview.
    - Divider.
    - Translated text result (or loading spinner / error retry button).
  - Footer Action Buttons:
    - 📋 **Copy**: Copies translation to `NSPasteboard.general` and shows temporary "Copied!" checkmark.
    - ⚡ **Replace**: Uses `AutoPaster` to replace the highlighted selection with the translated text in the active app.
    - ✕ **Close**: Closes the popover.
- Style: High-contrast Dark Acrylic theme matching monkey-copy.

- [ ] **Step 2: Implement `TranslationPopoverPanel.swift`**

- `NSPanel` hosting `TranslationPopoverView`, positioned neatly adjacent to the bubble or selection rect.
- Closes on outside click or Esc.

- [ ] **Step 3: Build and verify compilation**

Run: `swift build`  
Expected: Build complete with zero errors.

- [ ] **Step 4: Commit Task 5**

```bash
git add Sources/MonkeyCopy/UI/TranslationPopoverView.swift Sources/MonkeyCopy/UI/TranslationPopoverPanel.swift
git commit -m "feat(ui): implement TranslationPopoverPanel with copy and replace actions"
```

---

### Task 6: Settings UI Integration and End-to-End Verification

**Files:**
- Modify: `Sources/MonkeyCopy/UI/SettingsView.swift`
- Modify: `Sources/MonkeyCopy/AppDelegate.swift`
- Modify: `Sources/MonkeyCopy/main.swift`

- [ ] **Step 1: Add Translation section to `SettingsView.swift`**

- Add new section:
  - Toggle: "เปิดใช้งานไอคอนแปลภาษาเมื่อคุมดำ (Selection Translator)"
  - Picker: "เครื่องมือแปลภาษา (Translation Engine)":
    - Option 1: "Google Translate (ฟรี, รวดเร็ว, ตรวจจับภาษาอัตโนมัติ)"
    - Option 2: "Apple Native Translation (ระบบของ macOS)"
  - Status indicator & tip: Explains that switching engines can be done both here and inside the translation popover.

- [ ] **Step 2: Initialize `TextSelectionMonitor` in `AppDelegate.swift`**

- In `applicationDidFinishLaunching`:
  - If `AppSettings.shared.selectionTranslateEnabled` is true, start monitoring.
  - Wire callback: When selection detected ➔ show `SelectionBubblePanel`.
  - When selection cleared / outside click ➔ hide bubble.

- [ ] **Step 3: Run full unit test suite**

Run: `swift test`  
Expected: All tests pass.

- [ ] **Step 4: Rebuild release app and run end-to-end verification**

Run: `./scripts/build_app.sh`  
Expected: App bundle builds cleanly, signed with `MonkeyCopyDeveloper`, updated in `/Applications`.

- [ ] **Step 5: Commit Task 6**

```bash
git add Sources/MonkeyCopy/UI/SettingsView.swift Sources/MonkeyCopy/AppDelegate.swift
git commit -m "feat(settings): integrate translation engine settings and selection monitor lifecycle"
```

---

## Self-Review Checklist

1. **Spec Coverage:**
   - คลุมดำแล้วมีไอคอนเล็กๆ เด้งมุมขวา: Covered by Task 3 & 4.
   - กดแล้วแปลภาษา: Covered by Task 1 & 5.
   - รองรับทั้ง Google Translate และ Apple Native: Covered by Task 1, 2, 5 & 6.
   - สลับโหมดแปลได้: Covered by Task 2, 5 & 6.
2. **Step Scan:** Every step has exact signatures, exact files, checkable commands, and commit messages.
3. **Type Consistency:** `TranslationEngineMode`, `TranslationResult`, `TextSelectionEvent` match across all tasks.
4. **Review Focus:** Covered empty selection, fallback to mouse coordinates, error banner, and replace focus.
5. **Proportion:** Concise, modular, testable tasks.
