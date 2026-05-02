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

export interface STFileBlock {
  hash: string;
  offset: number;
  size: number;
}

// Syncthing serializes `type` as a protobuf enum integer in some versions
// and the string name (e.g. "FILE_INFO_TYPE_FILE") in others. The version
// vector likewise has shifted between a bare array and a `{counters:[...]}`
// wrapper. Both are passed through as `unknown` and normalized at the call
// site rather than re-modeled here.
export interface STFileEntry {
  name: string;
  size: number;
  modified: string;
  modifiedBy: string;
  type: number | string;
  version?: unknown;
  numBlocks?: number;
  blocks?: STFileBlock[];
}

export interface STFileInfo {
  global?: STFileEntry;
  local?: STFileEntry;
  availability?: { id: string; fromTemporary: boolean }[];
}

export interface STNeedFile {
  name: string;
  size: number;
  modified: string;
  type: number;
}

export interface STNeed {
  // Syncthing returns these as null (or omits them) when empty.
  progress?: STNeedFile[] | null;
  queued?: STNeedFile[] | null;
  rest?: STNeedFile[] | null;
  total?: number;
}

export interface STEvent {
  id: number;
  globalID: number;
  time: string;
  type: string;
  data: Record<string, unknown>;
}
