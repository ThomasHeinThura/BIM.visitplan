# Building installable apps

How to produce an APK and an IPA from this repo. Written after working through the
build on a clean machine, so the parts that actually bite are called out rather than
assumed.

---

## Before anything: the API URL is baked in at build time

`EXPO_PUBLIC_CRM_API_URL` is inlined into the JavaScript bundle when you build. An APK
built against `http://localhost:8000` will **never** work on a phone — `localhost` is
the phone itself.

Set it to something the device can actually reach:

| Testing on | Value |
| --- | --- |
| Simulator / emulator on this Mac | `http://localhost:8000` |
| Physical device, same Wi-Fi | `http://<your-lan-ip>:8000` — find it with `ipconfig getifaddr en0` |
| TestFlight / distributed build | A deployed HTTPS URL. A tester's phone cannot reach your laptop. |

The CRM must also allow the origin when using Expo Web (`CORS_ALLOWED_ORIGINS`), and
must be running: `php artisan serve --host=0.0.0.0 --port=8000` — note `0.0.0.0`, not
the default, or it will refuse connections from anything but this machine.

---

## Prerequisite: JDK 17 (Android only)

**This blocks the Android build on a fresh machine, and the error does not say so.**

React Native and Expo both pin `jvmToolchain(17)`
(`node_modules/@react-native/gradle-plugin/**`, `expo-modules-core/android/ExpoModulesCorePlugin.gradle`).
Gradle toolchains match on **exact major version** — JDK 21 or 22 will not substitute.

With no JDK 17 present, Gradle tries to download one through the Foojay resolver, and
that plugin is Gradle-8-era while this project uses Gradle 9. The failure surfaces as:

```
Class org.gradle.jvm.toolchain.JvmVendorSpec does not have member field
'org.gradle.jvm.toolchain.JvmVendorSpec IBM_SEMERU'
```

which points at neither Java nor the toolchain. Install JDK 17 and it disappears:

```bash
brew install --cask temurin@17     # asks for your password
/usr/libexec/java_home -V          # confirm 17 is listed
```

Do **not** fix this by changing the Gradle version or editing files in `node_modules`.
The project config is correct; the machine was missing a JDK.

---

## Android APK

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export EXPO_PUBLIC_CRM_API_URL=http://192.168.x.x:8000   # reachable from the phone

cd android
./gradlew assembleDebug          # debug build, self-signed, installs on any device
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

Install it:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

or send the file to the phone and open it (Android will ask permission to install from
an unknown source).

**Debug vs release.** A debug APK is the right thing for internal testing: it installs
anywhere and needs no keystore. A release APK (`assembleRelease`) needs a signing
keystore you must generate and keep — losing it means you can never update an app
already installed from it. Only worth setting up for Play Store distribution.

---

## iOS IPA

Requires Xcode, and an Apple Developer account with a Distribution certificate. This
machine already has one: `Apple Distribution: BIM ADVANCED TECHNOLOGY SERVICES COMPANY
LIMITED (P6HM822KD4)`, matching `expo.ios.appleTeamId` in `app.json`.

```bash
export EXPO_PUBLIC_CRM_API_URL=https://crm.example.com   # or your LAN IP for local testing

cd ios
pod install

xcodebuild -workspace BIMVisitplan.xcworkspace \
  -scheme BIMVisitplan \
  -configuration Release \
  -archivePath build/BIMVisitplan.xcarchive \
  archive

xcodebuild -exportArchive \
  -archivePath build/BIMVisitplan.xcarchive \
  -exportOptionsPlist ExportOptions-AppStore.plist \
  -exportPath build/ipa
```

Output: `ios/build/ipa/BIMVisitplan.ipa`

`ExportOptions-AppStore.plist` already exists and targets App Store distribution. For an
IPA testers can install directly, change its `method` to `ad-hoc` and register their
device UDIDs in the Apple Developer portal first — ad-hoc builds only run on registered
devices.

**iPhone only.** `supportsTablet` is `false` and `TARGETED_DEVICE_FAMILY` is `"1"`. There
is no watch target.

---

## EAS Build (the alternative)

`eas.json` is configured and `eas-cli` is a dependency, so builds can run on Expo's
infrastructure instead of this machine — no local JDK, Xcode or certificate management,
and it produces both platforms.

```bash
npx eas-cli login
npx eas-cli build --platform android --profile production
npx eas-cli build --platform ios --profile production
```

Requires an Expo account. Worth it once more than one person builds releases; local
builds are fine while it is one machine.

---

## Known issue: `npm install` fails

`postinstall` runs `scripts/patch-rn-ios-toolchain.mjs`, which expects a CMake block in
`node_modules/react-native/sdks/hermes-engine/utils/build-hermes-xcode.sh` that the
installed React Native no longer has. It exits non-zero and fails the install.

Pre-existing, from commit `6e57b99`. Workaround: `npm install --ignore-scripts`, then
run any needed patch manually. Worth fixing properly — it blocks every dependency
change.

---

## Checklist before handing a build to testers

- [ ] `EXPO_PUBLIC_CRM_API_URL` points somewhere the tester's device can reach
- [ ] The CRM is running and reachable from that device
- [ ] `ENTRA_ALLOWED_EMAIL_DOMAINS` is set on the CRM, or every sign-in is refused
- [ ] `AUTH_BYPASS_ENABLED=false` on any non-local backend
- [ ] Tested on a real device, not only the simulator — check-in, camera and Keychain
      storage all behave differently there
