#!/bin/bash
# Stop stale daemons and configure CMake with JDK 17 (required for AGP prefab).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export JAVA_HOME="${JAVA_HOME:-$HOME/Library/Java/JavaVirtualMachines/jbr-17.0.14/Contents/Home}"
export PATH="$JAVA_HOME/bin:/usr/local/bin:/opt/homebrew/bin:$ROOT/android/node-bin:$PATH"
unset JAVA_TOOL_OPTIONS
unset JDK_JAVA_OPTIONS
export NODE_BINARY="${NODE_BINARY:-$(command -v node)}"

echo "Using JAVA_HOME=$JAVA_HOME"
"$JAVA_HOME/bin/java" -version

# Prefer local Gradle distribution to avoid wrapper re-download flakes.
GRADLE_BIN=""
for candidate in \
  "$HOME/.gradle/wrapper/dists/gradle-9.3.1-bin"/*/gradle-9.3.1/bin/gradle \
  "$ROOT/android/gradlew"
do
  if [ -x "$candidate" ]; then
    GRADLE_BIN="$candidate"
    break
  fi
done
if [ -z "$GRADLE_BIN" ]; then
  echo "Gradle not found" >&2
  exit 1
fi
echo "Using Gradle: $GRADLE_BIN"

cd "$ROOT/android"
if [[ "$GRADLE_BIN" == *"/gradlew" ]]; then
  RUN=("./gradlew")
else
  RUN=("$GRADLE_BIN" -p "$ROOT/android" -Dorg.gradle.java.home="$JAVA_HOME")
fi

"${RUN[@]}" --stop || true
"${RUN[@]}" \
  ":react-native-worklets:configureCMakeDebug[arm64-v8a]" \
  ":react-native-reanimated:configureCMakeDebug[arm64-v8a]" \
  "$@"

PREFABS=$(ls -1 "$ROOT"/node_modules/react-native-worklets/android/build/intermediates/cxx/*/logs/arm64-v8a/prefab_command 2>/dev/null | head -1 || true)
if [ -n "$PREFABS" ]; then
  echo "=== prefab java used ==="
  head -1 "$PREFABS"
  echo "=== prefab stderr ==="
  cat "${PREFABS%/prefab_command}/prefab_stderr.txt" || true
fi
echo "OK: CMake configure succeeded on JDK 17"
