# BIM.Visitplan UAT iOS Plan

## Current Readiness

- Next TestFlight target: app version `2.6.0` with iOS build `5`.
- UAT backend default is already configured in the app.
- Expo iOS native project can be generated successfully.
- CocoaPods install completed successfully for the generated iOS workspace.
- Simulator build succeeds for `iPhone 17` on iOS 26.4.1.
- iOS bundle identifier for the app is `com.bim.visitplan`.
- Physical iPhone install already works when Xcode can auto-manage development signing.
- The remaining blocker for TestFlight is Apple account access for team `BB26RT3JYN` plus App Store distribution/upload credentials on this Mac.

## Current Blocker For Device Release

- This Mac has Apple Development identities, but Xcode archive failed with `No Account for Team "BB26RT3JYN"`.
- No App Store Connect upload credential is configured locally.
- No App Store distribution profile is currently available locally for `com.bim.visitplan`.

## Verified App-Level Readiness

- Login screen supports iOS keyboard avoidance.
- Session persistence uses AsyncStorage and is cross-platform.
- Current default API base URL points to UAT.
- Release builds can bundle JavaScript in native builds.
- There are no current TypeScript diagnostics in the app source.

## Remaining Local Machine Tasks

1. Add the Apple account that owns team `BB26RT3JYN` in Xcode.
2. Let Xcode download signing assets for `com.bim.visitplan`.
3. Add App Store Connect upload credentials on this Mac or use EAS-managed submit.
4. Keep using `ios/BIMVisitplan.xcworkspace`, not the `.xcodeproj`.

## Exact Xcode Account And Signing Setup On This Mac

1. Open Xcode.
2. Go to `Xcode > Settings > Accounts`.
3. Add the Apple ID that has access to Developer Team `BB26RT3JYN`.
4. Select that account and click `Manage Certificates`.
5. Make sure at least one `Apple Distribution` certificate exists for the team.
6. Open `ios/BIMVisitplan.xcworkspace`.
7. Select the `BIMVisitplan` target.
8. Open `Signing & Capabilities`.
9. Set `Team` to `BB26RT3JYN`.
10. Keep `Bundle Identifier` as `com.bim.visitplan`.
11. Keep `Automatically manage signing` enabled.
12. Build once for `Any iOS Device` so Xcode refreshes provisioning.
13. If Xcode prompts to register devices or create profiles, allow it.

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
6. Under Signing & Capabilities, choose team `BB26RT3JYN`.
7. Keep bundle identifier as `com.bim.visitplan`.
8. Build to a simulator first.
9. Build to a physical iPhone for UAT testing.

## Exact Physical iPhone UAT Steps

1. Connect the iPhone by cable.
2. Trust the Mac on the iPhone if prompted.
3. In Xcode, choose the connected iPhone as the run destination.
4. In Signing & Capabilities, make sure team `BB26RT3JYN` resolves signing warnings.
5. Press Run in Xcode.
6. On the iPhone, if prompted, allow Developer Mode and trust the developer certificate.
7. Launch the app on the device and test against UAT.

## Exact Archive And TestFlight Steps

1. Increment `ios.buildNumber` in `app.json` before each new upload.
2. Open `ios/BIMVisitplan.xcworkspace` in Xcode.
3. Confirm Signing & Capabilities is green for team `BB26RT3JYN`.
4. Select `Any iOS Device` as the build destination.
5. Use the `Release` configuration.
6. Run `Product > Archive`.
7. Wait for Organizer to open.
8. Select the archive and choose `Distribute App`.
9. Choose `App Store Connect`.
10. Choose `Upload`.
11. Complete the upload.
12. In App Store Connect, open TestFlight and wait for processing.
13. Add internal testers first.
14. For external testers, submit the build for Beta App Review if required.

## EAS TestFlight Pipeline

1. Log in to Expo on this Mac:
   `npx eas login`
2. Build the iOS store artifact:
   `npm run ios:testflight:build`
3. Submit the latest iOS build to App Store Connect:
   `npm run ios:testflight:submit`
4. Or run both in sequence:
   `npm run ios:testflight`

### Notes For EAS

- `eas.json` now includes an iOS `production` build profile with `distribution: store`.
- The repo now includes `submit.production` so `eas submit` uses the same profile name.
- EAS still requires valid Apple credentials for team `BB26RT3JYN` during build or submit.
- If App Store Connect API keys are preferred, place `AuthKey_<KEYID>.p8` in one of:
  - `~/.appstoreconnect/private_keys`
  - `~/.private_keys`
  - `~/private_keys`

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

1. Make sure signing is green in Xcode for team `BB26RT3JYN`.
2. Increment `ios.buildNumber` in `app.json`.
3. Use either Xcode archive/upload or the EAS production pipeline.
4. Upload to App Store Connect.
5. Distribute through TestFlight for UAT testers.