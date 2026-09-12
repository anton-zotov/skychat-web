import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';

import { db } from '@/firebase';

export type ClientBuildState = {
  url: string | null;
  version: string | null;
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
 * On page open, reads the `appConfig/{docId}` Firestore document the same way
 * the native clients do. When it contains a valid `downloadUrl`, that URL is
 * used for the side-drawer download link; otherwise the stable published-build
 * URL (`fallbackUrl`) is used. The document's `version` field is returned for
 * display next to the link.
 */
export function useClientBuild(docId: 'android' | 'windows', fallbackUrl: string): ClientBuildState {
  const [state, setState] = useState<ClientBuildState>({
    url: null,
    version: null,
    available: false,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    const checkClientBuild = async () => {
      let url: string | null = null;
      let version: string | null = null;
      try {
        const snapshot = await getDoc(doc(db, 'appConfig', docId));
        if (snapshot.exists()) {
          const data = snapshot.data() as { downloadUrl?: unknown; version?: unknown };
          const candidate = typeof data.downloadUrl === 'string' ? data.downloadUrl.trim() : '';
          if (candidate.length > 0 && isValidHttpsUrl(candidate)) {
            url = candidate;
          }
          if (typeof data.version === 'string' && data.version.trim().length > 0) {
            version = data.version.trim();
          }
        }
      } catch {
        // Firestore read failed; fall back to the published build URL below.
      }

      if (!cancelled) {
        setState({ url: url ?? fallbackUrl, version, available: true, loading: false });
      }
    };

    checkClientBuild();

    return () => {
      cancelled = true;
    };
  }, [docId, fallbackUrl]);

  return state;
}
