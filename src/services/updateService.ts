import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

export interface AppVersionConfig {
  version: string;
  versionCode: number;
  buildDate: string;
}

/**
 * Konfigurasi Versi Aplikasi Saat Ini
 * Naikkan angka versionCode setiap kali merilis APK baru
 */
export const CURRENT_APP_VERSION: AppVersionConfig = {
  version: '1.0.1',
  versionCode: 2,
  buildDate: '2026-09-27',
};

export interface AppUpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  latestVersionCode: number;
  title: string;
  releaseNotes: string[];
  apkUrl: string;
  isForceUpdate: boolean;
}

export interface CheckUpdateResult {
  updateInfo: AppUpdateInfo | null;
  isUpToDate: boolean;
  error?: string;
}

// Endpoint JSON statis di VPS / Storage
const VPS_VERSION_URL = 'https://ujianpintar.online/version.json';
const TIMEOUT_MS = 5000;

/**
 * Memeriksa apakah ada versi APK terbaru.
 * Mendukung 2 metode:
 * 1. Supabase database (tabel `app_versions`)
 * 2. File statis JSON di VPS (`version.json`)
 */
export async function checkAppUpdate(): Promise<CheckUpdateResult> {
  // Hanya platform Android yang mengecek update APK mandiri
  if (Platform.OS !== 'android') {
    return { updateInfo: null, isUpToDate: true };
  }

  // 1. Cek Pertama: Supabase Database (tabel `app_versions`)
  try {
    const { data, error } = await supabase
      .from('app_versions')
      .select('*')
      .eq('platform', 'android')
      .eq('is_active', true)
      .order('version_code', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data && typeof data.version_code === 'number') {
      const serverCode = Number(data.version_code);
      const minSupported = Number(data.min_version_code || 0);
      const hasUpdate = serverCode > CURRENT_APP_VERSION.versionCode;

      if (hasUpdate) {
        let notes: string[] = [];
        if (Array.isArray(data.release_notes)) {
          notes = data.release_notes.map((n: any) => String(n));
        } else if (typeof data.release_notes === 'string') {
          notes = data.release_notes.split('\n').map((s: string) => s.trim()).filter(Boolean);
        }

        return {
          isUpToDate: false,
          updateInfo: {
            hasUpdate: true,
            currentVersion: CURRENT_APP_VERSION.version,
            latestVersion: data.version_name || `v${serverCode}`,
            latestVersionCode: serverCode,
            title: data.title || 'Pembaruan Tersedia!',
            releaseNotes: notes.length > 0 ? notes : ['Peningkatan performa dan kestabilan sistem.'],
            apkUrl: data.apk_url || 'https://ujianpintar.online',
            isForceUpdate: Boolean(data.is_force || CURRENT_APP_VERSION.versionCode < minSupported),
          },
        };
      } else {
        return { isUpToDate: true, updateInfo: null };
      }
    }
  } catch (_supabaseErr) {
    // Lanjut ke fallback jika tabel Supabase belum ada / error
  }

  // 2. Cek Kedua (Fallback): File version.json di Storage VPS
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(VPS_VERSION_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const serverCode = Number(data.latestVersionCode ?? data.versionCode ?? 0);
      const minSupported = Number(data.minSupportedVersionCode ?? data.minVersionCode ?? 0);
      const hasUpdate = serverCode > CURRENT_APP_VERSION.versionCode;

      if (hasUpdate) {
        let notes: string[] = [];
        if (Array.isArray(data.releaseNotes)) {
          notes = data.releaseNotes.map((n: any) => String(n));
        } else if (typeof data.releaseNotes === 'string') {
          notes = data.releaseNotes.split('\n').map((s: string) => s.trim()).filter(Boolean);
        }

        return {
          isUpToDate: false,
          updateInfo: {
            hasUpdate: true,
            currentVersion: CURRENT_APP_VERSION.version,
            latestVersion: data.latestVersion || data.version || `v${serverCode}`,
            latestVersionCode: serverCode,
            title: data.title || 'Pembaruan Tersedia!',
            releaseNotes: notes.length > 0 ? notes : ['Peningkatan performa dan kestabilan sistem.'],
            apkUrl: data.apkUrl || data.downloadUrl || 'https://ujianpintar.online',
            isForceUpdate: Boolean(data.forceUpdate || data.isForceUpdate || CURRENT_APP_VERSION.versionCode < minSupported),
          },
        };
      } else {
        return { isUpToDate: true, updateInfo: null };
      }
    }
  } catch (fetchErr: any) {
    return {
      isUpToDate: false,
      updateInfo: null,
      error: fetchErr?.name === 'AbortError'
        ? 'Batas waktu koneksi habis (Timeout)'
        : (fetchErr?.message || 'Tidak dapat terhubung ke server pembaruan'),
    };
  }

  return { isUpToDate: true, updateInfo: null };
}
