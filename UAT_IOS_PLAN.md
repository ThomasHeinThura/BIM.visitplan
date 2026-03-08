# BIM.Visitplan UAT iOS Plan

## Current Readiness

- UAT backend default is already configured in the app.
- Expo iOS native project can be generated successfully.
- CocoaPods install completed successfully for the generated iOS workspace.
- Simulator build succeeds for `iPhone 17 Pro` on iOS 26.3.1.
- iOS bundle identifier for the app is `com.bim.visitplan`.
- The remaining blocker for installable iPhone/TestFlight builds is Apple signing.

## Current Blocker For Device Release

- No valid Apple code-signing identities are installed on this Mac.
- The Xcode project does not yet have a configured development team.
- Because of that, you cannot produce an installable `.ipa` or TestFlight upload yet.

## Verified App-Level Readiness

- Login screen supports iOS keyboard avoidance.
- Session persistence uses AsyncStorage and is cross-platform.
- Current default API base URL points to UAT.
- Release builds can bundle JavaScript in native builds.
- There are no current TypeScript diagnostics in the app source.

## Remaining Local Machine Tasks

1. Add an Apple account in Xcode.
2. Select a development team in Signing & Capabilities.
3. Connect a physical iPhone if you want direct device UAT installation.
4. Keep using `ios/BIMVisitplan.xcworkspace`, not the `.xcodeproj`.

## UAT iOS Build Steps

1. Confirm Xcode is selected:
   `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`
2. Install CocoaPods if missing:
   `brew install cocoapods`
3. Install pods:
   `cd ios && pod install`
4. Open the workspace:
   `open ios/BIMVisitplan.xcworkspace`
5. In Xcode, select the `BIMVisitplan` target.
6. Under Signing & Capabilities, choose your Apple team.
7. Keep bundle identifier as `com.bim.visitplan`, unless your Apple team requires a different identifier.
8. Build to a simulator first.
9. Build to a physical iPhone for UAT testing.

## Exact Physical iPhone UAT Steps

1. Connect the iPhone by cable.
2. Trust the Mac on the iPhone if prompted.
3. In Xcode, choose the connected iPhone as the run destination.
4. In Signing & Capabilities, make sure the selected Apple team resolves signing warnings.
5. Press Run in Xcode.
6. On the iPhone, if prompted, allow Developer Mode and trust the developer certificate.
7. Launch the app on the device and test against UAT.

## Exact Archive And TestFlight Steps

1. Increment `ios.buildNumber` in `app.json` before each new upload.
2. Open `ios/BIMVisitplan.xcworkspace` in Xcode.
3. Select `Any iOS Device` as the build destination.
4. Use the `Release` configuration.
5. Run `Product > Archive`.
6. Wait for Organizer to open.
7. Select the archive and choose `Distribute App`.
8. Choose `App Store Connect`.
9. Choose `Upload`.
10. Keep automatic signing unless your Apple team requires manual signing.
11. Complete the upload.
12. In App Store Connect, open TestFlight and wait for processing.
13. Add internal testers first.
14. For external testers, submit the build for Beta App Review if required.

## UAT Test Scope For iOS

1. Login with UAT credentials.
2. Verify refresh keeps the session.
3. Verify visit plan list loads.
4. Verify create visit plan.
5. Verify edit visit plan.
6. Verify team member assignment.
7. Verify date picker behavior.
8. Verify the 3-day schedule on iPhone layout.
9. Verify logout and login again.
10. Verify failure messaging on invalid login or network error.

## If You Need TestFlight Later

1. Make sure signing is green in Xcode.
2. Increment `ios.buildNumber` in `app.json`.
3. Archive from Xcode.
4. Upload to App Store Connect.
5. Distribute through TestFlight for UAT testers.