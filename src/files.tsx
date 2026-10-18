import { useMemo, useRef, useState } from "react";
import { ago, type BrainFile, type Kind } from "./model";
import { fromCsv } from "./sheet";
import { Mark } from "./home";

type Scope = "files" | "starred" | "trash";
type Filter = "all" | Kind;

export function Files({
  files,
  scope,
  onMenu,
  onOpen,
  onCreate,
  onImport,
  onStar,
  onTrash,
  onRestore,
}: {
  files: BrainFile[];
  scope: Scope;
  onMenu: () => void;
  onOpen: (id: string) => void;
  onCreate: (kind: Kind, name: string, doc?: string) => void;
  onImport: (name: string, grid: ReturnType<typeof fromCsv>) => void;
  onStar: (id: string) => void;
  onTrash: (id: string) => void;
  onRestore: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<"updated" | "name">("updated");
  const [menu, setMenu] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return files
      .filter((file) => (scope === "trash" ? file.trashed : !file.trashed))
      .filter((file) => (scope === "starred" ? file.starred : true))
      .filter((file) => (filter === "all" ? true : file.kind === filter))
      .filter((file) => (q ? file.name.toLowerCase().includes(q) : true))
      .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : b.updated - a.updated));
  }, [files, scope, filter, query, sort]);

  return (
    <div className="page">
      <header className="studio-bar">
        <button className="quiet icon" type="button" aria-label="Menu" onClick={onMenu}>
          <Mark />
        </button>
        <input
          className="search"
          placeholder="Search files"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search files"
        />
      </header>
      {scope === "files" ? (
        <section className="pad">
          <p className="kicker">Start something new</p>
          <div className="row">
            <button className="ghost" type="button" onClick={() => input.current?.click()}>
              Import CSV
            </button>
            <button className="solid" type="button" onClick={() => onCreate("doc", "Launch brief", undefined)}>
              Create with Brain
            </button>
            <input
              ref={input}
              hidden
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={async (e) => {
                const picked = e.target.files?.[0];
                e.target.value = "";
                if (!picked) return;
                onImport(picked.name.replace(/\.csv$/i, "") || "Imported sheet", fromCsv(await picked.text()));
              }}
            />
          </div>
          <div className="templates">
            <Template title="Blank document" detail="Start fresh" onClick={() => onCreate("doc", "Untitled document", "")} />
            <Template title="Meeting notes" detail="Agenda, notes, actions" onClick={() => onCreate("doc", "Meeting notes", "")} />
            <Template title="Project brief" detail="Goals and scope" onClick={() => onCreate("doc", "Project brief", "")} />
            <Template title="Blank sheet" detail="Numbers first" onClick={() => onCreate("sheet", "Untitled sheet")} />
          </div>
        </section>
      ) : (
        <section className="pad">
          <h2>{scope === "starred" ? "Starred" : "Trash"}</h2>
        </section>
      )}
      <section className="pad">
        <div className="list-head">
          <h2>{scope === "files" ? "My files" : scope === "starred" ? "Starred" : "Trash"}</h2>
          <select aria-label="Type" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
            <option value="all">All types</option>
            <option value="doc">Documents</option>
            <option value="sheet">Spreadsheets</option>
          </select>
          <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as "updated" | "name")}>
            <option value="updated">Last modified</option>
            <option value="name">Name</option>
          </select>
        </div>
        <ul className="file-list">
          {shown.length === 0 ? <li className="fine">Nothing in this list.</li> : null}
          {shown.map((file) => (
            <li key={file.id}>
              <button className="file-main" type="button" onClick={() => onOpen(file.id)}>
                <span className={file.kind === "sheet" ? "badge sheet" : "badge"}>{file.kind === "sheet" ? "Sheet" : "Doc"}</span>
                <span>
                  <strong>{file.name}</strong>
                  <span className="fine">
                    {file.kind === "sheet" ? "Spreadsheet" : "Document"} · edited {ago(file.updated)}
                  </span>
                </span>
              </button>
              <button
                className="quiet icon"
                type="button"
                aria-label={file.starred ? "Unstar" : "Star"}
                onClick={() => onStar(file.id)}
              >
                {file.starred ? "★" : "☆"}
              </button>
              <button className="quiet icon" type="button" aria-label="File actions" onClick={() => setMenu(menu === file.id ? null : file.id)}>
                ···
              </button>
              {menu === file.id ? (
                <div className="pop">
                  <button type="button" onClick={() => onOpen(file.id)}>
                    Open
                  </button>
                  {file.trashed ? (
                    <button type="button" onClick={() => { onRestore(file.id); setMenu(null); }}>
                      Restore
                    </button>
                  ) : (
                    <button type="button" onClick={() => { onTrash(file.id); setMenu(null); }}>
                      Move to trash
                    </button>
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Template({ title, detail, onClick }: { title: string; detail: string; onClick: () => void }) {
  return (
    <button className="template" type="button" onClick={onClick}>
      <strong>{title}</strong>
      <span>{detail}</span>
    </button>
  );
}
