import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';

import { db } from '@/firebase';

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
 * returned so the side drawer can show an "Android клиент" button.
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
      try {
        const snapshot = await getDoc(doc(db, 'appConfig', 'android'));
        if (!snapshot.exists()) {
          if (!cancelled) {
            setState({ url: null, available: false, loading: false });
          }
          return;
        }

        const data = snapshot.data() as { downloadUrl?: unknown };
        const candidate = typeof data.downloadUrl === 'string' ? data.downloadUrl.trim() : '';
        const available = candidate.length > 0 && isValidHttpsUrl(candidate);

        if (!cancelled) {
          setState({
            url: available ? candidate : null,
            available,
            loading: false,
          });
        }
      } catch {
        if (!cancelled) {
          setState({ url: null, available: false, loading: false });
        }
      }
    };

    checkAndroidBuild();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
