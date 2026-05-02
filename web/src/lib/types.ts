// Narrow Syncthing JSON types — only the fields we actually read.
// Reference: https://docs.syncthing.net/dev/rest.html

export interface STDevice {
  deviceID: string;
  name: string;
  addresses?: string[];
  paused?: boolean;
}

export interface STFolderDevice {
  deviceID: string;
}

export interface STFolder {
  id: string;
  label: string;
  path: string;
  type: string;
  paused?: boolean;
  devices: STFolderDevice[];
}

export interface STConfig {
  folders: STFolder[];
  devices: STDevice[];
}

// /rest/db/browse returns either a recursive map (object → object | name[])
// or a flat list of names depending on `levels`. We use levels=1 and treat
// the response as a record keyed by entry name.
export type STBrowseEntry =
  | { kind: 'dir'; name: string }
  | { kind: 'file'; name: string };

export interface STFileVersion {
  id: number;
  value: number;
}

export interface STFileBlock {
  hash: string;
  offset: number;
  size: number;
}

export interface STFileInfo {
  global?: {
    name: string;
    size: number;
    modified: string;
    modifiedBy: string;
    type: number;
    version: STFileVersion[];
    numBlocks?: number;
    blocks?: STFileBlock[];
  };
  local?: STFileInfo['global'];
  availability?: { id: string; fromTemporary: boolean }[];
}

export interface STNeedFile {
  name: string;
  size: number;
  modified: string;
  type: number;
}

export interface STNeed {
  progress: STNeedFile[];
  queued: STNeedFile[];
  rest: STNeedFile[];
  total?: number;
}

export interface STEvent {
  id: number;
  globalID: number;
  time: string;
  type: string;
  data: Record<string, unknown>;
}
