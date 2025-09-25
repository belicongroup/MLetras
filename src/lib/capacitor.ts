// Capacitor utilities with safe fallbacks for web/development

/**
 * Safely import and use Capacitor plugins
 * Returns null if plugin is not available (web/development mode)
 */
export async function safeImportCapacitorPlugin<T>(pluginName: string): Promise<T | null> {
  try {
    const module = await import(`@capacitor/${pluginName}`);
    return module[Object.keys(module)[0]] || null;
  } catch (error) {
    console.warn(`Capacitor plugin ${pluginName} not available (running in web/development mode)`);
    return null;
  }
}

/**
 * Check if running in Capacitor environment
 */
export function isCapacitorEnvironment(): boolean {
  return typeof (window as any).Capacitor !== 'undefined';
}

/**
 * Get the current platform (web, android, ios)
 */
export function getPlatform(): 'web' | 'android' | 'ios' {
  if (typeof (window as any).Capacitor !== 'undefined') {
    return (window as any).Capacitor.getPlatform() || 'web';
  }
  return 'web';
}

/**
 * Safe ScreenOrientation usage
 */
export async function lockScreenOrientation(orientation: 'portrait' | 'landscape' | 'any') {
  const ScreenOrientation = await safeImportCapacitorPlugin('screen-orientation');
  if (ScreenOrientation && isCapacitorEnvironment()) {
    try {
      await ScreenOrientation.lock({ orientation });
    } catch (error) {
      console.warn('Failed to lock screen orientation:', error);
    }
  }
}

/**
 * Safe ScreenOrientation unlock
 */
export async function unlockScreenOrientation() {
  const ScreenOrientation = await safeImportCapacitorPlugin('screen-orientation');
  if (ScreenOrientation && isCapacitorEnvironment()) {
    try {
      await ScreenOrientation.unlock();
    } catch (error) {
      console.warn('Failed to unlock screen orientation:', error);
    }
  }
}
