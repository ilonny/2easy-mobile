#!/bin/bash
set -euo pipefail
export JAVA_HOME="$HOME/Library/Java/JavaVirtualMachines/jbr-17.0.14/Contents/Home"
export PATH="$JAVA_HOME/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"
unset JAVA_TOOL_OPTIONS JDK_JAVA_OPTIONS
mkdir -p "$HOME/.gradle"
cat > "$HOME/.gradle/gradle.properties" << PROP
org.gradle.java.home=$HOME/Library/Java/JavaVirtualMachines/jbr-17.0.14/Contents/Home
PROP
# Stop all gradle daemons
pkill -f 'GradleDaemon' || true
"$HOME/.gradle/wrapper/dists/gradle-9.3.1-bin"/23ovyewtku6u96viwx3xl3oks/gradle-9.3.1/bin/gradle --stop || true
cd "$(dirname "$0")/../android"
# Use local gradle binary
GRADLE="$HOME/.gradle/wrapper/dists/gradle-9.3.1-bin/23ovyewtku6u96viwx3xl3oks/gradle-9.3.1/bin/gradle"
"$GRADLE" -p "$PWD" -Dorg.gradle.java.home="$JAVA_HOME" ":react-native-worklets:configureCMakeDebug[arm64-v8a]"
echo OK
PREF=$(find ../node_modules/react-native-worklets/android/build/intermediates/cxx -name prefab_command 2>/dev/null | head -1)
echo "prefab: $(head -1 "$PREF")"
echo "stderr:"; cat "$(dirname "$PREF")/prefab_stderr.txt"
