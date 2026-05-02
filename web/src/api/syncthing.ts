import { api, syncthingURL } from './client';
import type { STConfig, STFileInfo, STNeed } from '../lib/types';

export function getConfig(): Promise<STConfig> {
  return api<STConfig>(syncthingURL('/system/config'));
}

// /db/browse?folder=&prefix=&levels=1 returns an object whose keys are entry
// names; values are either nested objects (directories) or arrays of two ints
// like [size, modifiedNanos] for files.
export type STBrowseRaw = Record<string, unknown>;

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
