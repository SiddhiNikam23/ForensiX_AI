import { getReport } from "../store";

export default function ReportCard() {
  const saved = getReport();
  const card = saved?.card;
  const go = (p) => { window.location.hash = p; };

  if (!card) {
    return (
      <div className="fx">
        <style>{CSS}</style>
        <div className="fx-empty-page">
          <h1>No report card yet</h1>
          <p className="fx-muted">Analyze an image first and its report card will appear here.</p>
          <button className="fx-btn primary" onClick={() => go("/analyze")}>Analyze an image</button>
        </div>
      </div>
    );
  }

  const { rows, verdict, filename, when } = card;

  return (
    <div className="fx">
      <style>{CSS}</style>

      <section className="fx-hero">
        <div>
          <h1>Report Card</h1>
          <p>A quick, easy-to-read summary of the analysis.</p>
        </div>
        <div className="fx-actions">
          <button className="fx-btn ghost" onClick={() => go("/report")}>Full report</button>
          <button className="fx-btn primary" onClick={() => go("/analyze")}>Analyze another image</button>
        </div>
      </section>

      <div className="fx-cardwrap">
        <aside className={`fx-rcard ${verdict.level}`} aria-label="Report card">
          <div className="fx-rc-top"><span>REPORT CARD</span><em>{filename || "image"}</em></div>
          <div className="fx-rc-verdict">
            <i />
            <div><strong>{verdict.title}</strong><span>{verdict.text}</span></div>
          </div>
          <ul className="fx-rc-list">
            {rows.map(([k, [v, l]]) => (
              <li key={k}><span>{k}</span><b className={l}>{v}</b></li>
            ))}
          </ul>
          <p className="fx-rc-foot">Automated check. These are signs, not proof.</p>
        </aside>
        {when && <p className="fx-rc-when">Checked {when}</p>}
      </div>
    </div>
  );
}

const CSS = `
.fx{--card:#fff;--alt:#f4f6fa;--line:#e1e6ee;--text:#0f1b2d;--muted:#5a6a80;--ok:#15803d;--warn:#b45309;--bad:#b3261e;--info:#3a5a90;--acc:#2563eb;--acc-d:#1d4ed8;
  width:100%;box-sizing:border-box;padding:0 0 70px;color:var(--text);background:var(--alt);min-height:calc(100vh - 68px)}
.fx *{box-sizing:border-box}
.fx h1{font-size:30px;margin:0 0 6px;letter-spacing:-.6px}
.fx .fx-muted{color:var(--muted)}
.fx .ok{--c:var(--ok)}.fx .warn{--c:var(--warn)}.fx .bad{--c:var(--bad)}.fx .info{--c:var(--info)}
.fx-hero{background:linear-gradient(180deg,#0a1a33,#12294d);color:#fff;padding:36px clamp(16px,2vw,40px);display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap}
.fx-hero h1{color:#fff;font-size:clamp(26px,3vw,36px);margin:0 0 4px}
.fx-hero p{color:#c3cee2;margin:0}
.fx-actions{display:flex;gap:10px;flex-wrap:wrap}
.fx-btn{background:#fff;color:var(--text);border:1px solid #c8d1e0;border-radius:10px;padding:11px 18px;font-weight:600;font-family:inherit;font-size:15px;cursor:pointer;transition:background .15s}
.fx-btn:hover{background:var(--alt)}
.fx-btn.primary{background:var(--acc);border-color:var(--acc);color:#fff}
.fx-btn.primary:hover{background:var(--acc-d)}
.fx-btn.ghost{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.35)}
.fx-btn.ghost:hover{background:rgba(255,255,255,.1)}
.fx-empty-page{max-width:520px;margin:120px auto;text-align:center;display:grid;gap:14px;justify-items:center;padding:0 24px}

.fx-cardwrap{display:grid;justify-items:center;gap:14px;padding:48px 16px 0}
.fx-rcard{--c:var(--info);aspect-ratio:1/1;width:min(100%,520px);background:#fff;border:1px solid var(--line);border-top:8px solid var(--c);border-radius:22px;padding:28px 30px;display:flex;flex-direction:column;gap:16px;box-shadow:0 1px 2px rgba(15,27,45,.04),0 18px 48px rgba(15,27,45,.1)}
.fx-rcard.ok{--c:var(--ok)}.fx-rcard.warn{--c:var(--warn)}.fx-rcard.bad{--c:var(--bad)}
.fx-rc-top{display:flex;justify-content:space-between;gap:10px;align-items:center;font-size:13px;font-weight:800;letter-spacing:.12em;color:var(--muted)}
.fx-rc-top em{font-style:normal;font-weight:600;letter-spacing:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:55%}
.fx-rc-verdict{display:flex;gap:14px;align-items:center;padding:16px 18px;border-radius:14px;background:color-mix(in srgb,var(--c) 10%,#fff)}
.fx-rc-verdict i{width:18px;height:18px;border-radius:50%;background:var(--c);flex:none}
.fx-rc-verdict div{display:grid;gap:3px}
.fx-rc-verdict strong{font-size:30px;line-height:1.15;letter-spacing:-.6px;color:var(--c)}
.fx-rc-verdict span{font-size:15px;color:var(--text)}
.fx-rc-list{list-style:none;margin:0;padding:0;display:grid;flex:1;align-content:space-between}
.fx-rc-list li{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--line);font-size:16px}
.fx-rc-list li:last-child{border-bottom:0}
.fx-rc-list li>span{font-weight:500}
.fx-rc-list b{font-size:13px;font-weight:800;padding:4px 12px;border-radius:99px;color:var(--c);background:color-mix(in srgb,var(--c) 12%,#fff);white-space:nowrap}
.fx-rc-foot{margin:0;font-size:12px;color:var(--muted);text-align:center}
.fx-rc-when{margin:0;font-size:13px;color:var(--muted)}
@media(max-width:480px){.fx-rcard{padding:20px}.fx-rc-verdict strong{font-size:24px}.fx-rc-list li{font-size:14px}}
`;