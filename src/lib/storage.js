/**
 * Storage Service (IndexedDB + localStorage fallback)
 */

import { CONFIG, Logger } from '../constants/config';

// ============================================================================
// StorageService: IndexedDB with localStorage fallback
// ============================================================================

class StorageService {
  constructor() {
    this.db = null;
    this.useLocalStorage = false;
    this.ready = this.init();
  }

  async init() {
    return new Promise((resolve) => {
      if (!window.indexedDB) {
        Logger.warn('IndexedDB not supported, using localStorage fallback');
        this.useLocalStorage = true;
        resolve();
        return;
      }

      const request = indexedDB.open(CONFIG.DB.NAME, CONFIG.DB.VERSION);

      request.onerror = () => {
        Logger.warn('IndexedDB failed, using localStorage fallback');
        this.useLocalStorage = true;
        resolve();
      };

      // iOS Safari에서 DB가 잠겨있을 때 폴백
      request.onblocked = () => {
        Logger.warn('IndexedDB blocked, using localStorage fallback');
        this.useLocalStorage = true;
        resolve();
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;

        // 다른 탭에서 버전 변경 시 안전하게 닫기
        this.db.onversionchange = () => {
          this.db.close();
          Logger.warn('IndexedDB version changed, using localStorage fallback');
          this.useLocalStorage = true;
        };

        Logger.log('IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(CONFIG.DB.STORE)) {
          db.createObjectStore(CONFIG.DB.STORE, { keyPath: 'key' });
        }
      };
    });
  }

  getMode() {
    return this.useLocalStorage ? 'localStorage' : 'IndexedDB';
  }

  async get(key) {
    await this.ready;

    if (this.useLocalStorage) {
      try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      } catch {
        return null;
      }
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(CONFIG.DB.STORE, 'readonly');
        const store = tx.objectStore(CONFIG.DB.STORE);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result?.value || null);
        request.onerror = () => resolve(null);
      } catch {
        // transaction 생성 실패 시 localStorage 폴백
        this.useLocalStorage = true;
        try {
          const data = localStorage.getItem(key);
          resolve(data ? JSON.parse(data) : null);
        } catch {
          resolve(null);
        }
      }
    });
  }

  async set(key, value) {
    await this.ready;

    if (this.useLocalStorage) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(CONFIG.DB.STORE, 'readwrite');
        const store = tx.objectStore(CONFIG.DB.STORE);
        store.put({ key, value });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        // transaction 생성 실패 시 localStorage 폴백
        this.useLocalStorage = true;
        try {
          localStorage.setItem(key, JSON.stringify(value));
          resolve(true);
        } catch {
          resolve(false);
        }
      }
    });
  }

  async delete(key) {
    await this.ready;

    if (this.useLocalStorage) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(CONFIG.DB.STORE, 'readwrite');
        const store = tx.objectStore(CONFIG.DB.STORE);
        store.delete(key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        // transaction 생성 실패 시 localStorage 폴백
        this.useLocalStorage = true;
        try {
          localStorage.removeItem(key);
          resolve(true);
        } catch {
          resolve(false);
        }
      }
    });
  }
}

// Singleton instance
export const storage = new StorageService();
