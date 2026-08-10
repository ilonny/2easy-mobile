import AsyncStorage from '@react-native-async-storage/async-storage';

/** In-memory fallback when the native module is missing (e.g. before a rebuild). */
const memory = new Map<string, string>();

function isNativeStorageUnavailable(error: unknown): boolean {
  const message = String(error ?? '');
  return (
    message.includes('Native module is null') ||
    message.includes('AsyncStorageError')
  );
}

export async function readStorage(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch (error) {
    if (__DEV__ && isNativeStorageUnavailable(error)) {
      console.warn(
        '[storage] AsyncStorage native module unavailable; using memory fallback. Rebuild the app after installing native deps.',
      );
    }
    return memory.get(key) ?? null;
  }
}

export async function writeStorage(key: string, value: string): Promise<void> {
  memory.set(key, value);
  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    if (__DEV__ && isNativeStorageUnavailable(error)) {
      console.warn(
        '[storage] AsyncStorage write failed; kept value in memory only.',
      );
      return;
    }
    throw error;
  }
}

export async function removeStorage(key: string): Promise<void> {
  memory.delete(key);
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    if (__DEV__ && isNativeStorageUnavailable(error)) {
      return;
    }
    throw error;
  }
}

export async function clearAuthStorage(
  keys: readonly string[],
): Promise<void> {
  await Promise.all(keys.map(key => removeStorage(key)));
}
