import { useEffect, useMemo, useState } from "react";
import { DocBrain } from "./brain";
import { alignClaim, claimsIn, compute, type Grid } from "./sheet";

type View = "home" | "files";
type Pane = "doc" | "sheet" | "split";

type Snapshot = { at: string; doc: string; grid: Grid };

type FileState = {
  doc: string;
  grid: Grid;
  versions: Snapshot[];
  approvedAt: string | null;
  author: string;
};

const STORE = "braindocs.file";

const starterDoc = `Launch brief

Good ideas deserve a clear beginning.

Bring the team together around one plan. The notes put the gap at 95.`;

const starterGrid: Grid = {
  A1: "250",
  A2: "160",
  A3: "=A1-A2",
  B1: "Plan",
  B2: "Hold",
  B3: "Gap",
};

function load(): FileState {
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) throw new Error("empty");
    const parsed = JSON.parse(raw) as FileState;
    if (parsed?.doc && parsed.grid) return parsed;
  } catch {
    /* fresh file */
  }
  return { doc: starterDoc, grid: starterGrid, versions: [], approvedAt: null, author: "" };
}

function Mark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <path d="M4 15c3-1 5-4 7-8 2 4 4 7 7 8" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="11" cy="8" r="1.3" fill="currentColor" />
    </svg>
  );
}

export function App() {
  const [view, setView] = useState<View>("home");
  const [pane, setPane] = useState<Pane>("doc");
  const [file, setFile] = useState<FileState>(load);
  const [account, setAccount] = useState(false);
  const [active, setActive] = useState("A3");
  const [link, setLink] = useState("");

  useEffect(() => {
    localStorage.setItem(STORE, JSON.stringify(file));
  }, [file]);

  const result = compute(file.grid, "A3");
  const claims = useMemo(() => claimsIn(file.doc), [file.doc]);
  const mismatch = claims.find((c) => result.value !== null && c.value !== result.value) ?? null;
  const clear = result.value !== null && !mismatch;

  function patch(next: Partial<FileState>) {
    setFile((prev) => ({ ...prev, ...next, approvedAt: null }));
  }

  function align() {
    if (result.value === null) return;
    patch({ doc: alignClaim(file.doc, result.value) });
  }

  function openFiles() {
    setPane("split");
    setView("files");
  }

  function approve() {
    if (!clear) return;
    const snap: Snapshot = { at: new Date().toISOString(), doc: file.doc, grid: { ...file.grid } };
    setFile((prev) => ({
      ...prev,
      approvedAt: snap.at,
      versions: [snap, ...prev.versions].slice(0, 8),
    }));
  }

  return (
    <>
      {view === "home" ? (
        <>
          <header className="wrap nav">
            <button className="brand" type="button" onClick={() => setView("home")}>
              <Mark />
              BrainDocs
            </button>
            <div className="nav-actions">
              <button className="quiet" type="button" onClick={() => setAccount(true)}>
                {file.author || "Sign in"}
              </button>
              <button className="ghost" type="button" onClick={openFiles}>
                Open my files
              </button>
            </div>
          </header>
          <main className="wrap">
            <section className="hero">
              <div>
                <p className="kicker">Your workspace. With a brain.</p>
                <h1 style={{ marginTop: 12 }}>
                  Your ideas, <span className="accent">connected.</span>
                </h1>
                <p className="lede">
                  Write, calculate and create together. A shared page for the work — with a brain
                  that sits inside the document and checks the words against the sheet.
                </p>
                <div className="row">
                  <button className="solid" type="button" onClick={openFiles}>
                    Open my files
                  </button>
                  <button className="ghost" type="button" onClick={() => setAccount(true)}>
                    Create an account
                  </button>
                </div>
                <div className="meta">
                  <span>Version history</span>
                  <span>Your approval first</span>
                </div>
              </div>
              <article className="doc-stage" aria-label="A document with a brain inside it">
                <div className="doc-bar">
                  <span><i className="dot" /> launch-brief.md</span>
                  <span>main</span>
                </div>
                <DocBrain className="doc-brain" />
              </article>
            </section>

            <section className="section">
              <p className="kicker">One idea. Every possibility.</p>
              <h2 style={{ margin: "10px 0 8px" }}>Documents. Numbers. People.</h2>
              <div className="tabs" style={{ margin: "16px 0" }}>
                {(["doc", "sheet", "split"] as Pane[]).map((id) => (
                  <button key={id} className="ghost" type="button" data-on={pane === id} onClick={() => setPane(id)}>
                    {id === "doc" ? "Documents" : id === "sheet" ? "Spreadsheets" : "Brain"}
                  </button>
                ))}
              </div>
              <article className="card">
                {pane === "doc" ? (
                  <>
                    <h3>Launch brief</h3>
                    <p>Decisions stay next to the sources they came from. The brain does not get the last word. You do.</p>
                  </>
                ) : null}
                {pane === "sheet" ? (
                  <>
                    <h3>The sheet is the proof</h3>
                    <p>
                      A1 is {file.grid.A1}. A2 is {file.grid.A2}. A3 is {file.grid.A3}
                      {result.value !== null ? `, which is ${result.value}.` : "."} If the brief names another gap, Sentinel says so.
                    </p>
                  </>
                ) : null}
                {pane === "split" ? (
                  <>
                    <h3>Lucien</h3>
                    <p>
                      The brain reads this file only. {clear ? "The brief matches the sheet." : "The brief and the sheet disagree."} It will not invent a source to smooth that over.
                    </p>
                  </>
                ) : null}
              </article>
            </section>

            <section className="section">
              <div className="stack">
                <article className="card">
                  <h3>From first thought to final draft</h3>
                  <p>Documents and spreadsheets belong on the same page. Change a cell and the check updates.</p>
                </article>
                <article className="card">
                  <h3>A source behind the answer</h3>
                  <p>Review the draft. Follow the cells. Keep the final say.</p>
                </article>
                <article className="card">
                  <h3>Specialists, when you ask</h3>
                  <p>
                    Lucien plus the lenses you already keep — clarity, numbers, review. They insert a line you can edit. They do not pretend a vault of strangers wrote the file.
                  </p>
                </article>
              </div>
            </section>

            <section className="section">
              <p className="kicker">Room for the next idea</p>
              <h2 style={{ margin: "10px 0 16px" }}>Make something worth sharing.</h2>
              <button className="solid" type="button" onClick={openFiles}>
                Open BrainDocs
              </button>
            </section>
          </main>
          <footer className="wrap">
            <span>BrainDocs</span>
            <span>Docs and sheets with a brain.</span>
          </footer>
        </>
      ) : (
        <Studio
          file={file}
          pane={pane}
          setPane={setPane}
          active={active}
          setActive={setActive}
          link={link}
          setLink={setLink}
          result={result.value}
          mismatch={mismatch?.value ?? null}
          clear={clear}
          onDoc={(doc) => patch({ doc })}
          onCell={(id, value) => patch({ grid: { ...file.grid, [id]: value } })}
          onAlign={align}
          onApprove={approve}
          onRestore={(snap) => setFile((prev) => ({ ...prev, doc: snap.doc, grid: snap.grid, approvedAt: null }))}
          onHome={() => setView("home")}
          onInsert={(line) => patch({ doc: `${file.doc.trim()}\n\n${line}` })}
        />
      )}

      {account ? (
        <div className="sheet-modal" role="presentation" onClick={() => setAccount(false)}>
          <article onClick={(e) => e.stopPropagation()}>
            <p className="kicker">This browser</p>
            <h2>A name on the file.</h2>
            <p className="fine">
              Accounts that follow you to another device are not on this build. The name stays with the file here.
            </p>
            <label>
              Name
              <input
                type="text"
                value={file.author}
                placeholder="Your name"
                onChange={(e) => setFile((prev) => ({ ...prev, author: e.target.value.slice(0, 40) }))}
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

function Studio(props: {
  file: FileState;
  pane: Pane;
  setPane: (p: Pane) => void;
  active: string;
  setActive: (id: string) => void;
  link: string;
  setLink: (v: string) => void;
  result: number | null;
  mismatch: number | null;
  clear: boolean;
  onDoc: (doc: string) => void;
  onCell: (id: string, value: string) => void;
  onAlign: () => void;
  onApprove: () => void;
  onRestore: (snap: Snapshot) => void;
  onHome: () => void;
  onInsert: (line: string) => void;
}) {
  const { file, result, mismatch, clear } = props;
  return (
    <div className="studio">
      <header className="studio-bar">
        <button className="brand" type="button" onClick={props.onHome}>
          <Mark />
          BrainDocs
        </button>
        <button className="solid" type="button" disabled={!clear} onClick={props.onApprove}>
          {file.approvedAt ? "Approved" : "Approve"}
        </button>
      </header>
      <div className="file-tabs">
        {(["doc", "sheet", "split"] as Pane[]).map((id) => (
          <button key={id} className="ghost" type="button" data-on={props.pane === id} onClick={() => props.setPane(id)}>
            {id === "doc" ? "Doc" : id === "sheet" ? "Sheet" : "Split"}
          </button>
        ))}
      </div>
      <div className="work">
        {props.pane !== "sheet" ? (
          <section className="doc-edit">
            <p className="fine">launch-brief.md {file.author ? `· ${file.author}` : ""}</p>
            <textarea aria-label="Document" value={file.doc} onChange={(e) => props.onDoc(e.target.value)} />
            <div className="row">
              <button className="ghost" type="button" onClick={() => props.onInsert("Clarity: say the decision in one sentence.")}>
                Clarity
              </button>
              <button className="ghost" type="button" onClick={() => props.onInsert("Numbers: the gap has to match cell A3.")}>
                Numbers
              </button>
              <button className="ghost" type="button" onClick={() => props.onInsert("Review: approve only after the sheet agrees.")}>
                Review
              </button>
            </div>
          </section>
        ) : null}
        {props.pane !== "doc" ? (
          <section className="side">
            <table className="sheet">
              <thead>
                <tr>
                  <th />
                  <th>A</th>
                  <th>B</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3].map((row) => (
                  <tr key={row}>
                    <th>{row}</th>
                    {["A", "B"].map((col) => {
                      const id = `${col}${row}`;
                      return (
                        <td key={id} data-on={props.active === id}>
                          <input
                            aria-label={id}
                            value={file.grid[id] ?? ""}
                            onFocus={() => props.setActive(id)}
                            onChange={(e) => props.onCell(id, e.target.value)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="fine">
              {props.active} {file.grid[props.active]?.startsWith("=") ? `→ ${compute(file.grid, props.active).value ?? "—"}` : ""}
            </p>
            {mismatch !== null && result !== null ? (
              <div className="flag">
                <strong>Contradiction</strong>
                <p className="fine">The brief says {mismatch}. A3 is {file.grid.A3}, which is {result}.</p>
                <button className="solid" type="button" onClick={props.onAlign}>
                  Align the brief to {result}
                </button>
              </div>
            ) : (
              <p className="ok">{clear ? "The brief matches the sheet." : "A3 needs a number before this can be checked."}</p>
            )}
            <label>
              Video link
              <input
                type="text"
                value={props.link}
                placeholder="Paste a link"
                onChange={(e) => props.setLink(e.target.value)}
              />
            </label>
            <p className="fine">
              {props.link
                ? "Saved on this page. A transcript is not fetched from here."
                : "A transcript is not pulled in this build. The link can wait on the page."}
            </p>
            <div className="versions">
              <p className="fine">Version history</p>
              {file.versions.length === 0 ? <p className="fine">Approve a clean file to keep a version.</p> : null}
              {file.versions.map((snap) => (
                <button key={snap.at} className="ghost" type="button" onClick={() => props.onRestore(snap)}>
                  {new Date(snap.at).toLocaleString()}
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>
      <footer className="status">
        <span>{file.approvedAt ? "Approved" : clear ? "Ready for review" : "Approval needed"}</span>
        <span>A3 {result ?? "—"}</span>
      </footer>
    </div>
  );
}
