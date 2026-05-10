import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const glogScriptPath = path.join(
  repoRoot,
  'node_modules',
  'react-native',
  'scripts',
  'ios-configure-glog.sh'
);

const hermesDummyScriptPath = path.join(
  repoRoot,
  'node_modules',
  'react-native',
  'sdks',
  'hermes-engine',
  'utils',
  'create-dummy-hermes-xcframework.sh'
);

const hermesBuildScriptPath = path.join(
  repoRoot,
  'node_modules',
  'react-native',
  'sdks',
  'hermes-engine',
  'utils',
  'build-hermes-xcode.sh'
);

function replaceRequired(fileText, from, to, label) {
  if (!fileText.includes(from)) {
    console.error(`Expected ${label} block not found`);
    process.exit(1);
  }

  return fileText.replace(from, to);
}

if (fs.existsSync(glogScriptPath)) {
  const originalBlock = `XCRUN="$(which xcrun || true)"
if [ -n "$XCRUN" ]; then
  export CC="$(xcrun -find -sdk $PLATFORM_NAME cc) -arch $CURRENT_ARCH -isysroot $(xcrun -sdk $PLATFORM_NAME --show-sdk-path)"
  export CXX="$CC"
else
  export CC="$CC:-$(which gcc)"
  export CXX="$CXX:-$(which g++ || true)"
fi
export CXX="$CXX:-$CC"`;

  const patchedBlock = [
    'XCODE_DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"',
    'XCODE_TOOLCHAIN_BIN="$XCODE_DEVELOPER_DIR/Toolchains/XcodeDefault.xctoolchain/usr/bin"',
    '',
    'case "$PLATFORM_NAME" in',
    '  *simulator*)',
    '    SDK_PLATFORM="iPhoneSimulator"',
    '    ;;',
    '  *)',
    '    SDK_PLATFORM="iPhoneOS"',
    '    ;;',
    'esac',
    '',
    'SDK_PATH="${SDKROOT:-$XCODE_DEVELOPER_DIR/Platforms/$SDK_PLATFORM.platform/Developer/SDKs/$SDK_PLATFORM.sdk}"',
    'CLANG_BIN="${CC:-$XCODE_TOOLCHAIN_BIN/clang}"',
    '',
    'XCRUN="$(which xcrun || true)"',
    'if [ -n "$XCRUN" ] && XCRUN_CC="$(xcrun -find -sdk $PLATFORM_NAME cc 2>/dev/null)" && XCRUN_SDK="$(xcrun -sdk $PLATFORM_NAME --show-sdk-path 2>/dev/null)"; then',
    '  CLANG_BIN="$XCRUN_CC"',
    '  SDK_PATH="$XCRUN_SDK"',
    'fi',
    '',
    'if [ -n "$CLANG_BIN" ] && [ -n "$SDK_PATH" ]; then',
    '  export CC="$CLANG_BIN -arch $CURRENT_ARCH -isysroot $SDK_PATH"',
    '  export CXX="$CC"',
    'else',
    '  export CC="$CC:-$(which gcc)"',
    '  export CXX="$CXX:-$(which g++ || true)"',
    'fi',
    'export CXX="$CXX:-$CC"',
  ].join('\n');

  const fileText = fs.readFileSync(glogScriptPath, 'utf8');
  if (!fileText.includes('XCODE_DEVELOPER_DIR=')) {
    fs.writeFileSync(
      glogScriptPath,
      replaceRequired(fileText, originalBlock, patchedBlock, `${glogScriptPath} glog toolchain`)
    );
  }
}

if (fs.existsSync(hermesDummyScriptPath)) {
  const hermesOriginal = [
    "echo '' > dummy.c",
    '',
    'platforms=( "macosx" "ios" "xros" ) # Add other platforms here if needed',
    '',
    'for platform in "${platforms[@]}"',
    'do',
    '    mkdir -p "${platform}/hermesvm.framework"',
    '    clang dummy.c -dynamiclib -o "${platform}/hermesvm.framework/hermesvm"',
    'done',
  ].join('\n');

  const hermesPatched = [
    "echo '' > dummy.c",
    '',
    'XCODE_DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"',
    'XCODE_TOOLCHAIN_BIN="$XCODE_DEVELOPER_DIR/Toolchains/XcodeDefault.xctoolchain/usr/bin"',
    'CLANG_BIN="${CC:-$XCODE_TOOLCHAIN_BIN/clang}"',
    '',
    'platforms=( "macosx" "ios" "xros" ) # Add other platforms here if needed',
    '',
    'for platform in "${platforms[@]}"',
    'do',
    '    mkdir -p "${platform}/hermesvm.framework"',
    '',
    '    case "$platform" in',
    '        macosx)',
    '            sdk_name="MacOSX"',
    '            ;;',
    '        ios)',
    '            sdk_name="iPhoneOS"',
    '            ;;',
    '        xros)',
    '            sdk_name="XROS"',
    '            ;;',
    '        *)',
    '            echo "Unsupported dummy Hermes platform: $platform" >&2',
    '            exit 1',
    '            ;;',
    '    esac',
    '',
    '    sdk_path="$XCODE_DEVELOPER_DIR/Platforms/${sdk_name}.platform/Developer/SDKs/${sdk_name}.sdk"',
    '    "$CLANG_BIN" dummy.c -isysroot "$sdk_path" -dynamiclib -o "${platform}/hermesvm.framework/hermesvm"',
    'done',
  ].join('\n');

  const hermesText = fs.readFileSync(hermesDummyScriptPath, 'utf8');
  if (!hermesText.includes('sdk_name="MacOSX"')) {
    fs.writeFileSync(
      hermesDummyScriptPath,
      replaceRequired(hermesText, hermesOriginal, hermesPatched, `${hermesDummyScriptPath} dummy framework`)
    );
  }
}

if (fs.existsSync(hermesBuildScriptPath)) {
  let hermesBuildText = fs.readFileSync(hermesBuildScriptPath, 'utf8');

  if (!hermesBuildText.includes('function get_sdk_root')) {
    const originalBuildBlock = [
      'function get_deployment_target {',
      '    if [[ $1 == "macosx" ]]; then',
      '      echo "${MACOSX_DEPLOYMENT_TARGET}"',
      '      return',
      '    elif [[ $1 == "xrsimulator" || $1 == "xros" ]]; then',
      '      echo "${XROS_DEPLOYMENT_TARGET}"',
      '      return',
      '    fi',
      '',
      '    echo "${IPHONEOS_DEPLOYMENT_TARGET}"',
      '}',
    ].join('\n');

    const patchedBuildBlock = [
      originalBuildBlock,
      '',
      'function get_sdk_root {',
      '    local developer_dir="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"',
      '',
      '    case "$1" in',
      '      macosx|catalyst)',
      '        echo "${developer_dir}/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk"',
      '        ;;',
      '      iphonesimulator)',
      '        echo "${developer_dir}/Platforms/iPhoneSimulator.platform/Developer/SDKs/iPhoneSimulator.sdk"',
      '        ;;',
      '      xros)',
      '        echo "${developer_dir}/Platforms/XROS.platform/Developer/SDKs/XROS.sdk"',
      '        ;;',
      '      xrsimulator)',
      '        echo "${developer_dir}/Platforms/XRSimulator.platform/Developer/SDKs/XRSimulator.sdk"',
      '        ;;',
      '      appletvos)',
      '        echo "${developer_dir}/Platforms/AppleTVOS.platform/Developer/SDKs/AppleTVOS.sdk"',
      '        ;;',
      '      appletvsimulator)',
      '        echo "${developer_dir}/Platforms/AppleTVSimulator.platform/Developer/SDKs/AppleTVSimulator.sdk"',
      '        ;;',
      '      *)',
      '        echo "${developer_dir}/Platforms/iPhoneOS.platform/Developer/SDKs/iPhoneOS.sdk"',
      '        ;;',
      '    esac',
      '}',
    ].join('\n');

    hermesBuildText = replaceRequired(
      hermesBuildText,
      originalBuildBlock,
      patchedBuildBlock,
      `${hermesBuildScriptPath} SDK root`
    );
  }

  if (!hermesBuildText.includes('function get_cmake_system_name')) {
    const sdkFunctionEnd = [
      '      *)',
      '        echo "${developer_dir}/Platforms/iPhoneOS.platform/Developer/SDKs/iPhoneOS.sdk"',
      '        ;;',
      '    esac',
      '}',
    ].join('\n');

    const systemNameFunction = [
      sdkFunctionEnd,
      '',
      'function get_cmake_system_name {',
      '    case "$1" in',
      '      macosx)',
      '        echo "Darwin"',
      '        ;;',
      '      appletvos|appletvsimulator)',
      '        echo "tvOS"',
      '        ;;',
      '      xros|xrsimulator)',
      '        echo "visionOS"',
      '        ;;',
      '      *)',
      '        echo "iOS"',
      '        ;;',
      '    esac',
      '}',
    ].join('\n');

    hermesBuildText = replaceRequired(
      hermesBuildText,
      sdkFunctionEnd,
      systemNameFunction,
      `${hermesBuildScriptPath} CMake system name function`
    );
  }

  if (!hermesBuildText.includes('cmake_system_name=$(get_cmake_system_name $PLATFORM_NAME)')) {
    hermesBuildText = replaceRequired(
      hermesBuildText,
      'deployment_target=$(get_deployment_target $PLATFORM_NAME)\nsdk_root=$(get_sdk_root $PLATFORM_NAME)',
      'deployment_target=$(get_deployment_target $PLATFORM_NAME)\nsdk_root=$(get_sdk_root $PLATFORM_NAME)\ncmake_system_name=$(get_cmake_system_name $PLATFORM_NAME)',
      `${hermesBuildScriptPath} CMake system name variable`
    );
  }

  if (!hermesBuildText.includes('-DCMAKE_SYSTEM_NAME:STRING="$cmake_system_name"')) {
    hermesBuildText = replaceRequired(
      hermesBuildText,
      '-DCMAKE_OSX_DEPLOYMENT_TARGET:STRING="$deployment_target" \\\n  -DCMAKE_OSX_SYSROOT:PATH="$sdk_root" \\',
      '-DCMAKE_OSX_DEPLOYMENT_TARGET:STRING="$deployment_target" \\\n  -DCMAKE_SYSTEM_NAME:STRING="$cmake_system_name" \\\n  -DCMAKE_OSX_SYSROOT:PATH="$sdk_root" \\',
      `${hermesBuildScriptPath} CMake system name flag`
    );
  }

  fs.writeFileSync(hermesBuildScriptPath, hermesBuildText);
}
