import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';

import { db } from '@/firebase';
import { WINDOWS_APP_DOWNLOAD_URL } from '@shared/constants';

type WindowsBuildState = {
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
 * On page open, reads the `appConfig/windows` Firestore document. When it
 * contains a valid `downloadUrl`, that URL is returned so the side drawer can
 * show a "Windows клиент" button; otherwise the stable published-build URL
 * (WINDOWS_APP_DOWNLOAD_URL) is used.
 */
export function useWindowsBuild(): WindowsBuildState {
  const [state, setState] = useState<WindowsBuildState>({
    url: null,
    available: false,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    const checkWindowsBuild = async () => {
      let url: string | null = null;
      try {
        const snapshot = await getDoc(doc(db, 'appConfig', 'windows'));
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
        setState({ url: url ?? WINDOWS_APP_DOWNLOAD_URL, available: true, loading: false });
      }
    };

    checkWindowsBuild();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
