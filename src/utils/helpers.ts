import { ChromeMessage, ExtensionSettings, ScanHistoryItem } from './types';

/**
 * Sends a message to the background service worker
 */
export function sendBackgroundMessage<T = any>(
  type: ChromeMessage['type'],
  payload?: any
): Promise<T> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      resolve(response);
    });
  });
}

/**
 * Helper to get settings from storage directly (useful in popup context)
 */
export function getLocalSettings(): Promise<ExtensionSettings> {
  return new Promise((resolve) => {
    chrome.storage.local.get('settings', (result) => {
      resolve(result.settings);
    });
  });
}

/**
 * Helper to save settings in storage directly
 */
export function setLocalSettings(settings: ExtensionSettings): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ settings }, () => {
      resolve();
    });
  });
}

/**
 * Helper to get history from storage
 */
export function getLocalHistory(): Promise<ScanHistoryItem[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get('history', (result) => {
      resolve(result.history || []);
    });
  });
}
