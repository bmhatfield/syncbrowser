// Narrow Syncthing JSON types — only the fields we actually read.
// Reference: https://docs.syncthing.net/dev/rest.html

export interface STDevice {
  deviceID: string;
  name: string;
  addresses?: string[];
  paused?: boolean;
  untrusted?: boolean;
  compression?: string;
  introducer?: boolean;
  autoAcceptFolders?: boolean;
  maxSendKbps?: number;
  maxRecvKbps?: number;
}

export interface STFolderDevice {
  deviceID: string;
  encryptionPassword?: string;
}

export interface STVersioning {
  type: string;
  // Other versioning fields (params, cleanupIntervalS, ...) exist but
  // we only display `type`.
}

export interface STMinDiskFree {
  value: number;
  unit: string;
}

export interface STFolder {
  id: string;
  label: string;
  path: string;
  type: string;
  paused?: boolean;
  devices: STFolderDevice[];
  versioning?: STVersioning;
  fsWatcherEnabled?: boolean;
  rescanIntervalS?: number;
  minDiskFree?: STMinDiskFree;
  ignorePerms?: boolean;
  ignoreDelete?: boolean;
  disableFsync?: boolean;
}

export interface STConfig {
  folders: STFolder[];
  devices: STDevice[];
}

// /rest/db/status?folder=<id> — narrow to the fields the UI reads.
export interface STFolderStatus {
  state: string;
  error: string;
  errors: number;
  pullErrors: number;
  watchError?: string;
  globalFiles: number;
  globalBytes: number;
  needTotalItems: number;
  needBytes: number;
  inSyncBytes: number;
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
  blocksHash?: string;
  sequence?: number;
  deleted?: boolean;
  ignored?: boolean;
  invalid?: boolean;
  mustRescan?: boolean;
  noPermissions?: boolean;
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
