import { DocBrain } from "./brain";
import type { BrainFile } from "./model";
import { claimsIn, compute } from "./sheet";

export function Home({
  author,
  sample,
  onFiles,
  onAccount,
  onOpen,
}: {
  author: string;
  sample: BrainFile | undefined;
  onFiles: () => void;
  onAccount: () => void;
  onOpen: (id: string) => void;
}) {
  const result = sample ? compute(sample.grid, "A3") : { value: null };
  const claim = sample ? claimsIn(sample.doc)[0] : undefined;
  const ready = Boolean(sample && result.value !== null && claim && claim.value === result.value);
  const conflict = Boolean(sample && result.value !== null && claim && claim.value !== result.value);

  return (
    <>
      <header className="wrap nav">
        <button className="brand" type="button">
          <Mark />
          BrainDocs
        </button>
        <div className="nav-actions">
          <button className="quiet" type="button" onClick={onAccount}>
            {author || "Sign in"}
          </button>
          <button className="ghost" type="button" onClick={onFiles}>
            Open my files
          </button>
        </div>
      </header>
      <main className="wrap">
        <section className="hero">
          <div>
            <p className="kicker">Your workspace. With a brain.</p>
            <h1 style={{ marginTop: 12 }}>
              BrainDocs
              <span className="subhead">
                Your ideas, <span className="accent">connected.</span>
              </span>
            </h1>
            <p className="lede">
              Write, calculate and create together. A shared space for your work — with a brain that
              thinks alongside you, inside the file.
            </p>
            <div className="row">
              <button className="solid" type="button" onClick={onFiles}>
                Open my files
              </button>
              <button className="ghost" type="button" onClick={onAccount}>
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
              <span>
                <i className="dot" /> launch-brief.md
              </span>
              <span>main</span>
            </div>
            <DocBrain className="doc-brain" />
          </article>
        </section>

        <section className="section">
          <p className="kicker">A connected workspace</p>
          <h2 style={{ margin: "10px 0 8px" }}>One idea. Every possibility.</h2>
          <p className="lede">Documents. Numbers. People.</p>
          <article className="preview">
            <div className="doc-bar">
              <span>Launch brief</span>
              <span>{ready ? "Saved" : conflict ? "Needs a check" : "Sample"}</span>
            </div>
            <h3>Good ideas deserve a clear beginning.</h3>
            <p>
              Bring the team together around one plan. Keep decisions connected to their sources, and
              make room for the next great idea.
            </p>
            <div className="lucien">
              <div className="doc-bar">
                <strong>Lucien</strong>
                <span>Brain</span>
              </div>
              <p className="fine">Launch notes · source passage</p>
              <p>
                {conflict
                  ? `The notes say ${claim?.value}. The sheet says ${result.value}.`
                  : ready
                    ? "The launch notes match the sheet. The draft can be approved."
                    : "Open the sample. The brain reads that file, not a slogan."}
              </p>
              <p className={ready ? "ok inline" : "fine"}>{ready ? "Draft ready for review" : "Illustrative until you open the file"}</p>
              {sample ? (
                <button className="ghost" type="button" onClick={() => onOpen(sample.id)}>
                  Open the sample
                </button>
              ) : null}
            </div>
          </article>
        </section>

        <section className="section stack">
          <article className="card">
            <h3>From first thought to final draft</h3>
            <p>Documents and spreadsheets belong together.</p>
          </article>
          <article className="card">
            <h3>Keep the conversation connected</h3>
            <p>Meeting notes, shared tasks and the sheet that checks them.</p>
          </article>
          <article className="card">
            <h3>A source behind the answer</h3>
            <p>Review drafts. Follow the cells. Keep the final say.</p>
          </article>
        </section>

        <section className="section">
          <p className="kicker">Room for your next idea</p>
          <h2 style={{ margin: "10px 0 16px" }}>Make something worth sharing.</h2>
          <button className="solid" type="button" onClick={onFiles}>
            Open BrainDocs
          </button>
        </section>
      </main>
      <footer className="wrap">
        <span>BrainDocs</span>
        <span>Docs and sheets with a brain.</span>
      </footer>
    </>
  );
}

export function Mark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <path d="M4 15c3-1 5-4 7-8 2 4 4 7 7 8" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="11" cy="8" r="1.3" fill="currentColor" />
    </svg>
  );
}
