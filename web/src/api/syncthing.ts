import { api, syncthingURL } from './client';
import type {
  STConfig,
  STDiskEvent,
  STFileInfo,
  STFolderStatus,
  STNeed,
  STSystemStatus,
  STSystemVersion,
} from '../lib/types';

export function getConfig(): Promise<STConfig> {
  return api<STConfig>(syncthingURL('/system/config'));
}

export function folderStatus(folder: string): Promise<STFolderStatus> {
  return api<STFolderStatus>(syncthingURL('/db/status', { folder }));
}

export function systemStatus(): Promise<STSystemStatus> {
  return api<STSystemStatus>(syncthingURL('/system/status'));
}

export function systemVersion(): Promise<STSystemVersion> {
  return api<STSystemVersion>(syncthingURL('/system/version'));
}

export function diskEvents(
  opts: { since?: number; limit?: number; timeout?: number } = {},
): Promise<STDiskEvent[]> {
  return api<STDiskEvent[]>(syncthingURL('/events/disk', opts));
}

// /db/browse?folder=&prefix=&levels=1 — the response shape varies across
// Syncthing versions. Modern versions return an array of FileInfo objects;
// older versions returned a recursive object map. useBrowse normalizes both.
export type STBrowseRaw = unknown;

export function browse(folder: string, prefix: string, levels = 1): Promise<STBrowseRaw> {
  return api<STBrowseRaw>(
    syncthingURL('/db/browse', { folder, prefix, levels }),
  );
}

export function fileInfo(folder: string, file: string): Promise<STFileInfo> {
  return api<STFileInfo>(syncthingURL('/db/file', { folder, file }));
}

export function localNeed(folder: string, page = 1, perpage = 100): Promise<STNeed> {
  return api<STNeed>(syncthingURL('/db/need', { folder, page, perpage }));
}

export function remoteNeed(folder: string, device: string, page = 1, perpage = 100): Promise<STNeed> {
  return api<STNeed>(
    syncthingURL('/db/remoteneed', { folder, device, page, perpage }),
  );
}
