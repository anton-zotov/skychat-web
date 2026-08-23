import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';

import { db } from '@/firebase';
import { ANDROID_APP_DOWNLOAD_URL } from '@shared/constants';

type AndroidBuildState = {
  url: string | null;
  available: boolean;
  loading: boolean;
};

function isValidHttpsUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

/**
 * On page open, reads the `appConfig/android` Firestore document the same way
 * the Android client does. When it contains a valid `downloadUrl`, that URL is
 * returned so the side drawer can show an "Android клиент" button; otherwise
 * the stable published-build URL (ANDROID_APP_DOWNLOAD_URL) is used.
 */
export function useAndroidBuild(): AndroidBuildState {
  const [state, setState] = useState<AndroidBuildState>({
    url: null,
    available: false,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    const checkAndroidBuild = async () => {
      let url: string | null = null;
      try {
        const snapshot = await getDoc(doc(db, 'appConfig', 'android'));
        if (snapshot.exists()) {
          const data = snapshot.data() as { downloadUrl?: unknown };
          const candidate = typeof data.downloadUrl === 'string' ? data.downloadUrl.trim() : '';
          if (candidate.length > 0 && isValidHttpsUrl(candidate)) {
            url = candidate;
          }
        }
      } catch {
        // Firestore read failed; fall back to the published build URL below.
      }

      if (!cancelled) {
        setState({ url: url ?? ANDROID_APP_DOWNLOAD_URL, available: true, loading: false });
      }
    };

    checkAndroidBuild();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
