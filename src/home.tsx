import { useEffect, useRef, useState } from "react";
import { DocBrain } from "./brain";
import type { BrainFile } from "./model";
import { claimsIn, compute } from "./sheet";

function wantsIntro() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (sessionStorage.getItem("bd-intro")) return false;
  return true;
}

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
  const story = useRef<HTMLElement>(null);
  const [play] = useState(wantsIntro);
  const [intro, setIntro] = useState(play);

  useEffect(() => {
    document.documentElement.classList.add("motion");
    const nodes = document.querySelectorAll(".chapter");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      nodes.forEach((node) => node.classList.add("in"));
      return;
    }
    const seen = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) entry.target.classList.add("in");
        }
      },
      { threshold: 0.2 },
    );
    nodes.forEach((node) => seen.observe(node));
    return () => seen.disconnect();
  }, []);

  useEffect(() => {
    if (!intro) return;
    document.documentElement.classList.add("intro-lock");
    const done = () => {
      sessionStorage.setItem("bd-intro", "1");
      document.documentElement.classList.remove("intro-lock");
      setIntro(false);
    };
    const timer = window.setTimeout(done, 3200);
    const skip = (event: KeyboardEvent) => {
      if (event.key === "Escape") done();
    };
    window.addEventListener("keydown", skip);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", skip);
      document.documentElement.classList.remove("intro-lock");
    };
  }, [intro]);

  useEffect(() => {
    const node = story.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const onScroll = () => {
      const total = node.offsetHeight - window.innerHeight;
      const passed = window.scrollY - node.offsetTop;
      const progress = total <= 0 ? 0 : Math.min(1, Math.max(0, passed / total));
      node.style.setProperty("--p", progress.toFixed(3));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className={intro ? "opening" : "opened"}>
      <div className="wordmark" aria-hidden={!intro}>
        <strong>BrainDocs</strong>
      </div>
      <header className="wrap nav">
        <button className="brand" type="button">
          <Mark />
          BrainDocs
        </button>
        <div className="nav-actions">
          <button className="quiet" type="button" onClick={onAccount}>
            {author || "Sign in"}
          </button>
          <button className="solid" type="button" onClick={onFiles}>
            Open my files
          </button>
        </div>
      </header>
      <section className="story" ref={story} aria-label="Interactive neural field. Drag sideways to turn it.">
        <div className="story-pin field">
          <DocBrain className="field-brain" assembled={!play} />
          <div className="veil" />
          <div className="field-fade">
            <div className="wrap field-copy">
              <p className="kicker">Your workspace. With a brain.</p>
              <h1>
                Your ideas, <em>connected.</em>
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
              <p className="hint">Drag the field. Scroll to move through it.</p>
            </div>
          </div>
        </div>
      </section>
      <main className="wrap">
        <section className="section chapter">
          <p className="kicker">A connected workspace</p>
          <h2>One idea. Every possibility.</h2>
          <p className="lede">Documents. Numbers. People.</p>
          <div className="split">
            <div className="brain-well" aria-hidden="true">
              <DocBrain count={1600} assembled />
            </div>
            <article className="preview">
              <div className="doc-bar">
                <span>Launch brief</span>
                <span>{ready ? "Saved" : conflict ? "Needs a check" : "Sample"}</span>
              </div>
              <h3>Good ideas deserve a clear beginning.</h3>
              <p>
                Bring the team together around one plan. Keep decisions connected to their sources,
                and make room for the next great idea.
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
                <p className={ready ? "ok inline" : "fine"}>
                  {ready ? "Draft ready for review" : "Illustrative until you open the file"}
                </p>
                {sample ? (
                  <button className="ghost" type="button" onClick={() => onOpen(sample.id)}>
                    Open the sample
                  </button>
                ) : null}
              </div>
            </article>
          </div>
        </section>

        <section className="section notes chapter">
          <article>
            <p className="kicker">01</p>
            <h3>From first thought to final draft</h3>
            <p>Documents and spreadsheets belong together.</p>
          </article>
          <article>
            <p className="kicker">02</p>
            <h3>Keep the conversation connected</h3>
            <p>Meeting notes, shared tasks and the sheet that checks them.</p>
          </article>
          <article>
            <p className="kicker">03</p>
            <h3>A source behind the answer</h3>
            <p>Review drafts. Follow the cells. Keep the final say.</p>
          </article>
        </section>

        <section className="section close chapter">
          <p className="kicker">Room for your next idea</p>
          <h2>Make something worth sharing.</h2>
          <button className="solid" type="button" onClick={onFiles}>
            Open BrainDocs
          </button>
        </section>
      </main>
      <footer className="wrap">
        <span>BrainDocs</span>
        <span>Docs and sheets with a brain.</span>
      </footer>
    </div>
  );
}

export function Mark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <ellipse cx="8" cy="11" rx="4.2" ry="5.4" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <ellipse cx="14" cy="11" rx="4.2" ry="5.4" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 8.5c1.2.4 2 .4 3 0M8 13.5c1.2-.4 2-.4 3 0" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
