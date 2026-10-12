#!/bin/bash
# Launch Android Studio with Node on PATH and a note to use Gradle JDK 17.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="/usr/local/bin:/opt/homebrew/bin:$ROOT/android/node-bin:$PATH"
export NODE_BINARY="${NODE_BINARY:-$(command -v node)}"
export JAVA_HOME="${JAVA_HOME:-$HOME/Library/Java/JavaVirtualMachines/jbr-17.0.14/Contents/Home}"
open -a "Android Studio" "$ROOT/android"
