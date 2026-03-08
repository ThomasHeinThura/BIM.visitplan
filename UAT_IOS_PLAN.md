# BIM.Visitplan UAT iOS Plan

## Current Readiness

- UAT backend default is already configured in the app.
- Expo iOS native project can be generated successfully.
- iOS bundle identifier for the app is `com.bim.visitplan`.
- The remaining blockers are local iOS toolchain setup and Apple signing, not React Native app logic.

## Verified App-Level Readiness

- Login screen supports iOS keyboard avoidance.
- Session persistence uses AsyncStorage and is cross-platform.
- Current default API base URL points to UAT.
- Release builds can bundle JavaScript in native builds.
- There are no current TypeScript diagnostics in the app source.

## Remaining Local Machine Tasks

1. Install CocoaPods.
2. Install the iOS platform component from Xcode Components.
3. Run `pod install` inside the `ios` folder.
4. Open `ios/BIMVisitplan.xcworkspace` in Xcode.

## UAT iOS Build Steps

1. Confirm Xcode is selected:
   `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`
2. Install CocoaPods if missing:
   `brew install cocoapods`
3. Install iOS platform components if Xcode says they are missing:
   Xcode > Settings > Components
4. Install pods:
   `cd ios && pod install`
5. Open the workspace:
   `open ios/BIMVisitplan.xcworkspace`
6. In Xcode, select the `BIMVisitplan` target.
7. Under Signing & Capabilities, choose your Apple team.
8. Set bundle identifier if your team requires a different one.
9. Build to a simulator first.
10. Build to a physical iPhone for UAT testing.

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

1. Increment `ios.buildNumber` in `app.json`.
2. Archive from Xcode.
3. Upload to App Store Connect.
4. Distribute through TestFlight for UAT testers.