import type { Grid } from "./sheet";

export type Kind = "doc" | "sheet";

export type Version = { at: number; doc: string; grid: Grid };

export type BrainFile = {
  id: string;
  name: string;
  kind: Kind;
  doc: string;
  grid: Grid;
  citation: string;
  starred: boolean;
  trashed: boolean;
  updated: number;
  approvedAt: number | null;
  versions: Version[];
};

export type Library = { author: string; clips: string[]; files: BrainFile[] };

const KEY = "braindocs.library";

const launchDoc = `Launch brief

Good ideas deserve a clear beginning.

Bring the team together around one plan. The notes put the gap at 95.`;

function file(partial: Omit<BrainFile, "versions" | "citation" | "approvedAt"> & Partial<BrainFile>): BrainFile {
  return {
    citation: "",
    approvedAt: null,
    versions: [],
    ...partial,
  };
}

export function seed(): Library {
  const now = Date.now();
  return {
    author: "",
    clips: [],
    files: [
      file({
        id: "sample-launch",
        name: "Review a sample launch",
        kind: "doc",
        doc: launchDoc,
        grid: { A1: "250", A2: "160", A3: "=A1-A2", B1: "Plan", B2: "Hold", B3: "Gap" },
        starred: true,
        trashed: false,
        updated: now,
      }),
      file({
        id: "evidence",
        name: "Evidence checklist",
        kind: "doc",
        doc: `Evidence checklist

1. The number in the sentence matches a cell.
2. A timeout is not treated as a source.
3. You approve the draft. The brain does not.`,
        grid: {},
        starred: false,
        trashed: false,
        updated: now - 60_000,
      }),
      file({
        id: "tracker",
        name: "Project tracker",
        kind: "sheet",
        doc: "",
        grid: {
          A1: "Team",
          B1: "Open",
          C1: "Done",
          A2: "Launch",
          B2: "8",
          C2: "3",
          A3: "Proof",
          B3: "5",
          C3: "5",
          A4: "Left",
          B4: "=B2-C2",
        },
        starred: false,
        trashed: false,
        updated: now - 120_000,
      }),
    ],
  };
}

export function loadLibrary(): Library {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as Library;
    if (!Array.isArray(parsed.files) || !Array.isArray(parsed.clips)) return seed();
    return parsed;
  } catch {
    return seed();
  }
}

export function saveLibrary(lib: Library) {
  localStorage.setItem(KEY, JSON.stringify(lib));
}

export function makeFile(kind: Kind, name: string, doc = "", grid: Grid = {}): BrainFile {
  return file({
    id: crypto.randomUUID(),
    name,
    kind,
    doc,
    grid,
    starred: false,
    trashed: false,
    updated: Date.now(),
  });
}

export function ago(ts: number) {
  const seconds = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

export const meetingNotes = `Meeting notes

Agenda
- 

Decisions
- 

The gap at 0 is a placeholder. Point it at a cell before you approve.`;

export const projectBrief = `Project brief

Goal

Scope

The gap at 0 stays a claim until the sheet agrees.`;
