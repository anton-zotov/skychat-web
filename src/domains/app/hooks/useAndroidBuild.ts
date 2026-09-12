import { ANDROID_APP_DOWNLOAD_URL } from '@shared/constants';
import { useClientBuild, type ClientBuildState } from './useClientBuild';

/**
 * On page open, reads the `appConfig/android` Firestore document the same way
 * the Android client does. When it contains a valid `downloadUrl`, that URL is
 * returned so the side drawer can show an "Android клиент" button; otherwise
 * the stable published-build URL (ANDROID_APP_DOWNLOAD_URL) is used. The
 * document's `version` field is returned for display next to the link.
 */
export function useAndroidBuild(): ClientBuildState {
  return useClientBuild('android', ANDROID_APP_DOWNLOAD_URL);
}
