// Location: atlas/client/src/lib/engine/journal_watcher_engine.ts
// Stage 11.1: HTML5 File System Access API & Journal Directory Watcher
// Direct in-browser live streaming of Elite Dangerous journal logs and Status.json
// with IndexedDB handle persistence, 250ms polling worker, byte-offset delta reader,
// id64 string preservation, and Multi-Account / Multi-Box VFS directory ingestion (up to 4 clients).

export interface FileSystemPermissionDescriptor {
  mode?: 'read' | 'readwrite';
}

export interface ExtendedDirectoryHandle extends Omit<FileSystemDirectoryHandle, 'entries' | 'values'> {
  queryPermission?: (descriptor?: FileSystemPermissionDescriptor) => Promise<PermissionState>;
  requestPermission?: (descriptor?: FileSystemPermissionDescriptor) => Promise<PermissionState>;
  values?: () => AsyncIterableIterator<FileSystemHandle>;
  entries?: () => AsyncIterableIterator<[string, FileSystemHandle]>;
}

export interface JournalEventRecord {
  id: string;
  slotId: string;
  commanderName: string;
  vfsSubfolder: string;
  timestamp: string;
  event: string;
  systemName?: string;
  systemAddressId64?: string;
  marketId64?: string;
  bodyName?: string;
  shipType?: string;
  shipIdent?: string;
  shipName?: string;
  hullHealth?: number;
  fuelLevel?: number;
  fuelCapacity?: number;
  credits?: number;
  summary: string;
  rawJson: Record<string, unknown>;
}

export interface StatusTelemetrySnapshot {
  timestamp: string;
  flags: number;
  flags2: number;
  pips: [number, number, number];
  fireGroup: number;
  guiFocus: number;
  fuelMain: number;
  fuelReservoir: number;
  cargoTons: number;
  legalState: string;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  heading?: number;
  bodyName?: string;
  planetRadius?: number;
  destinationName?: string;
  destinationSystemId64?: string;
  destinationBodyId?: number;
  oxygen?: number;
  health?: number;
  temperature?: number;
  selectedWeapon?: string;
  gravity?: number;
}

export interface CommanderVfsSlot {
  slotId: string;
  slotIndex: number; // 1..4
  vfsSubfolder: string; // e.g., './' or 'commander_alpha/'
  commanderName: string;
  fid: string;
  activeJournalFileName: string;
  activeJournalSizeBytes: number;
  lastByteOffset: number;
  lastModifiedMs: number;
  statusLastModifiedMs: number;
  linesStreamed: number;
  bytesStreamed: number;
  isClientOnline: boolean;
  gameMode: 'Open' | 'Solo' | 'Group' | 'Offline';
  shipType: string;
  shipName: string;
  shipIdent: string;
  hullPercent: number;
  shieldUp: boolean;
  currentSystem: string;
  systemAddressId64: string;
  starPos: [number, number, number];
  stationName: string;
  Docked: boolean;
  supercruise: boolean;
  onFoot: boolean;
  inSrv: boolean;
  credits: number;
  fuelMain: number;
  fuelCapacity: number;
  cargoTons: number;
  statusSnapshot: StatusTelemetrySnapshot | null;
  recentEvents: JournalEventRecord[];
}

export interface StoredHandleMetadata {
  id: string;
  folderName: string;
  savedAtIso: string;
  detectedVfsFolders: string[];
  handle?: ExtendedDirectoryHandle;
}

const IDB_NAME = 'atlas_journal_handles_db';
const IDB_VERSION = 1;
const IDB_STORE = 'atlas_journal_handles';
const PRIMARY_HANDLE_KEY = 'ed_saved_games_root';
const POLL_INTERVAL_MS = 250;
const MAX_CONCURRENT_CLIENTS = 4;
const MAX_EVENTS_PER_SLOT = 80;

/**
 * Safely preserves 64-bit integer fields (`SystemAddress`, `MarketID`, `SystemId64`, `CarrierID`, etc.)
 * as exact strings before `JSON.parse` can corrupt IEEE-754 numbers > 2^53 - 1.
 */
export function parseJournalJsonLinePreservingId64(rawLine: string): Record<string, unknown> | null {
  const trimmed = rawLine.trim();
  if (!trimmed || !trimmed.startsWith('{')) return null;

  try {
    const safeJson = trimmed.replace(
      /"(SystemAddress|MarketID|CarrierID|SquadronID|BodyID64|Id64|SystemId64|System)"\s*:\s*(-?\d{13,22})(?=\s*[,}])/g,
      '"$1":"$2"'
    );
    const parsed = JSON.parse(safeJson) as Record<string, unknown>;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Byte-offset delta reader using `File.slice(lastOffset, file.size)`.
 * Streams only newly appended complete UTF-8 lines (`\n`) and returns the updated byte offset.
 */
export async function readFileDeltaLines(
  file: File,
  lastByteOffset: number
): Promise<{ lines: string[]; newByteOffset: number; bytesRead: number }> {
  const currentSize = file.size;
  if (currentSize <= lastByteOffset) {
    return {
      lines: [],
      newByteOffset: currentSize < lastByteOffset ? 0 : lastByteOffset,
      bytesRead: 0,
    };
  }

  const blobSlice = file.slice(lastByteOffset, currentSize);
  const buffer = await blobSlice.arrayBuffer();
  const uint8 = new Uint8Array(buffer);

  // Find the last newline byte (0x0A) so we never parse a half-written JSON line
  let lastNewlineIdx = -1;
  for (let i = uint8.length - 1; i >= 0; i--) {
    if (uint8[i] === 0x0a) {
      lastNewlineIdx = i;
      break;
    }
  }

  if (lastNewlineIdx === -1) {
    return { lines: [], newByteOffset: lastByteOffset, bytesRead: 0 };
  }

  const completeSlice = uint8.subarray(0, lastNewlineIdx + 1);
  const decoder = new TextDecoder('utf-8');
  const decodedText = decoder.decode(completeSlice);
  const rawLines = decodedText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const bytesConsumed = lastNewlineIdx + 1;
  return {
    lines: rawLines,
    newByteOffset: lastByteOffset + bytesConsumed,
    bytesRead: bytesConsumed,
  };
}

/**
 * Summarize a raw Elite Dangerous Journal event into a concise Cobra HUD telemetry line.
 */
export function summarizeJournalEvent(evt: Record<string, unknown>): string {
  const eventName = String(evt.event ?? 'Unknown');
  switch (eventName) {
    case 'Fileheader':
      return `Journal initialized (${evt.gameversion ?? 'Odyssey 4.0'} / build ${evt.build ?? 'r302108'})`;
    case 'Commander':
      return `Authenticated CMDR ${evt.Name ?? 'UNKNOWN'} (FID: ${evt.FID ?? 'F000000'})`;
    case 'LoadGame':
      return `Session loaded in ${evt.Ship_Localised ?? evt.Ship ?? 'Ship'} [${evt.ShipIdent ?? 'ID'}] (${evt.GameMode ?? 'Open'})`;
    case 'Location':
      return `Located in ${evt.StarSystem ?? 'Unknown'} [id64: ${evt.SystemAddress ?? 'N/A'}]${evt.Docked ? ` @ ${evt.StationName ?? 'Port'}` : ''}`;
    case 'FSDJump':
      return `Jumped to ${evt.StarSystem ?? 'Unknown'} (${Number(evt.JumpDist ?? 0).toFixed(2)} Ly, Fuel: ${Number(evt.FuelUsed ?? 0).toFixed(2)}t)`;
    case 'StartJump':
      return `Charging FSD (${evt.JumpType ?? 'Hyperspace'})${evt.StarSystem ? ` -> ${evt.StarSystem} (${evt.StarClass ?? ''})` : ''}`;
    case 'SupercruiseEntry':
      return `Entered Supercruise in ${evt.StarSystem ?? 'System'}`;
    case 'SupercruiseExit':
      return `Dropped from Supercruise near ${evt.Body ?? 'Body'} (${evt.BodyType ?? 'Space'})`;
    case 'Docked':
      return `Docked at ${evt.StationName ?? 'Station'} (${evt.StationType ?? 'Starport'}) in ${evt.StarSystem ?? ''}`;
    case 'Undocked':
      return `Undocked from ${evt.StationName ?? 'Station'}`;
    case 'FSSDiscoveryScan':
      return `Honked system ${evt.SystemName ?? ''} (${evt.BodyCount ?? 0} bodies, ${evt.NonBodyCount ?? 0} signals)`;
    case 'Scan':
      return `Detailed scan of ${evt.BodyName ?? 'Body'} (${evt.PlanetClass ?? evt.StarType ?? 'Celestial'})`;
    case 'SAAScanComplete':
      return `DSS surface mapping complete: ${evt.BodyName ?? 'Body'} (${evt.ProbesUsed ?? 0}/${evt.EfficiencyTarget ?? 0} probes)`;
    case 'ScanOrganic':
      return `Exobiology ${evt.ScanType ?? 'Scan'}: ${evt.Species_Localised ?? evt.Genus_Localised ?? 'Organic'} on ${evt.Body ?? 'Body'}`;
    case 'Market':
    case 'Cargo':
    case 'Loadout':
      return `Updated ${eventName} manifest`;
    case 'ReceiveText':
      return `COMMS [${evt.From_Localised ?? evt.From ?? 'Channel'}]: ${evt.Message_Localised ?? evt.Message ?? ''}`;
    default:
      return `${eventName} telemetry packet ingested`;
  }
}

/**
 * Default seed Multi-Box VFS fleet slots (4 concurrent EdEzCheese commander instances)
 * so the HUD matrix can be inspected immediately and tested with synthetic 250ms delta streaming
 * or overwritten seamlessly when a real local folder is authorized.
 */
export function createInitialMultiBoxSlots(): CommanderVfsSlot[] {
  return [
    {
      slotId: 'vfs_slot_1',
      slotIndex: 1,
      vfsSubfolder: 'commander_alpha/',
      commanderName: 'CMDR VANCE ORION',
      fid: 'F1094821',
      activeJournalFileName: 'Journal.2026-10-16T011502.01.log',
      activeJournalSizeBytes: 184320,
      lastByteOffset: 184320,
      lastModifiedMs: Date.now() - 800,
      statusLastModifiedMs: Date.now() - 250,
      linesStreamed: 412,
      bytesStreamed: 184320,
      isClientOnline: true,
      gameMode: 'Open',
      shipType: 'Anaconda',
      shipName: 'INV-ASTRAL SPEAR',
      shipIdent: 'AS-01X',
      hullPercent: 98,
      shieldUp: true,
      currentSystem: 'Shinrarta Dezhra',
      systemAddressId64: '3932277478106',
      starPos: [55.71875, 17.59375, 27.15625],
      stationName: 'Jameson Memorial',
      Docked: false,
      supercruise: true,
      onFoot: false,
      inSrv: false,
      credits: 4829104550,
      fuelMain: 29.4,
      fuelCapacity: 32.0,
      cargoTons: 64,
      statusSnapshot: {
        timestamp: new Date().toISOString(),
        flags: 0x01210118, // InMainShip | HasLatLong | FsdMassLocked | LightsOn | Supercruise | ShieldsUp
        flags2: 0x00001000, // GlideMode
        pips: [4, 6, 2],
        fireGroup: 0,
        guiFocus: 0,
        fuelMain: 29.4,
        fuelReservoir: 0.61,
        cargoTons: 64,
        legalState: 'Clean',
        latitude: 34.8192,
        longitude: -118.4025,
        altitude: 14280,
        heading: 128,
        bodyName: 'Shinrarta Dezhra A 1',
        planetRadius: 6184000,
        gravity: 0.97,
        destinationName: 'Jameson Memorial',
        destinationSystemId64: '3932277478106',
      },
      recentEvents: [
        {
          id: 'seed_1_1',
          slotId: 'vfs_slot_1',
          commanderName: 'CMDR VANCE ORION',
          vfsSubfolder: 'commander_alpha/',
          timestamp: new Date(Date.now() - 15000).toISOString(),
          event: 'FSDJump',
          systemName: 'Shinrarta Dezhra',
          systemAddressId64: '3932277478106',
          shipType: 'Anaconda',
          summary: 'Jumped to Shinrarta Dezhra (64.38 Ly, Fuel: 7.42t)',
          rawJson: {
            timestamp: new Date(Date.now() - 15000).toISOString(),
            event: 'FSDJump',
            StarSystem: 'Shinrarta Dezhra',
            SystemAddress: '3932277478106',
            StarPos: [55.71875, 17.59375, 27.15625],
            JumpDist: 64.38,
            FuelUsed: 7.42,
          },
        },
      ],
    },
    {
      slotId: 'vfs_slot_2',
      slotIndex: 2,
      vfsSubfolder: 'commander_bravo/',
      commanderName: 'CMDR LYRA VALEN',
      fid: 'F2849104',
      activeJournalFileName: 'Journal.2026-10-16T011644.01.log',
      activeJournalSizeBytes: 142680,
      lastByteOffset: 142680,
      lastModifiedMs: Date.now() - 1100,
      statusLastModifiedMs: Date.now() - 250,
      linesStreamed: 319,
      bytesStreamed: 142680,
      isClientOnline: true,
      gameMode: 'Group',
      shipType: 'Type-9 Heavy',
      shipName: 'ATLAS HAULER II',
      shipIdent: 'AH-788',
      hullPercent: 100,
      shieldUp: true,
      currentSystem: 'Eol Prou RS-T d3-94',
      systemAddressId64: '908352033466',
      starPos: [-9530.5, -910.28125, 19808.125],
      stationName: 'Jaques Station',
      Docked: true,
      supercruise: false,
      onFoot: false,
      inSrv: false,
      credits: 1940220100,
      fuelMain: 64.0,
      fuelCapacity: 64.0,
      cargoTons: 784,
      statusSnapshot: {
        timestamp: new Date().toISOString(),
        flags: 0x0100000d, // InMainShip | ShieldsUp | LandingGearDown | Docked
        flags2: 0x00000000,
        pips: [8, 4, 0],
        fireGroup: 1,
        guiFocus: 1,
        fuelMain: 64.0,
        fuelReservoir: 0.72,
        cargoTons: 784,
        legalState: 'Clean',
        bodyName: 'Jaques Station',
        destinationName: 'Colonisation Hub Alpha',
        destinationSystemId64: '908352033466',
      },
      recentEvents: [
        {
          id: 'seed_2_1',
          slotId: 'vfs_slot_2',
          commanderName: 'CMDR LYRA VALEN',
          vfsSubfolder: 'commander_bravo/',
          timestamp: new Date(Date.now() - 22000).toISOString(),
          event: 'Docked',
          systemName: 'Eol Prou RS-T d3-94',
          systemAddressId64: '908352033466',
          marketId64: '3230492672',
          shipType: 'Type-9 Heavy',
          summary: 'Docked at Jaques Station (Orbis Starport) in Eol Prou RS-T d3-94',
          rawJson: {
            timestamp: new Date(Date.now() - 22000).toISOString(),
            event: 'Docked',
            StationName: 'Jaques Station',
            StationType: 'Orbis',
            StarSystem: 'Eol Prou RS-T d3-94',
            SystemAddress: '908352033466',
            MarketID: '3230492672',
          },
        },
      ],
    },
    {
      slotId: 'vfs_slot_3',
      slotIndex: 3,
      vfsSubfolder: 'commander_charlie/',
      commanderName: 'CMDR KAELEN VOSS',
      fid: 'F3310952',
      activeJournalFileName: 'Journal.2026-10-16T011810.01.log',
      activeJournalSizeBytes: 96540,
      lastByteOffset: 96540,
      lastModifiedMs: Date.now() - 600,
      statusLastModifiedMs: Date.now() - 250,
      linesStreamed: 218,
      bytesStreamed: 96540,
      isClientOnline: true,
      gameMode: 'Solo',
      shipType: 'Mandalay',
      shipName: 'EXOBIO RANGER',
      shipIdent: 'EX-03M',
      hullPercent: 94,
      shieldUp: true,
      currentSystem: 'Stuemeae FG-Y d7561',
      systemAddressId64: '25995655683419',
      starPos: [25.28125, -20.90625, 25899.96875],
      stationName: "Explorer's Anchorage",
      Docked: false,
      supercruise: false,
      onFoot: true,
      inSrv: false,
      credits: 8920410800,
      fuelMain: 24.8,
      fuelCapacity: 32.0,
      cargoTons: 0,
      statusSnapshot: {
        timestamp: new Date().toISOString(),
        flags: 0x00000000,
        flags2: 0x00000001,
        pips: [4, 4, 4],
        fireGroup: 0,
        guiFocus: 0,
        fuelMain: 24.8,
        fuelReservoir: 0.48,
        cargoTons: 0,
        legalState: 'Clean',
        latitude: -14.8821,
        longitude: 108.4192,
        altitude: 0,
        heading: 242,
        bodyName: 'Stuemeae FG-Y d7561 4 a',
        planetRadius: 2740000,
        gravity: 0.43,
        oxygen: 0.98,
        health: 1.0,
        temperature: 288.4,
        selectedWeapon: 'Genetic Sampler',
      },
      recentEvents: [
        {
          id: 'seed_3_1',
          slotId: 'vfs_slot_3',
          commanderName: 'CMDR KAELEN VOSS',
          vfsSubfolder: 'commander_charlie/',
          timestamp: new Date(Date.now() - 9000).toISOString(),
          event: 'ScanOrganic',
          systemName: 'Stuemeae FG-Y d7561',
          systemAddressId64: '25995655683419',
          bodyName: 'Stuemeae FG-Y d7561 4 a',
          summary: 'Exobiology Analyse: Stratum Tectonicas on Stuemeae FG-Y d7561 4 a',
          rawJson: {
            timestamp: new Date(Date.now() - 9000).toISOString(),
            event: 'ScanOrganic',
            ScanType: 'Analyse',
            Genus_Localised: 'Stratum',
            Species_Localised: 'Stratum Tectonicas',
            SystemAddress: '25995655683419',
            Body: 14,
          },
        },
      ],
    },
    {
      slotId: 'vfs_slot_4',
      slotIndex: 4,
      vfsSubfolder: 'commander_delta/',
      commanderName: 'CMDR SOREN KADE',
      fid: 'F4190877',
      activeJournalFileName: 'Journal.2026-10-16T011905.01.log',
      activeJournalSizeBytes: 118920,
      lastByteOffset: 118920,
      lastModifiedMs: Date.now() - 1400,
      statusLastModifiedMs: Date.now() - 250,
      linesStreamed: 267,
      bytesStreamed: 118920,
      isClientOnline: true,
      gameMode: 'Open',
      shipType: 'Federal Corvette',
      shipName: 'SOL AEGIS',
      shipIdent: 'FN-404',
      hullPercent: 87,
      shieldUp: true,
      currentSystem: 'Sol',
      systemAddressId64: '10477373803',
      starPos: [0, 0, 0],
      stationName: 'Abraham Lincoln',
      Docked: false,
      supercruise: false,
      onFoot: false,
      inSrv: false,
      credits: 3412500900,
      fuelMain: 28.0,
      fuelCapacity: 32.0,
      cargoTons: 16,
      statusSnapshot: {
        timestamp: new Date().toISOString(),
        flags: 0x01200048, // InMainShip | HasLatLong | HardpointsDeployed | ShieldsUp
        flags2: 0x00000000,
        latitude: 51.5074,
        longitude: -0.1278,
        altitude: 48200,
        heading: 275,
        planetRadius: 6371000,
        gravity: 1.0,
        pips: [4, 2, 6],
        fireGroup: 1,
        guiFocus: 0,
        fuelMain: 28.0,
        fuelReservoir: 0.89,
        cargoTons: 16,
        legalState: 'Clean',
        bodyName: 'Earth',
        destinationName: 'Abraham Lincoln',
        destinationSystemId64: '10477373803',
      },
      recentEvents: [
        {
          id: 'seed_4_1',
          slotId: 'vfs_slot_4',
          commanderName: 'CMDR SOREN KADE',
          vfsSubfolder: 'commander_delta/',
          timestamp: new Date(Date.now() - 5000).toISOString(),
          event: 'SupercruiseExit',
          systemName: 'Sol',
          systemAddressId64: '10477373803',
          bodyName: 'Earth',
          summary: 'Dropped from Supercruise near Earth (Planet)',
          rawJson: {
            timestamp: new Date(Date.now() - 5000).toISOString(),
            event: 'SupercruiseExit',
            StarSystem: 'Sol',
            SystemAddress: '10477373803',
            Body: 'Earth',
            BodyType: 'Planet',
          },
        },
      ],
    },
  ];
}

interface SubfolderWatcherContext {
  slotId: string;
  slotIndex: number;
  vfsSubfolder: string;
  dirHandle: ExtendedDirectoryHandle;
  activeJournalFileName: string;
  lastByteOffset: number;
  lastJournalModifiedMs: number;
  lastStatusModifiedMs: number;
}

export type WatcherUpdateCallback = (
  slots: CommanderVfsSlot[],
  latestEvent: JournalEventRecord | null
) => void;

export class JournalDirectoryWatcherEngine {
  private db: IDBDatabase | null = null;
  private rootHandle: ExtendedDirectoryHandle | null = null;
  private subfolderContexts: Map<string, SubfolderWatcherContext> = new Map();
  private slots: CommanderVfsSlot[] = createInitialMultiBoxSlots();
  private pollTimerId: ReturnType<typeof setInterval> | null = null;
  private isPolling = false;
  private isSimulatedStreamActive = false;
  private pollTickCount = 0;
  private listeners: Set<WatcherUpdateCallback> = new Set();

  public isFileSystemAccessSupported(): boolean {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  }

  public async initIndexedDb(): Promise<void> {
    if (this.db || typeof window === 'undefined' || !('indexedDB' in window)) return;

    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE, { keyPath: 'id' });
          }
        };
        req.onsuccess = () => {
          this.db = req.result;
          resolve();
        };
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  /**
   * Store the authorized `FileSystemDirectoryHandle` in IndexedDB for persistent reconnection across browser restarts.
   */
  public async saveDirectoryHandleToIndexedDb(
    handle: ExtendedDirectoryHandle,
    detectedVfsFolders: string[]
  ): Promise<void> {
    await this.initIndexedDb();
    if (!this.db) return;

    const record: StoredHandleMetadata = {
      id: PRIMARY_HANDLE_KEY,
      folderName: handle.name || 'Elite Dangerous',
      savedAtIso: new Date().toISOString(),
      detectedVfsFolders,
      handle,
    };

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        store.put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  /**
   * Load any previously persisted `FileSystemDirectoryHandle` metadata from IndexedDB.
   */
  public async loadSavedDirectoryHandle(): Promise<StoredHandleMetadata | null> {
    await this.initIndexedDb();
    if (!this.db) return null;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.get(PRIMARY_HANDLE_KEY);
        req.onsuccess = () => {
          resolve((req.result as StoredHandleMetadata) ?? null);
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  /**
   * Query or re-request read permission on a stored IndexedDB `FileSystemDirectoryHandle`.
   */
  public async verifyOrRequestHandlePermission(
    handle: ExtendedDirectoryHandle,
    promptUser = true
  ): Promise<PermissionState> {
    try {
      if (typeof handle.queryPermission === 'function') {
        const currentPerm = await handle.queryPermission({ mode: 'read' });
        if (currentPerm === 'granted') return 'granted';
      }
      if (promptUser && typeof handle.requestPermission === 'function') {
        return await handle.requestPermission({ mode: 'read' });
      }
      return 'prompt';
    } catch {
      return 'denied';
    }
  }

  /**
   * Task 1: Prompt user via HTML5 `showDirectoryPicker()` to authorize the local Elite Dangerous journal directory.
   */
  public async authorizeJournalDirectory(): Promise<{
    authorized: boolean;
    folderName: string;
    detectedVfsSubfolders: string[];
    error?: string;
  }> {
    if (!this.isFileSystemAccessSupported()) {
      return {
        authorized: false,
        folderName: '',
        detectedVfsSubfolders: [],
        error: 'HTML5 showDirectoryPicker() is not supported in this browser.',
      };
    }

    try {
      const pickerFn = (
        window as unknown as {
          showDirectoryPicker: (opts?: Record<string, unknown>) => Promise<ExtendedDirectoryHandle>;
        }
      ).showDirectoryPicker;

      const handle = await pickerFn({
        id: 'atlas_ed_journals',
        mode: 'read',
        startIn: 'documents',
      });

      this.rootHandle = handle;
      const detectedVfs = await this.discoverVfsCommanderDirectories(handle);
      await this.saveDirectoryHandleToIndexedDb(handle, detectedVfs);
      this.startPollingLoop();

      return {
        authorized: true,
        folderName: handle.name,
        detectedVfsSubfolders: detectedVfs,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        authorized: false,
        folderName: '',
        detectedVfsSubfolders: [],
        error: message,
      };
    }
  }

  /**
   * Re-connect using a previously saved IndexedDB directory handle without opening a folder picker dialog.
   */
  public async reconnectSavedHandle(): Promise<{
    authorized: boolean;
    folderName: string;
    detectedVfsSubfolders: string[];
  }> {
    const saved = await this.loadSavedDirectoryHandle();
    if (!saved || !saved.handle) {
      return { authorized: false, folderName: '', detectedVfsSubfolders: [] };
    }

    const perm = await this.verifyOrRequestHandlePermission(saved.handle, true);
    if (perm !== 'granted') {
      return {
        authorized: false,
        folderName: saved.folderName,
        detectedVfsSubfolders: saved.detectedVfsFolders,
      };
    }

    this.rootHandle = saved.handle;
    const detectedVfs = await this.discoverVfsCommanderDirectories(saved.handle);
    await this.saveDirectoryHandleToIndexedDb(saved.handle, detectedVfs);
    this.startPollingLoop();

    return {
      authorized: true,
      folderName: saved.handle.name || saved.folderName,
      detectedVfsSubfolders: detectedVfs,
    };
  }

  /**
   * Task 5: Multi-Account / Multi-Box VFS Directory Ingestion.
   * Scans the authorized root directory for:
   *  - Any `commander_<id>/` virtualized subfolders (EdEzCheese multi-box pattern)
   *  - Root-level `Journal.*.log` files if present
   * Registers up to 4 concurrent client watcher contexts.
   */
  public async discoverVfsCommanderDirectories(
    rootHandle: ExtendedDirectoryHandle
  ): Promise<string[]> {
    this.subfolderContexts.clear();
    const discoveredSubfolders: string[] = [];
    const candidateDirs: Array<{ vfsSubfolder: string; handle: ExtendedDirectoryHandle }> = [];

    try {
      let rootHasJournals = false;
      if (typeof rootHandle.values === 'function') {
        for await (const entry of rootHandle.values()) {
          if (entry.kind === 'directory') {
            const lower = entry.name.toLowerCase();
            if (lower.startsWith('commander_') || lower.startsWith('cmdr_') || lower.startsWith('slot_')) {
              candidateDirs.push({
                vfsSubfolder: `${entry.name}/`,
                handle: entry as ExtendedDirectoryHandle,
              });
            }
          } else if (
            entry.kind === 'file' &&
            entry.name.startsWith('Journal.') &&
            entry.name.endsWith('.log')
          ) {
            rootHasJournals = true;
          }
        }
      }

      candidateDirs.sort((a, b) => a.vfsSubfolder.localeCompare(b.vfsSubfolder));

      if (rootHasJournals && candidateDirs.length < MAX_CONCURRENT_CLIENTS) {
        candidateDirs.unshift({ vfsSubfolder: './', handle: rootHandle });
      }

      const activeDirs = candidateDirs.slice(0, MAX_CONCURRENT_CLIENTS);

      if (activeDirs.length > 0) {
        const nextSlots: CommanderVfsSlot[] = [];
        for (let idx = 0; idx < activeDirs.length; idx++) {
          const item = activeDirs[idx];
          const slotId = `vfs_slot_${idx + 1}`;
          discoveredSubfolders.push(item.vfsSubfolder);

          this.subfolderContexts.set(slotId, {
            slotId,
            slotIndex: idx + 1,
            vfsSubfolder: item.vfsSubfolder,
            dirHandle: item.handle,
            activeJournalFileName: '',
            lastByteOffset: 0,
            lastJournalModifiedMs: 0,
            lastStatusModifiedMs: 0,
          });

          nextSlots.push({
            slotId,
            slotIndex: idx + 1,
            vfsSubfolder: item.vfsSubfolder,
            commanderName: `CMDR SLOT #${idx + 1}`,
            fid: `F00000${idx + 1}`,
            activeJournalFileName: 'Scanning...',
            activeJournalSizeBytes: 0,
            lastByteOffset: 0,
            lastModifiedMs: Date.now(),
            statusLastModifiedMs: Date.now(),
            linesStreamed: 0,
            bytesStreamed: 0,
            isClientOnline: true,
            gameMode: 'Open',
            shipType: 'Awaiting Journal...',
            shipName: 'UNASSIGNED',
            shipIdent: `VFS-${idx + 1}`,
            hullPercent: 100,
            shieldUp: true,
            currentSystem: 'Unknown',
            systemAddressId64: '0',
            starPos: [0, 0, 0],
            stationName: '',
            Docked: false,
            supercruise: false,
            onFoot: false,
            inSrv: false,
            credits: 0,
            fuelMain: 32,
            fuelCapacity: 32,
            cargoTons: 0,
            statusSnapshot: null,
            recentEvents: [],
          });
        }
        this.slots = nextSlots;
      }
    } catch {
      // Fallback to existing slots if directory enumeration fails
    }

    return discoveredSubfolders;
  }

  /**
   * Task 3: Start the 250ms active directory polling worker loop.
   */
  public startPollingLoop(): void {
    this.stopPollingLoop();
    this.isPolling = true;
    this.pollTimerId = setInterval(() => {
      void this.pollTick();
    }, POLL_INTERVAL_MS);
  }

  public stopPollingLoop(): void {
    this.isPolling = false;
    if (this.pollTimerId !== null) {
      clearInterval(this.pollTimerId);
      this.pollTimerId = null;
    }
  }

  public setSimulatedMultiBoxStream(enabled: boolean): void {
    this.isSimulatedStreamActive = enabled;
    if (enabled && !this.isPolling) {
      this.startPollingLoop();
    }
  }

  public getSlotsSnapshot(): CommanderVfsSlot[] {
    return this.slots;
  }

  public subscribe(cb: WatcherUpdateCallback): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notifyListeners(latestEvent: JournalEventRecord | null = null): void {
    for (const cb of this.listeners) {
      cb(this.slots, latestEvent);
    }
  }

  /**
   * Executed every 250ms: polls all active VFS commander directories for updated `Journal.*.log`
   * and `Status.json` files, streaming only byte-offset deltas.
   */
  public async pollTick(): Promise<void> {
    this.pollTickCount++;

    if (this.subfolderContexts.size > 0) {
      for (const [slotId, ctx] of this.subfolderContexts.entries()) {
        await this.pollSingleVfsDirectory(slotId, ctx);
      }
    } else if (this.isSimulatedStreamActive) {
      if (this.pollTickCount % 6 === 0) {
        this.emitSyntheticMultiBoxDelta();
      }
    }
  }

  private async pollSingleVfsDirectory(
    slotId: string,
    ctx: SubfolderWatcherContext
  ): Promise<void> {
    const slot = this.slots.find((s) => s.slotId === slotId);
    if (!slot || typeof ctx.dirHandle.values !== 'function') return;

    try {
      let newestJournalHandle: FileSystemFileHandle | null = null;
      let newestJournalName = '';
      let statusFileHandle: FileSystemFileHandle | null = null;

      for await (const entry of ctx.dirHandle.values()) {
        if (entry.kind !== 'file') continue;
        if (entry.name === 'Status.json') {
          statusFileHandle = entry as FileSystemFileHandle;
        } else if (entry.name.startsWith('Journal.') && entry.name.endsWith('.log')) {
          if (entry.name > newestJournalName) {
            newestJournalName = entry.name;
            newestJournalHandle = entry as FileSystemFileHandle;
          }
        }
      }

      if (statusFileHandle) {
        const statusFile = await statusFileHandle.getFile();
        if (statusFile.lastModified > ctx.lastStatusModifiedMs && statusFile.size > 0) {
          ctx.lastStatusModifiedMs = statusFile.lastModified;
          slot.statusLastModifiedMs = statusFile.lastModified;
          const statusText = await statusFile.text();
          const parsedStatus = parseJournalJsonLinePreservingId64(statusText);
          if (parsedStatus) {
            this.applyStatusJsonToSlot(slot, parsedStatus);
          }
        }
      }

      if (newestJournalHandle) {
        if (ctx.activeJournalFileName !== newestJournalName) {
          ctx.activeJournalFileName = newestJournalName;
          ctx.lastByteOffset = 0;
          ctx.lastJournalModifiedMs = 0;
          slot.activeJournalFileName = newestJournalName;
        }

        const journalFile = await newestJournalHandle.getFile();
        slot.activeJournalSizeBytes = journalFile.size;

        if (
          journalFile.lastModified > ctx.lastJournalModifiedMs ||
          journalFile.size > ctx.lastByteOffset
        ) {
          const delta = await readFileDeltaLines(journalFile, ctx.lastByteOffset);
          ctx.lastByteOffset = delta.newByteOffset;
          ctx.lastJournalModifiedMs = journalFile.lastModified;
          slot.lastByteOffset = delta.newByteOffset;
          slot.lastModifiedMs = journalFile.lastModified;
          slot.bytesStreamed += delta.bytesRead;

          let latestEvt: JournalEventRecord | null = null;
          for (const rawLine of delta.lines) {
            const parsed = parseJournalJsonLinePreservingId64(rawLine);
            if (parsed) {
              slot.linesStreamed += 1;
              latestEvt = this.applyJournalEventToSlot(slot, parsed);
            }
          }

          if (latestEvt) {
            console.info(
              `[Atlas VFS Watcher][${slot.vfsSubfolder}][${slot.commanderName}] ${latestEvt.event}: ${latestEvt.summary}`,
              latestEvt.rawJson
            );
            this.notifyListeners(latestEvt);
          }
        }
      }
    } catch {
      // Ignore transient file lock contention while game writes
    }
  }

  private applyStatusJsonToSlot(
    slot: CommanderVfsSlot,
    raw: Record<string, unknown>
  ): void {
    const flags = Number(raw.Flags ?? 0);
    const flags2 = Number(raw.Flags2 ?? 0);
    const pipsRaw = Array.isArray(raw.Pips) ? raw.Pips : [4, 4, 4];
    const fuelObj = (raw.Fuel ?? {}) as Record<string, unknown>;
    const destObj = (raw.Destination ?? {}) as Record<string, unknown>;

    const fuelMain = Number(fuelObj.FuelMain ?? slot.fuelMain);
    const fuelReservoir = Number(fuelObj.FuelReservoir ?? 0.5);
    const cargoTons = Number(raw.Cargo ?? slot.cargoTons);

    slot.fuelMain = fuelMain;
    slot.cargoTons = cargoTons;
    slot.Docked = (flags & 0x00000001) !== 0;
    slot.supercruise = (flags & 0x00000010) !== 0;
    slot.shieldUp = (flags & 0x00000008) !== 0;
    slot.inSrv = (flags & 0x04000000) !== 0;
    slot.onFoot = (flags2 & 0x00000001) !== 0;

    slot.statusSnapshot = {
      timestamp: String(raw.timestamp ?? new Date().toISOString()),
      flags,
      flags2,
      pips: [Number(pipsRaw[0] ?? 4), Number(pipsRaw[1] ?? 4), Number(pipsRaw[2] ?? 4)],
      fireGroup: Number(raw.FireGroup ?? 0),
      guiFocus: Number(raw.GuiFocus ?? 0),
      fuelMain,
      fuelReservoir,
      cargoTons,
      legalState: String(raw.LegalState ?? 'Clean'),
      latitude: raw.Latitude !== undefined ? Number(raw.Latitude) : undefined,
      longitude: raw.Longitude !== undefined ? Number(raw.Longitude) : undefined,
      altitude: raw.Altitude !== undefined ? Number(raw.Altitude) : undefined,
      heading: raw.Heading !== undefined ? Number(raw.Heading) : undefined,
      bodyName: raw.BodyName ? String(raw.BodyName) : undefined,
      planetRadius: raw.PlanetRadius !== undefined ? Number(raw.PlanetRadius) : slot.statusSnapshot?.planetRadius,
      gravity: raw.Gravity !== undefined ? Number(raw.Gravity) : slot.statusSnapshot?.gravity,
      destinationName: destObj.Name ? String(destObj.Name) : undefined,
      destinationSystemId64: destObj.System ? String(destObj.System) : undefined,
      destinationBodyId: destObj.Body !== undefined ? Number(destObj.Body) : undefined,
      oxygen: raw.Oxygen !== undefined ? Number(raw.Oxygen) : undefined,
      health: raw.Health !== undefined ? Number(raw.Health) : undefined,
      temperature: raw.Temperature !== undefined ? Number(raw.Temperature) : undefined,
      selectedWeapon: raw.SelectedWeapon_Localised
        ? String(raw.SelectedWeapon_Localised)
        : raw.SelectedWeapon
          ? String(raw.SelectedWeapon)
          : undefined,
    };

    this.notifyListeners(null);
  }

  public applyJournalEventToSlot(
    slot: CommanderVfsSlot,
    raw: Record<string, unknown>
  ): JournalEventRecord {
    const eventName = String(raw.event ?? 'Unknown');
    const timestamp = String(raw.timestamp ?? new Date().toISOString());

    if (raw.Commander || (eventName === 'Commander' && raw.Name)) {
      const name = String(raw.Commander ?? raw.Name);
      slot.commanderName = name.toUpperCase().startsWith('CMDR') ? name : `CMDR ${name.toUpperCase()}`;
    }
    if (raw.FID) {
      slot.fid = String(raw.FID);
    }
    if (raw.StarSystem) {
      slot.currentSystem = String(raw.StarSystem);
    }
    if (raw.SystemAddress !== undefined) {
      slot.systemAddressId64 = String(raw.SystemAddress);
    }
    if (Array.isArray(raw.StarPos) && raw.StarPos.length === 3) {
      slot.starPos = [
        Number(raw.StarPos[0]),
        Number(raw.StarPos[1]),
        Number(raw.StarPos[2]),
      ];
    }
    if (raw.Ship_Localised || raw.Ship) {
      slot.shipType = String(raw.Ship_Localised ?? raw.Ship);
    }
    if (raw.ShipName) {
      slot.shipName = String(raw.ShipName);
    }
    if (raw.ShipIdent) {
      slot.shipIdent = String(raw.ShipIdent);
    }
    if (raw.Credits !== undefined) {
      slot.credits = Number(raw.Credits);
    }
    if (raw.FuelLevel !== undefined) {
      slot.fuelMain = Number(raw.FuelLevel);
    }
    if (raw.FuelCapacity !== undefined && typeof raw.FuelCapacity === 'number') {
      slot.fuelCapacity = Number(raw.FuelCapacity);
    }
    if (raw.HullHealth !== undefined) {
      slot.hullPercent = Math.round(Number(raw.HullHealth) * 100);
    }
    if (eventName === 'Docked') {
      slot.Docked = true;
      slot.supercruise = false;
      if (raw.StationName) slot.stationName = String(raw.StationName);
    } else if (eventName === 'Undocked') {
      slot.Docked = false;
    } else if (eventName === 'SupercruiseEntry' || eventName === 'FSDJump') {
      slot.Docked = false;
      slot.supercruise = true;
    } else if (eventName === 'SupercruiseExit') {
      slot.supercruise = false;
    }

    const record: JournalEventRecord = {
      id: `${slot.slotId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      slotId: slot.slotId,
      commanderName: slot.commanderName,
      vfsSubfolder: slot.vfsSubfolder,
      timestamp,
      event: eventName,
      systemName: raw.StarSystem ? String(raw.StarSystem) : slot.currentSystem,
      systemAddressId64:
        raw.SystemAddress !== undefined ? String(raw.SystemAddress) : slot.systemAddressId64,
      marketId64: raw.MarketID !== undefined ? String(raw.MarketID) : undefined,
      bodyName: raw.BodyName ? String(raw.BodyName) : raw.Body ? String(raw.Body) : undefined,
      shipType: slot.shipType,
      shipIdent: slot.shipIdent,
      shipName: slot.shipName,
      hullHealth: slot.hullPercent,
      fuelLevel: slot.fuelMain,
      fuelCapacity: slot.fuelCapacity,
      credits: slot.credits,
      summary: summarizeJournalEvent(raw),
      rawJson: raw,
    };

    slot.recentEvents = [record, ...slot.recentEvents].slice(0, MAX_EVENTS_PER_SLOT);
    return record;
  }

  /**
   * Generates a realistic multi-commander journal event across one of the 4 virtualized commander slots
   * for live in-browser verification and console streaming.
   */
  public emitSyntheticMultiBoxDelta(targetSlotIndex?: number): JournalEventRecord {
    const idx =
      targetSlotIndex !== undefined
        ? Math.max(0, Math.min(this.slots.length - 1, targetSlotIndex))
        : this.pollTickCount % this.slots.length;
    const slot = this.slots[idx];

    const samplePayloads: Array<Record<string, unknown>> = [
      {
        timestamp: new Date().toISOString(),
        event: 'FSDJump',
        StarSystem: idx === 0 ? 'Diagandri' : idx === 1 ? 'Colonia' : idx === 2 ? 'Sagittarius A*' : 'Sirius',
        SystemAddress:
          idx === 0
            ? '2869709317537'
            : idx === 1
              ? '3238296097059'
              : idx === 2
                ? '253172928546'
                : '670417429889',
        StarPos:
          idx === 0
            ? [-39.96875, -18.75, -53.9375]
            : idx === 1
              ? [-9530.5, -910.28125, 19808.125]
              : idx === 2
                ? [25.21875, -20.90625, 25899.96875]
                : [6.25, -1.28125, -5.75],
        JumpDist: 58.42,
        FuelUsed: 6.18,
        FuelLevel: Math.max(8.0, Number((slot.fuelMain - 2.1).toFixed(2))),
      },
      {
        timestamp: new Date().toISOString(),
        event: 'FSSDiscoveryScan',
        Progress: 1.0,
        BodyCount: 34,
        NonBodyCount: 12,
        SystemName: slot.currentSystem,
        SystemAddress: slot.systemAddressId64,
      },
      {
        timestamp: new Date().toISOString(),
        event: 'SAAScanComplete',
        BodyName: `${slot.currentSystem} A 3`,
        SystemAddress: slot.systemAddressId64,
        BodyID: 9,
        ProbesUsed: 5,
        EfficiencyTarget: 6,
      },
      {
        timestamp: new Date().toISOString(),
        event: 'ScanOrganic',
        ScanType: 'Sample',
        Genus: '$Codex_Ent_Fonticulus_Genus_Name;',
        Genus_Localised: 'Fonticulua',
        Species_Localised: 'Fonticulua Campestris',
        SystemAddress: slot.systemAddressId64,
        Body: 11,
      },
    ];

    const payload = samplePayloads[(this.pollTickCount + idx) % samplePayloads.length];
    const encodedBytes = new TextEncoder().encode(JSON.stringify(payload) + '\n').byteLength;

    slot.activeJournalSizeBytes += encodedBytes;
    slot.lastByteOffset = slot.activeJournalSizeBytes;
    slot.bytesStreamed += encodedBytes;
    slot.linesStreamed += 1;
    slot.lastModifiedMs = Date.now();
    slot.statusLastModifiedMs = Date.now();

    const record = this.applyJournalEventToSlot(slot, payload);
    console.info(
      `[Atlas VFS Watcher][${slot.vfsSubfolder}][${slot.commanderName}] ${record.event}: ${record.summary}`,
      record.rawJson
    );
    this.notifyListeners(record);
    return record;
  }

  /**
   * Stage 11.2: Immediately toggles a bitwise flag on `Flags` or `Flags2` in `Status.json`
   * for the specified commander slot (<500ms live HUD response verification).
   */
  public toggleSlotStatusFlag(
    slotId: string,
    maskType: 'Flags' | 'Flags2',
    flagBit: number
  ): StatusTelemetrySnapshot | null {
    const slot = this.slots.find((s) => s.slotId === slotId) ?? this.slots[0];
    if (!slot) return null;

    const current = slot.statusSnapshot ?? {
      timestamp: new Date().toISOString(),
      flags: 0x01000008,
      flags2: 0,
      pips: [4, 4, 4] as [number, number, number],
      fireGroup: 0,
      guiFocus: 0,
      fuelMain: slot.fuelMain,
      fuelReservoir: 0.6,
      cargoTons: slot.cargoTons,
      legalState: 'Clean',
    };

    const nextFlags =
      maskType === 'Flags' ? (current.flags ^ flagBit) >>> 0 : current.flags >>> 0;
    const nextFlags2 =
      maskType === 'Flags2' ? (current.flags2 ^ flagBit) >>> 0 : current.flags2 >>> 0;

    slot.Docked = (nextFlags & 0x00000001) !== 0;
    slot.shieldUp = (nextFlags & 0x00000008) !== 0;
    slot.supercruise = (nextFlags & 0x00000010) !== 0;
    slot.inSrv = (nextFlags & 0x04000000) !== 0;
    slot.onFoot = (nextFlags2 & 0x00000001) !== 0;
    slot.statusLastModifiedMs = Date.now();

    slot.statusSnapshot = {
      ...current,
      timestamp: new Date().toISOString(),
      flags: nextFlags,
      flags2: nextFlags2,
    };

    this.notifyListeners(null);
    return slot.statusSnapshot;
  }

  /**
   * Stage 11.2: Updates distributor Pips allocation `[SYS, ENG, WEP]` (in half-pips `[0..8]`, sum = 12)
   * or active FireGroup (`0..7` -> `A..H`) on a commander slot.
   */
  public updateSlotPipsAndFireGroup(
    slotId: string,
    pips?: [number, number, number],
    fireGroup?: number
  ): StatusTelemetrySnapshot | null {
    const slot = this.slots.find((s) => s.slotId === slotId) ?? this.slots[0];
    if (!slot || !slot.statusSnapshot) return null;

    slot.statusLastModifiedMs = Date.now();
    slot.statusSnapshot = {
      ...slot.statusSnapshot,
      timestamp: new Date().toISOString(),
      pips: pips ? [...pips] : slot.statusSnapshot.pips,
      fireGroup:
        fireGroup !== undefined
          ? Math.max(0, Math.min(7, Math.floor(fireGroup)))
          : slot.statusSnapshot.fireGroup,
    };

    this.notifyListeners(null);
    return slot.statusSnapshot;
  }

  /**
   * Stage 11.2: Applies a preset Planetary Approach or Tactical Status.json profile to a commander slot.
   */
  public applySlotStatusPreset(
    slotId: string,
    preset:
      | 'ORBITAL_GLIDE'
      | 'LANDING_TOUCHDOWN'
      | 'COMBAT_DANGER'
      | 'SILENT_SMUGGLING'
      | 'HIGH_G_APPROACH'
      | 'SRV_SURFACE_OPS'
  ): StatusTelemetrySnapshot | null {
    const slot = this.slots.find((s) => s.slotId === slotId) ?? this.slots[0];
    if (!slot) return null;

    const base = slot.statusSnapshot ?? {
      timestamp: new Date().toISOString(),
      flags: 0x01000008,
      flags2: 0,
      pips: [4, 4, 4] as [number, number, number],
      fireGroup: 0,
      guiFocus: 0,
      fuelMain: slot.fuelMain,
      fuelReservoir: 0.65,
      cargoTons: slot.cargoTons,
      legalState: 'Clean',
    };

    let patch: Partial<StatusTelemetrySnapshot> = {};

    switch (preset) {
      case 'ORBITAL_GLIDE':
        patch = {
          flags: 0x11200008,
          flags2: 0x00001000,
          pips: [4, 8, 0],
          fireGroup: 0,
          altitude: 18450,
          heading: 142,
          latitude: 24.6182,
          longitude: -74.1924,
          bodyName: `${slot.currentSystem} A 1`,
          planetRadius: 5840000,
          gravity: 0.91,
        };
        break;
      case 'LANDING_TOUCHDOWN':
        patch = {
          flags: 0x0121010c,
          flags2: 0x00000000,
          pips: [8, 4, 0],
          fireGroup: 1,
          altitude: 42,
          heading: 90,
          latitude: 24.6501,
          longitude: -74.1502,
          bodyName: `${slot.currentSystem} A 1`,
          planetRadius: 5840000,
          gravity: 0.91,
        };
        break;
      case 'COMBAT_DANGER':
        patch = {
          flags: 0x01400068,
          flags2: 0x00000000,
          pips: [4, 2, 6],
          fireGroup: 2,
          legalState: 'Lawless',
        };
        break;
      case 'SILENT_SMUGGLING':
        patch = {
          flags: 0x01100620,
          flags2: 0x00000000,
          pips: [2, 8, 2],
          fireGroup: 3,
          legalState: 'Illicit Cargo',
        };
        break;
      case 'HIGH_G_APPROACH':
        patch = {
          flags: 0x21200108,
          flags2: 0x00000000,
          pips: [8, 4, 0],
          fireGroup: 0,
          altitude: 3120,
          heading: 315,
          latitude: -41.9028,
          longitude: 162.0841,
          bodyName: 'Achenar 3 (High-G Test)',
          planetRadius: 14920000,
          gravity: 6.73,
        };
        break;
      case 'SRV_SURFACE_OPS':
        patch = {
          flags: 0x0c200308,
          flags2: 0x00000000,
          pips: [4, 6, 2],
          fireGroup: 0,
          altitude: 0,
          heading: 198,
          latitude: -14.8821,
          longitude: 108.4192,
          bodyName: `${slot.currentSystem} 2 a`,
          planetRadius: 2150000,
          gravity: 0.34,
        };
        break;
    }

    slot.statusLastModifiedMs = Date.now();
    slot.statusSnapshot = {
      ...base,
      ...patch,
      timestamp: new Date().toISOString(),
    };

    slot.Docked = (slot.statusSnapshot.flags & 0x00000001) !== 0;
    slot.shieldUp = (slot.statusSnapshot.flags & 0x00000008) !== 0;
    slot.supercruise = (slot.statusSnapshot.flags & 0x00000010) !== 0;
    slot.inSrv = (slot.statusSnapshot.flags & 0x04000000) !== 0;
    slot.onFoot = (slot.statusSnapshot.flags2 & 0x00000001) !== 0;

    this.notifyListeners(null);
    return slot.statusSnapshot;
  }
}

export const journalWatcherEngine = new JournalDirectoryWatcherEngine();
