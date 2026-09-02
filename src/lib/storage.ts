import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@ujianpintar_';

export const storage = {
  async saveItem<T>(key: string, value: T): Promise<void> {
    try {
      const json = JSON.stringify(value);
      await AsyncStorage.setItem(`${PREFIX}${key}`, json);
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  },

  async setItem<T>(key: string, value: T): Promise<void> {
    return this.saveItem(key, value);
  },

  async getItem<T>(key: string, defaultValue?: T): Promise<T | null> {
    try {
      const json = await AsyncStorage.getItem(`${PREFIX}${key}`);
      return json ? JSON.parse(json) : (defaultValue !== undefined ? defaultValue : null);
    } catch (e) {
      console.warn('Storage read error:', e);
      return defaultValue !== undefined ? defaultValue : null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${PREFIX}${key}`);
    } catch (e) {
      console.warn('Storage remove error:', e);
    }
  },

  async clearAllExamData(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const examKeys = keys.filter((k) => k.startsWith(PREFIX));
      await AsyncStorage.multiRemove(examKeys);
    } catch (e) {
      console.warn('Storage clear error:', e);
    }
  },
};
