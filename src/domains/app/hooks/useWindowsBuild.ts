import { WINDOWS_APP_DOWNLOAD_URL } from '@shared/constants';
import { useClientBuild, type ClientBuildState } from './useClientBuild';

/**
 * On page open, reads the `appConfig/windows` Firestore document. When it
 * contains a valid `downloadUrl`, that URL is returned so the side drawer can
 * show a "Windows клиент" button; otherwise the stable published-build URL
 * (WINDOWS_APP_DOWNLOAD_URL) is used. The document's `version` field is
 * returned for display next to the link.
 */
export function useWindowsBuild(): ClientBuildState {
  return useClientBuild('windows', WINDOWS_APP_DOWNLOAD_URL);
}
