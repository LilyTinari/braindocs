import { useEffect, useState } from "react";
import { Editor } from "./editor";
import { Files } from "./files";
import { Home } from "./home";
import {
  loadLibrary,
  makeFile,
  meetingNotes,
  projectBrief,
  saveLibrary,
  type BrainFile,
  type Kind,
  type Library,
} from "./model";
import type { Grid } from "./sheet";

type Route =
  | { name: "home" }
  | { name: "files"; scope: "files" | "starred" | "trash" }
  | { name: "file"; id: string }
  | { name: "place"; id: Place };

type Place = "chat" | "teams" | "transcribe" | "meetings" | "shared" | "memory" | "settings";

const places: { id: Place; label: string; body: string }[] = [
  { id: "chat", label: "Chat", body: "Lucien reads the file you have open. A separate inbox is not on this page." },
  { id: "teams", label: "Brain teams", body: "A team would be the people on a file. Sharing across accounts is not on this build." },
  { id: "transcribe", label: "Transcribe", body: "Paste a link. It stays on this device. A transcript is not fetched from here." },
  { id: "meetings", label: "Meetings", body: "No meeting is connected. Notes you write live in a document." },
  { id: "shared", label: "Shared brain", body: "A shared brain reads one person’s graph. These files stay in this browser." },
  { id: "memory", label: "Memory", body: "What this browser has actually edited." },
  { id: "settings", label: "Settings", body: "The name on your files. It does not leave this device." },
];

export function App() {
  const [lib, setLib] = useState<Library>(loadLibrary);
  const [route, setRoute] = useState<Route>({ name: "home" });
  const [drawer, setDrawer] = useState(false);
  const [account, setAccount] = useState(false);

  useEffect(() => {
    saveLibrary(lib);
  }, [lib]);

  function add(kind: Kind, name: string, doc = "", grid: Grid = {}) {
    const body = name === "Meeting notes" ? meetingNotes : name === "Project brief" ? projectBrief : name === "Launch brief" ? launchBody() : doc;
    const next = makeFile(kind, name, body, name === "Launch brief" ? { A1: "250", A2: "160", A3: "=A1-A2" } : grid);
    setLib((prev) => ({ ...prev, files: [next, ...prev.files] }));
    setRoute({ name: "file", id: next.id });
  }

  function update(id: string, recipe: (file: BrainFile) => BrainFile) {
    setLib((prev) => ({
      ...prev,
      files: prev.files.map((file) => (file.id === id ? { ...recipe(file), updated: Date.now() } : file)),
    }));
  }

  const open = route.name === "file" ? lib.files.find((file) => file.id === route.id) : undefined;

  return (
    <>
      {route.name === "home" ? (
        <Home
          author={lib.author}
          sample={lib.files.find((file) => file.id === "sample-launch" && !file.trashed)}
          onFiles={() => setRoute({ name: "files", scope: "files" })}
          onAccount={() => setAccount(true)}
          onOpen={(id) => setRoute({ name: "file", id })}
        />
      ) : null}
      {route.name === "files" ? (
        <Files
          files={lib.files}
          scope={route.scope}
          onMenu={() => setDrawer(true)}
          onOpen={(id) => setRoute({ name: "file", id })}
          onCreate={(kind, name) => add(kind, name)}
          onImport={(name, grid) => add("sheet", name, "", grid)}
          onStar={(id) => update(id, (file) => ({ ...file, starred: !file.starred }))}
          onTrash={(id) => update(id, (file) => ({ ...file, trashed: true }))}
          onRestore={(id) => update(id, (file) => ({ ...file, trashed: false }))}
        />
      ) : null}
      {route.name === "file" && open ? (
        <Editor
          file={open}
          onBack={() => setRoute({ name: "files", scope: "files" })}
          onChange={(next) =>
            update(open.id, (file) => ({
              ...file,
              ...next,
              approvedAt: null,
            }))
          }
          onApprove={() =>
            update(open.id, (file) => ({
              ...file,
              approvedAt: Date.now(),
              versions: [{ at: Date.now(), doc: file.doc, grid: file.grid }, ...file.versions].slice(0, 6),
            }))
          }
        />
      ) : null}
      {route.name === "place" ? (
        <PlaceView
          id={route.id}
          lib={lib}
          onBack={() => setRoute({ name: "files", scope: "files" })}
          onAuthor={(author) => setLib((prev) => ({ ...prev, author }))}
          onClip={(clip) => setLib((prev) => ({ ...prev, clips: [clip, ...prev.clips].slice(0, 12) }))}
          onSignOut={() => setLib((prev) => ({ ...prev, author: "" }))}
        />
      ) : null}
      {drawer ? (
        <div className="drawer-backdrop" onClick={() => setDrawer(false)}>
          <nav className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="studio-bar">
              <strong>BrainDocs</strong>
              <button className="quiet" type="button" onClick={() => setDrawer(false)}>
                Close
              </button>
            </div>
            <button type="button" onClick={() => { setRoute({ name: "home" }); setDrawer(false); }}>
              Home
            </button>
            <button type="button" onClick={() => { setRoute({ name: "files", scope: "files" }); setDrawer(false); }}>
              My files
            </button>
            <button type="button" onClick={() => { setRoute({ name: "files", scope: "starred" }); setDrawer(false); }}>
              Starred
            </button>
            <button type="button" onClick={() => { setRoute({ name: "files", scope: "trash" }); setDrawer(false); }}>
              Trash
            </button>
            {places.map((place) => (
              <button
                key={place.id}
                type="button"
                onClick={() => {
                  setRoute({ name: "place", id: place.id });
                  setDrawer(false);
                }}
              >
                {place.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setLib((prev) => ({ ...prev, author: "" }));
                setDrawer(false);
                setRoute({ name: "home" });
              }}
            >
              Sign out
            </button>
          </nav>
        </div>
      ) : null}
      {account ? (
        <div className="sheet-modal" onClick={() => setAccount(false)}>
          <article onClick={(e) => e.stopPropagation()}>
            <p className="kicker">This browser</p>
            <h2>A name on the files.</h2>
            <p className="fine">It stays here. Another device will not see it.</p>
            <label>
              Name
              <input
                value={lib.author}
                placeholder="Your name"
                onChange={(e) => setLib((prev) => ({ ...prev, author: e.target.value.slice(0, 40) }))}
              />
            </label>
            <button className="solid" type="button" onClick={() => setAccount(false)}>
              Save
            </button>
          </article>
        </div>
      ) : null}
    </>
  );
}

function launchBody() {
  return `Launch brief

Good ideas deserve a clear beginning.

Bring the team together around one plan. The notes put the gap at 95.`;
}

function PlaceView({
  id,
  lib,
  onBack,
  onAuthor,
  onClip,
  onSignOut,
}: {
  id: Place;
  lib: Library;
  onBack: () => void;
  onAuthor: (name: string) => void;
  onClip: (clip: string) => void;
  onSignOut: () => void;
}) {
  const place = places.find((item) => item.id === id)!;
  const [clip, setClip] = useState("");
  return (
    <div className="page">
      <header className="studio-bar">
        <button className="quiet" type="button" onClick={onBack}>
          Back
        </button>
        <h2>{place.label}</h2>
      </header>
      <section className="pad stack">
        <p>{place.body}</p>
        {id === "memory" ? (
          <ul className="file-list">
            {lib.files
              .filter((file) => !file.trashed)
              .map((file) => (
                <li key={file.id}>
                  <span className="file-main">
                    <strong>{file.name}</strong>
                  </span>
                </li>
              ))}
          </ul>
        ) : null}
        {id === "settings" ? (
          <label>
            Name
            <input value={lib.author} onChange={(e) => onAuthor(e.target.value.slice(0, 40))} />
          </label>
        ) : null}
        {id === "transcribe" ? (
          <>
            <label>
              Link
              <input value={clip} onChange={(e) => setClip(e.target.value)} placeholder="Paste a link" />
            </label>
            <button
              className="solid"
              type="button"
              onClick={() => {
                if (!clip.trim()) return;
                onClip(clip.trim());
                setClip("");
              }}
            >
              Keep the link
            </button>
            <ul className="file-list">
              {lib.clips.map((item) => (
                <li key={item}>
                  <span className="fine">{item}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {id === "settings" ? (
          <button className="ghost" type="button" onClick={onSignOut}>
            Clear the name
          </button>
        ) : null}
      </section>
    </div>
  );
}
