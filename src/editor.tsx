import { useMemo, useRef, useState } from "react";
import type { BrainFile } from "./model";
import { ago } from "./model";
import { alignClaim, claimsIn, COLS, compute, ROWS, shown, toCsv, type Grid } from "./sheet";

export function Editor({
  file,
  onBack,
  onChange,
  onApprove,
}: {
  file: BrainFile;
  onBack: () => void;
  onChange: (next: Pick<BrainFile, "name" | "doc" | "grid" | "citation">) => void;
  onApprove: () => void;
}) {
  const [pane, setPane] = useState<"doc" | "sheet">(file.kind === "sheet" ? "sheet" : "doc");
  const [active, setActive] = useState("A1");
  const [brain, setBrain] = useState(false);
  const [chart, setChart] = useState(false);
  const [menu, setMenu] = useState(false);
  const [note, setNote] = useState("");
  const docRef = useRef<HTMLTextAreaElement>(null);

  const result = compute(file.grid, "A3");
  const claim = useMemo(() => claimsIn(file.doc)[0], [file.doc]);
  const mismatch = claim && result.value !== null && claim.value !== result.value;
  const ready = Boolean(claim && result.value !== null && claim.value === result.value);

  function patch(partial: Partial<Pick<BrainFile, "name" | "doc" | "grid" | "citation">>) {
    onChange({
      name: file.name,
      doc: file.doc,
      grid: file.grid,
      citation: file.citation,
      ...partial,
    });
  }

  function download() {
    const blob = new Blob([toCsv(file.grid)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${file.name || "sheet"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setMenu(false);
  }

  async function share() {
    const line = `${file.name}. ${ready ? "The brief matches the sheet." : mismatch ? `Brief ${claim?.value}, sheet ${result.value}.` : "No shared link on this device."}`;
    try {
      await navigator.clipboard.writeText(line);
      setNote("Copied a summary. There is no shared link on this build.");
    } catch {
      setNote("Could not copy from this browser.");
    }
  }

  const bars = COLS.map((col) => {
    const values = ROWS.map((row) => {
      const raw = (file.grid[`${col}${row}`] ?? "").trim();
      if (!raw) return null;
      if (raw.startsWith("=")) return compute(file.grid, `${col}${row}`).value;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    }).filter((n): n is number => n !== null);
    return { col, total: values.reduce((sum, n) => sum + n, 0), count: values.length };
  }).filter((bar) => bar.count > 0);

  return (
    <div className="page">
      <header className="studio-bar">
        <button className="quiet" type="button" onClick={onBack}>
          Back
        </button>
        <input
          className="title"
          aria-label="File name"
          value={file.name}
          onChange={(e) => patch({ name: e.target.value })}
        />
        <span className="fine">Saved · {ago(file.updated)}</span>
        <button className={brain ? "solid" : "ghost"} type="button" onClick={() => setBrain((v) => !v)}>
          Brain
        </button>
      </header>
      <div className="toolbar">
        <button className="ghost" type="button" data-on={pane === "doc"} onClick={() => setPane("doc")}>
          Doc
        </button>
        <button className="ghost" type="button" data-on={pane === "sheet"} onClick={() => setPane("sheet")}>
          Sheet
        </button>
        <button className="ghost" type="button" onClick={share}>
          Share
        </button>
        <button className="ghost" type="button" onClick={() => setChart((v) => !v)}>
          Chart
        </button>
        <button className="ghost" type="button" onClick={() => setMenu((v) => !v)}>
          Export
        </button>
        {pane === "doc" ? (
          <button className="ghost" type="button" onClick={() => wrapDoc(docRef.current, file.doc, patch)}>
            Bold
          </button>
        ) : null}
      </div>
      {menu ? (
        <div className="pop export">
          <button type="button" onClick={download}>
            This tab as CSV
          </button>
          <button type="button" onClick={() => window.print()}>
            Print
          </button>
          <p className="fine">An Excel file is not written here. CSV opens in Excel.</p>
        </div>
      ) : null}
      {note ? <p className="fine pad-inline">{note}</p> : null}
      {brain ? (
        <section className="pad">
          <div className={mismatch ? "flag" : "ok"}>
            <strong>{mismatch ? "Contradiction" : ready ? "Draft ready for review" : "Lucien"}</strong>
            <p className="fine">
              {mismatch
                ? `The writing says ${claim?.value}. A3 is ${file.grid.A3 || "empty"}, which is ${result.value}.`
                : ready
                  ? "The sentence matches the sheet. Approval is yours."
                  : "Name a gap in the writing, or leave A3 as a formula, and this panel will compare them."}
            </p>
            {mismatch && result.value !== null ? (
              <button className="solid" type="button" onClick={() => patch({ doc: alignClaim(file.doc, result.value as number) })}>
                Align the brief to {result.value}
              </button>
            ) : null}
            <button className="ghost" type="button" disabled={!ready} onClick={onApprove}>
              {file.approvedAt ? "Approved" : "Approve"}
            </button>
          </div>
          {file.versions.length > 0 ? (
            <div className="versions">
              {file.versions.map((version) => (
                <button key={version.at} className="ghost" type="button" onClick={() => patch({ doc: version.doc, grid: version.grid })}>
                  Version · {ago(version.at)}
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
      {chart ? (
        <section className="pad bars">
          {bars.length === 0 ? <p className="fine">No numbers in this sheet yet.</p> : null}
          {bars.map((bar) => {
            const max = Math.max(1, ...bars.map((item) => Math.abs(item.total)));
            return (
              <div key={bar.col}>
                <span>{bar.col}</span>
                <i style={{ width: `${(Math.abs(bar.total) / max) * 100}%` }} />
                <span>{bar.total}</span>
              </div>
            );
          })}
        </section>
      ) : null}
      {pane === "doc" ? (
        <textarea
          ref={docRef}
          className="doc-body"
          aria-label="Document"
          value={file.doc}
          onChange={(e) => patch({ doc: e.target.value })}
        />
      ) : (
        <Sheet grid={file.grid} active={active} citation={file.citation} onActive={setActive} onGrid={(grid) => patch({ grid })} onCitation={(citation) => patch({ citation })} />
      )}
    </div>
  );
}

function wrapDoc(
  node: HTMLTextAreaElement | null,
  doc: string,
  patch: (partial: { doc: string }) => void,
) {
  if (!node) return;
  const start = node.selectionStart ?? 0;
  const end = node.selectionEnd ?? 0;
  const selected = doc.slice(start, end) || "text";
  const next = `${doc.slice(0, start)}**${selected}**${doc.slice(end)}`;
  patch({ doc: next });
}

function Sheet({
  grid,
  active,
  citation,
  onActive,
  onGrid,
  onCitation,
}: {
  grid: Grid;
  active: string;
  citation: string;
  onActive: (id: string) => void;
  onGrid: (grid: Grid) => void;
  onCitation: (citation: string) => void;
}) {
  return (
    <div className="sheet-screen">
      <label className="formula">
        <span>{active}</span>
        <span>fx</span>
        <input
          aria-label="Formula bar"
          value={grid[active] ?? ""}
          onChange={(e) => onGrid({ ...grid, [active]: e.target.value })}
        />
      </label>
      <label className="formula">
        <span>Citation</span>
        <input aria-label="Citation" value={citation} placeholder="Source for this sheet" onChange={(e) => onCitation(e.target.value)} />
      </label>
      <div className="grid-scroll">
        <table className="sheet">
          <thead>
            <tr>
              <th />
              {COLS.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row}>
                <th>{row}</th>
                {COLS.map((col) => {
                  const id = `${col}${row}`;
                  return (
                    <td key={id} data-on={active === id}>
                      <button type="button" onClick={() => onActive(id)}>
                        {shown(grid, id)}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="fine pad-inline">Sheet1</p>
    </div>
  );
}
