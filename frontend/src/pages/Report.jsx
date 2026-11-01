import { useState, useEffect } from "react";
import { show, kb, toPct, imgSrc } from "../lib";
import { getReport, patchReport } from "../store";

const G = 12;
const sv = (v) => (v !== null && typeof v === "object" ? JSON.stringify(v) : show(v));
const EDITORS = ["photoshop", "lightroom", "gimp", "canva", "snapseed", "picsart", "pixelmator", "affinity", "paint.net", "facetune", "photoscape"];
const AI_TOOLS = ["stable diffusion", "midjourney", "dall-e", "dalle", "firefly", "comfyui", "automatic1111", "novelai", "leonardo", "sdxl"];
const PILL = { ok: "Clear", warn: "Review", bad: "Flagged", info: "Note" };

const parseDT = (s) => {
  const m = String(s || "").match(/(\d{4})[:-](\d{2})[:-](\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  return m ? new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : null;
};

function useHotspot(src) {
  const [h, setH] = useState(null);
  useEffect(() => {
    setH(null);
    if (!src) return;
    const im = new Image();
    im.onload = () => {
      try {
        const B = 20, S = G * B;
        const c = document.createElement("canvas");
        c.width = S; c.height = S;
        const x = c.getContext("2d", { willReadFrequently: true });
        x.drawImage(im, 0, 0, S, S);
        const d = x.getImageData(0, 0, S, S).data;
        const sum = Array(G * G).fill(0);
        for (let y = 0; y < S; y++)
          for (let px = 0; px < S; px++) {
            const i = (y * S + px) * 4;
            sum[Math.floor(y / B) * G + Math.floor(px / B)] += (d[i] + d[i + 1] + d[i + 2]) / 3;
          }
        const avg = sum.map((v) => v / (B * B));
        const max = Math.max(...avg);
        const mean = avg.reduce((a, b) => a + b, 0) / avg.length;
        setH({ cells: avg.map((v) => (max ? v / max : 0)), top: avg.indexOf(max), ratio: mean ? max / mean : 0 });
      } catch (e) { setH(null); }
    };
    im.src = src;
  }, [src]);
  return h;
}

function Gauge({ pct }) {
  const angle = -90 + (Math.min(Math.max(pct, 0), 100) / 100) * 180;
  return (
    <svg viewBox="0 0 200 118" className="fx-gauge" role="img" aria-label={`AI probability ${pct.toFixed(0)} percent`}>
      <defs>
        <linearGradient id="fxg" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#4fb67a" />
          <stop offset="0.5" stopColor="#e8c24a" />
          <stop offset="1" stopColor="#e0793a" />
        </linearGradient>
      </defs>
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="url(#fxg)" strokeWidth="16" strokeLinecap="round" />
      <g transform={`rotate(${angle} 100 100)`}>
        <line x1="100" y1="100" x2="100" y2="34" stroke="#0f1b2d" strokeWidth="3" strokeLinecap="round" />
        <circle cx="100" cy="100" r="7" fill="#0f1b2d" />
      </g>
      <text x="14" y="114" fill="#5a6a80" fontSize="10">REAL</text>
      <text x="186" y="114" fill="#5a6a80" fontSize="10" textAnchor="end">AI</text>
    </svg>
  );
}

const Pill = ({ level }) => <span className={`fx-pill ${level}`}>{PILL[level]}</span>;
const Tile = ({ k, v }) => (
  <div className="fx-tile"><span>{k}</span><strong>{sv(v)}</strong></div>
);
const Rows = ({ rows }) =>
  rows && rows.length ? (
    <div className="fx-rows">
      {rows.map(([k, v], i) => (<div key={i}><span>{k}</span><b>{sv(v)}</b></div>))}
    </div>
  ) : null;
const DTable = ({ rows, head }) =>
  rows && rows.length ? (
    <table className="d-tbl">
      {head && <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>}
      <tbody>
        {rows.map((r, i) => (<tr key={i}>{r.map((c, j) => <td key={j}>{sv(c)}</td>)}</tr>))}
      </tbody>
    </table>
  ) : null;
const Box = ({ n, title, level, id, children }) => (
  <article className="fx-box" id={id}>
    <header><span className="fx-num">{n}</span><h2>{title}</h2><Pill level={level} /></header>
    {children}
  </article>
);

export default function Report() {
  const saved = getReport();
  const result = saved?.result;
  const preview = saved?.preview;
  const when = saved?.when || "";
  const cmp = saved?.compare;
  const cmpError = saved?.compareError;
  const cmpRegions = cmp?.regions || [];
  const cmpFound = cmpRegions.length > 0;
  const [tech, setTech] = useState(false);

  // ---------- derived ----------
  const ai = result?.ai_detection;
  const aiPct = toPct(ai?.ai_probability) || 0;
  const aiLevel = !ai ? "info" : aiPct >= 65 ? "bad" : aiPct >= 35 ? "warn" : "ok";
  const aiLabel = aiPct >= 90 ? "AI-generated" : aiPct >= 65 ? "Likely AI-generated" : aiPct >= 35 ? "Inconclusive" : aiPct >= 10 ? "Likely a real photo" : "Real photo";
  const aiPlain = aiPct >= 90 ? "This image was very likely created by AI."
    : aiPct >= 65 ? "This image is probably AI-generated, but we are not certain."
    : aiPct >= 35 ? "We cannot tell. Treat this image with caution."
    : aiPct >= 10 ? "This looks like a real photo, but we are not fully certain."
    : "This looks like a genuine photo.";

  const manip = result?.manipulation;
  const manipFlag = !!manip?.manipulation_detected;

  const elaSrc = imgSrc(result?.ela?.ela_image);
  const hs = useHotspot(elaSrc);
  let region = "", strength = "";
  if (hs) {
    const r = Math.floor(hs.top / G), c = hs.top % G;
    const v = r < 4 ? "top" : r < 8 ? "middle" : "bottom";
    const hz = c < 4 ? "left" : c < 8 ? "center" : "right";
    region = v === "middle" && hz === "center" ? "center" : `${v}-${hz}`;
    strength = hs.ratio >= 2.5 ? "Strong" : hs.ratio >= 1.8 ? "Moderate" : "Weak (fairly uniform)";
  }

  const meta = result?.metadata;
  const metaEntries = Object.entries(meta?.metadata && typeof meta.metadata === "object" ? meta.metadata : {});
  const mget = (re) => metaEntries.find(([k]) => re.test(k));
  const pickMeta = (re) => { const h = mget(re); return h && sv(h[1]) !== "—" ? sv(h[1]) : "Not found"; };
  const software = mget(/^software$/i)?.[1];
  const textBlob = metaEntries
    .filter(([k]) => /software|comment|description|parameters|generator|creator|prompt|producer/i.test(k))
    .map(([, v]) => sv(v)).join(" ").toLowerCase();
  const aiTool = AI_TOOLS.find((t) => textBlob.includes(t));
  const editor = EDITORS.find((t) => String(software || "").toLowerCase().includes(t));
  const dO = parseDT(mget(/datetimeoriginal/i)?.[1]);
  const dM = parseDT(mget(/^datetime$/i)?.[1]);
  const dateGap = !!(dO && dM && Math.abs(dM - dO) > 60000);
  const metaChecks = [
    [!!meta?.metadata_found, "Camera data present", meta?.metadata_found ? "Metadata was found in the file." : "No metadata. Common for screenshots, social media and AI images."],
    [!aiTool, "No AI-tool trace", aiTool ? `Metadata mentions "${aiTool}".` : "No AI generator mentioned."],
    [!editor, "No editing software", editor ? `Saved by ${sv(software)}.` : "No editing software recorded."],
    [!dateGap, "Dates consistent", dateGap ? "File was modified after it was taken." : "Capture and modified dates agree (or are not recorded)."],
  ];
  const metaLevel = !meta ? "info" : aiTool ? "bad" : editor || dateGap ? "warn" : meta.metadata_found ? "ok" : "info";

  // ---- manipulation tests (copy-paste, compression, rotation) ----
  const compAvail = !!hs;
  const compDetected = compAvail && hs.ratio >= 1.8;
  const rotRaw = mget(/orientation/i)?.[1];
  const rotVal = rotRaw !== undefined && rotRaw !== null ? sv(rotRaw) : null;
  const rotDetected = rotVal !== null && !/^(1|horizontal.*|normal.*|top-left)$/i.test(rotVal.trim());
  const manipAny = manipFlag || compDetected || rotDetected || cmpFound;
  const manipLevel = !manip ? "info" : (manipFlag || cmpFound) ? "bad" : (compDetected || rotDetected) ? "warn" : "ok";
  const mTests = [
    {
      key: "copy", title: "Copy-paste (copy-move)", avail: !!manip, detected: manipFlag, level: manipFlag ? "bad" : "ok",
      info: !manip ? "No copy-move result was returned."
        : manipFlag ? "Parts of the image appear to be copied and pasted elsewhere in the same image."
        : "No duplicated regions were found in the image.",
      rows: manip ? [["Key points found", manip.keypoints_detected], ["Suspicious matches", manip.suspicious_matches]] : [],
    },
    {
      key: "comp", title: "Compression", avail: compAvail, detected: compDetected, level: !compAvail ? "info" : compDetected ? "warn" : "ok",
      info: !compAvail ? "No compression (ELA) result was available."
        : compDetected ? `Parts of the image recompress differently from the rest. Strongest in the ${region} area.`
        : "Compression is fairly uniform across the image.",
      rows: compAvail ? [["Average error", result.ela?.mean_error], ["Highest error", result.ela?.max_error], ["Strongest area", region], ["Intensity", `${strength} (${hs.ratio.toFixed(1)}×)`]] : [],
    },
    {
      key: "rot", title: "Rotation (EXIF)", avail: true, detected: rotDetected, level: rotDetected ? "warn" : "ok",
      info: (rotDetected ? `The EXIF orientation tag is "${rotVal}", so the image was rotated or is stored rotated.`
        : rotVal !== null ? "The EXIF orientation tag is normal, so no rotation was found."
        : "No orientation tag was found in the metadata, so no rotation was found.")
        ,
      note: "Limitation: this test only reads the metadata tag. Flips or rotations made on the picture itself cannot be detected.",
      rows: [["Orientation tag", rotVal ?? "Not found"], ["Dimensions", result?.width && result?.height ? `${result.width} × ${result.height}px` : "—"]],
    },
  ];
  // ---- simple report card (plain language) ----
  const cardRows = [
    ["AI-made picture", ai ? (aiPct >= 65 ? ["Likely", "bad"] : aiPct >= 35 ? ["Not sure", "warn"] : ["No", "ok"]) : ["Unknown", "info"]],
    ["Copy-paste edit", manip ? (manipFlag ? ["Found", "bad"] : ["Not found", "ok"]) : ["Unknown", "info"]],
    ...(cmp ? [["Removed / added parts", cmpFound ? [`${cmpRegions.length} found`, "bad"] : ["Not found", "ok"]]] : []),
    ["Compression changes", compAvail ? (compDetected ? ["Found", "warn"] : ["Not found", "ok"]) : ["Unknown", "info"]],
    ["Rotated", rotDetected ? ["Yes", "warn"] : ["No", "ok"]],
    ["Camera info (metadata)", meta ? (meta.metadata_found ? ["Present", "ok"] : ["Missing", "info"]) : ["Unknown", "info"]],
  ];
  const cardVerdict = aiLevel === "bad" ? { level: "bad", title: "Likely AI-made", text: "This picture looks like it was created by AI." }
    : (manipFlag || cmpFound) ? { level: "bad", title: "Edited", text: cmpFound ? "Parts of this photo were removed or added." : "Parts of this photo were copied and pasted." }
    : (compDetected || rotDetected || aiLevel === "warn") ? { level: "warn", title: "Needs a check", text: "Some signs were found. Look at the details." }
    : { level: "ok", title: "No signs of editing", text: "We did not find clear signs of editing." };
  const levels = [aiLevel, manipLevel, metaLevel];
  const overall = levels.includes("bad") ? ["bad", "High concern", "At least one check raised a strong warning."]
    : levels.includes("warn") ? ["warn", "Review recommended", "Some checks found details worth a closer look."]
    : ["ok", "No strong signs found", "None of the checks raised a strong warning."];

  const jump = (id) => (e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); };

  const LV = { ok: "No adverse indication", warn: "Review recommended", bad: "Adverse indication", info: "Informational" };
  const caseId = result ? `FX-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(result.sha256 || "").slice(0, 8).toUpperCase()}` : "";
  const printReport = () => { const t = document.title; document.title = caseId; window.print(); setTimeout(() => { document.title = t; }, 800); };
  const concl = levels.includes("bad")
    ? "One or more examination modules returned an adverse indication. The image should not be treated as an unaltered, authentic photograph without further examination by a qualified forensic analyst."
    : levels.includes("warn")
    ? "Some modules returned results that warrant closer review. These results are indicators only and do not establish alteration or AI generation."
    : "No module returned a strong adverse indication. This does not guarantee that the image is authentic.";

  const downloadJson = () => {
    const txt = JSON.stringify(result, (k, v) => (typeof v === "string" && v.length > 1000 ? "[image omitted]" : v), 2);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([txt], { type: "application/json" }));
    a.download = "forensic-report.json";
    a.click();
  };


  const cardKey = JSON.stringify([cardRows, cardVerdict]);
  useEffect(() => {
    if (!result) return;
    patchReport({ card: { rows: cardRows, verdict: cardVerdict, filename: result.filename, when, caseId } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardKey, caseId]);
  const goAnalyze = () => { window.location.hash = "/analyze"; };

  if (!result) {
    return (
      <div className="fx">
        <style>{CSS}</style>
        <div className="fx-empty-page">
          <h1>No report yet</h1>
          <p className="fx-muted">Upload an image first and the analysis will appear here.</p>
          <button className="fx-btn primary" onClick={goAnalyze}>Analyze an image</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fx">
      <style>{CSS}</style>

      <section className="fx-hero fx-noprint">
        <div>
          <h1>Forensic Analysis Report</h1>
          <p>Generated {when} · {show(result.filename)}</p>
        </div>
        <div className="fx-actions">
          <button className="fx-btn ghost" onClick={() => { window.location.hash = "/card"; }}>Report card</button>
          <button className="fx-btn ghost" onClick={goAnalyze}>Analyze another image</button>
          <button className="fx-btn ghost" onClick={() => setTech(!tech)}>{tech ? "Simple view" : "Technical view"}</button>
          <button className="fx-btn ghost" onClick={downloadJson}>Download JSON</button>
          <button className="fx-btn primary" onClick={printReport}>Download report (PDF)</button>
        </div>
      </section>

      <section className="fx-report">
        <section className={`fx-overview ${overall[0]}`} aria-label="Executive summary">
          <div className="fx-overview-main">
            <div className="fx-eyebrow"><span className="fx-live-dot" /> FORENSIX AI · IMAGE INTEGRITY SUMMARY</div>
            <div className="fx-overview-heading">
              <div>
                <h2>Image assessment</h2>
                <p className="fx-overview-sub">{overall[2]}</p>
              </div>
              <span className={`fx-status-badge ${overall[0]}`}><i />{overall[1]}</span>
            </div>
            <div className="fx-summary-metrics">
              <div className="fx-summary-metric">
                <span className="fx-metric-icon">AI</span>
                <div><small>AI-generated estimate</small><strong>{ai ? `${aiPct.toFixed(1)}%` : "Not available"}</strong><span>{ai ? aiLabel : "No AI result returned"}</span></div>
              </div>
              <div className="fx-summary-metric">
                <span className="fx-metric-icon real">✓</span>
                <div><small>Real-photo estimate</small><strong>{ai ? `${(100 - aiPct).toFixed(1)}%` : "Not available"}</strong><span>Complement of AI score</span></div>
              </div>
              <div className="fx-summary-metric">
                <span className={`fx-metric-icon ${manipAny ? "alert" : "edit"}`}>⌁</span>
                <div><small>Manipulation indicators</small><strong>{manip ? (manipAny ? "Detected" : "Not detected") : "Not available"}</strong><span>{manip ? (manipAny ? [cmpFound && "removed/added content", manipFlag && "copy-paste", compDetected && "compression", rotDetected && "rotation"].filter(Boolean).join(", ") : "Copy-paste, compression, rotation") : "No manipulation result returned"}</span></div>
              </div>
              <div className="fx-summary-metric">
                <span className={`fx-metric-icon ${metaLevel === "bad" || metaLevel === "warn" ? "alert" : "meta"}`}>⌕</span>
                <div><small>File metadata</small><strong>{meta ? (meta.metadata_found ? "Found" : "Missing") : "Not available"}</strong><span>{meta ? `${show(meta.metadata_count ?? 0)} field(s) reported` : "No metadata result returned"}</span></div>
              </div>
            </div>
          </div>
          <div className="fx-overview-foot">
            <span><b>File</b> {show(result.filename)}</span>
            <span><b>Examined</b> {when || "Time not recorded"}</span>
            <span><b>Report ID</b> {caseId}</span>
          </div>
        </section>

        <div className="fx-section-intro">
          <div><span className="fx-section-kicker">EXAMINATION RESULTS</span><h2>Evidence and analysis</h2></div>
          <p>Start with the summary, then review the visual evidence and technical checks below.</p>
        </div>
        <div className="fx-grid3">
          <aside className="fx-card fx-ev">
            <h3>Evidence</h3>
            {preview && <img className="fx-thumb" src={preview} alt="Analyzed" />}
            <Rows rows={[
              ["File name", result.filename],
              ["Format", result.format],
              ["Dimensions", result.width && result.height ? `${result.width} × ${result.height}px` : "—"],
              ["File size", kb(result.file_size)],
            ]} />
            <h4>SHA-256 fingerprint</h4>
            <code className="fx-hash">{show(result.sha256)}</code>
          </aside>
          {meta && (
            <aside className="fx-card fx-meta" id="box3">
              <div className="fx-metasec">
                <div className="fx-mhead"><h3>Metadata Analysis (EXIF)</h3><Pill level={metaLevel} /></div>
              <p className="fx-muted fx-small">Hidden information stored inside the file. Missing metadata is common and is not proof of editing.</p>
              <Rows rows={[
                  ["Camera make", pickMeta(/^make$/i)],
                  ["Camera model", pickMeta(/^model$/i)],
                  ["Date taken", pickMeta(/datetimeoriginal/i) !== "Not found" ? pickMeta(/datetimeoriginal/i) : pickMeta(/^datetime$/i)],
                  ["GPS location", pickMeta(/gps/i)],
                  ["Software", pickMeta(/^software$/i)],
                  ["Color space", pickMeta(/colou?r.?space/i)],
                  ["EXIF status", meta.metadata_found ? `Present (${show(meta.metadata_count)})` : "Missing"],
                ]} />
              <h4>Consistency checks</h4>
              <ul className="fx-checks">
                {metaChecks.map(([ok, t, d], i) => (
                  <li key={i} className={ok ? "ok" : i === 0 ? "info" : "warn"}>
                    <i>{ok ? "✓" : "!"}</i><div><b>{t}</b><span>{d}</span></div>
                  </li>
                ))}
              </ul>
              {tech && (
                <><h4>All metadata fields ({metaEntries.length})</h4><div className="fx-scroll"><Rows rows={metaEntries} /></div></>
              )}
              </div>
            </aside>
          )}
          {/* BOX 1 */}
          {ai && (
            <Box n="1" title="AI-Generated Image Detection" level={aiLevel} id="box1">
              <Gauge pct={aiPct} />
              <div className={`fx-verdict ${aiLevel}`}>{aiLabel}</div>
              <p className="fx-plain">{aiPlain}</p>
              <div className="fx-split">
                <div style={{ width: `${100 - aiPct}%` }} className="r">Real {(100 - aiPct).toFixed(1)}%</div>
                <div style={{ width: `${aiPct}%` }} className="a">AI {aiPct.toFixed(1)}%</div>
              </div>
              <div className="fx-tiles">
                <Tile k="AI probability" v={`${aiPct.toFixed(1)}%`} />
                <Tile k="Model confidence" v={ai.confidence ?? `${Math.max(aiPct, 100 - aiPct).toFixed(1)}%`} />
              </div>
              {Array.isArray(ai.reasons) && ai.reasons.length > 0 && (
                <><h4>Why this result</h4><ul className="fx-list">{ai.reasons.map((r, i) => <li key={i}>{show(r)}</li>)}</ul></>
              )}
              {Array.isArray(ai.limitations) && ai.limitations.length > 0 && (
                <><h4>Limits of this check</h4><ul className="fx-list fx-muted">{ai.limitations.map((r, i) => <li key={i}>{show(r)}</li>)}</ul></>
              )}
              {tech && (
                <><h4>Raw model output</h4><Rows rows={Object.entries(ai).filter(([, v]) => typeof v !== "object")} /></>
              )}
            </Box>
          )}

          {/* BOX 2 */}
          <Box n="2" title="Manipulation Detection" level={manipLevel} id="box2">
            <div className="fx-vgrid">
              {mTests.map((t) => (
                <div key={t.key} className={`fx-verd ${t.level}`}>
                  <div className="fx-vtop">
                    <h4>{t.title}</h4>
                    <span className="fx-vbadge">{!t.avail ? "Not available" : t.detected ? "Detected" : "Not detected"}</span>
                  </div>
                  <p className="fx-vinfo">{t.info}</p>
                  {t.note && <div className="fx-vnote"><b>!</b><span>{t.note}</span></div>}
                  <Rows rows={t.rows} />
                </div>
              ))}
            </div>

            <div className="fx-mgrid">
              {elaSrc && (
                <div className="fx-mp">
                  <h4>Hotspot map</h4>
                  <div className="fx-frame">
                    <div className="fx-hs">
                      {preview && <img src={preview} alt="Original with hotspot" />}
                      {hs && (
                        <div className="fx-hsgrid">
                          {hs.cells.map((v, i) => (
                            <i key={i} className={i === hs.top ? "top" : ""}
                               style={{ background: `rgba(239,68,68,${v > 0.4 ? (v - 0.4) * 0.9 : 0})` }} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="fx-muted fx-small fx-foot">White box = strongest area</p>
                </div>
              )}
              {elaSrc && (
                <div className="fx-mp">
                  <h4>ELA map</h4>
                  <div className="fx-frame"><img src={elaSrc} alt="Error level map" /></div>
                  <p className="fx-muted fx-small fx-foot">Brighter = more compression difference. Sharp edges and text also glow, so treat this as a place to look, not proof.</p>
                </div>
              )}
              {result.noise && (
                <div className="fx-mp">
                  <h4>Noise check</h4>
                  <Rows rows={[
                    ["Average noise", result.noise.mean_noise],
                    ["Variance", result.noise.noise_variance],
                    ["Local variation", result.noise.local_noise_std],
                    ["Blocks checked", result.noise.blocks_analyzed],
                  ]} />
                  <p className="fx-muted fx-small fx-foot">Real photos have steady grain. Pasted areas often differ.</p>
                </div>
              )}
            </div>
            {tech && manip && (
              <><h4>Raw manipulation output</h4><Rows rows={Object.entries(manip).filter(([, v]) => typeof v !== "object")} /></>
            )}
          </Box>

          {(cmp || cmpError) && (
            <Box n="4" title="Original Comparison" level={cmp ? (cmpFound ? "bad" : "ok") : "info"} id="box4">
              {cmpError && <div className="fx-callout bad">{cmpError}</div>}
              {cmp && (
                <>
                  <div className={`fx-callout ${cmpFound ? "bad" : "ok"}`}>
                    {cmpFound
                      ? `${cmpRegions.length} changed region(s) found compared with the original: ${cmp.summary.removed} removed, ${cmp.summary.added} added${cmp.summary.changed ? `, ${cmp.summary.changed} otherwise changed` : ""}.`
                      : "No removed or added content was found compared with the original."}
                  </div>
                  <div className="fx-cmpimgs">
                    <figure>
                      <div className="fx-frame tall"><img src={cmp.original_overlay} alt="Original with marked regions" /></div>
                      <figcaption>Original photo (marked)</figcaption>
                    </figure>
                    <figure>
                      <div className="fx-frame tall"><img src={cmp.edited_overlay} alt="Submitted image with marked regions" /></div>
                      <figcaption>Submitted image (same places marked)</figcaption>
                    </figure>
                  </div>
                  {cmpFound && (
                    <table className="fx-cmptbl">
                      <thead><tr><th>#</th><th>Change</th><th>Location</th><th>Size</th><th>What it means</th></tr></thead>
                      <tbody>
                        {cmpRegions.map((g) => (
                          <tr key={g.id}>
                            <td>{g.id}</td>
                            <td><span className={`fx-vbadge fx-t-${g.type}`}>{g.type === "removed" ? "Removed" : g.type === "added" ? "Added" : "Changed"}</span></td>
                            <td>{g.location}</td>
                            <td>{g.area_pct}% of image</td>
                            <td>{g.type === "removed" ? "Content in the original is missing or smoothed over here."
                              : g.type === "added" ? "New content appears here that is not in the original."
                              : "This area looks different from the original."}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}
            </Box>
          )}

        </div>

        <section className="fx-probability-panel" aria-label="Final probability breakdown">
          <div className="fx-probability-heading">
            <div><span className="fx-section-kicker">FINAL RESULT</span><h2>What do these results mean?</h2><p>Percentages below come from the AI detector. Manipulation is reported separately because the current analysis does not necessarily calculate a manipulation probability.</p></div>
            <span className={`fx-status-badge ${overall[0]}`}><i />{overall[1]}</span>
          </div>
          {ai ? (
            <div className="fx-probability-grid">
              <article className="fx-prob-card fx-prob-ai">
                <div className="fx-prob-card-top"><span className="fx-prob-symbol">AI</span><span>AI-generated</span></div>
                <strong className="fx-prob-number">{aiPct.toFixed(1)}<small>%</small></strong>
                <div className="fx-prob-track"><span style={{width:`${aiPct}%`}} /></div>
                <p>{aiPct >= 65 ? "The detector leans toward AI-generated." : aiPct >= 35 ? "The result is uncertain; review the evidence." : "The detector leans away from AI generation."}</p>
              </article>
              <article className="fx-prob-card fx-prob-real">
                <div className="fx-prob-card-top"><span className="fx-prob-symbol">✓</span><span>Real-photo estimate</span></div>
                <strong className="fx-prob-number">{(100-aiPct).toFixed(1)}<small>%</small></strong>
                <div className="fx-prob-track"><span style={{width:`${100-aiPct}%`}} /></div>
                <p>This is the complementary score from the same binary classifier, not independent proof of authenticity.</p>
              </article>
              <article className="fx-prob-card fx-prob-manip">
                <div className="fx-prob-card-top"><span className="fx-prob-symbol">⌁</span><span>Manipulation indicators</span></div>
                <strong className="fx-prob-word">{manip ? (manipFlag ? "Flagged" : "Not flagged") : "Unavailable"}</strong>
                <div className="fx-prob-track neutral"><span style={{width:manip ? (manipFlag ? "100%" : "12%") : "0%"}} /></div>
                <p>{manip ? (manipFlag ? "Copy-move indicators were detected. This is not a manipulation probability." : "No copy-move regions were flagged. Other forms of editing may still be present.") : "The backend did not return a manipulation result."}</p>
              </article>
            </div>
          ) : (
            <div className="fx-no-score">AI probability is unavailable because the detector did not return a result for this image.</div>
          )}
          <div className="fx-final-note"><span>ⓘ</span><p><b>Important:</b> AI generation and image manipulation are different checks. A photo can be real but edited, or AI-generated without obvious editing traces. These automated indicators are estimates—not legal proof or a guarantee of authenticity.</p></div>
        </section>
        <p className="fx-disc">Automated forensic indicators only. Review the underlying evidence before making decisions about authenticity.</p>
      </section>

      {/* ================= FORMAL PRINT DOCUMENT (visible only when printing) ================= */}
      <div className="fx-doc">
        <div className="d-foot">Report No. {caseId} · CONFIDENTIAL · Automated forensic analysis, not a certified expert opinion</div>

        <div className="d-head">
          <div className="d-org">FORENSIX AI</div>
          <h1>Digital Image Forensic Examination Report</h1>
        </div>

        <table className="d-meta"><tbody>
          <tr><td>Report No.</td><td>{caseId}</td><td>Date of report</td><td>{when}</td></tr>
          <tr><td>Examiner</td><td>ForensiX AI v1.0.0 (automated)</td><td>Classification</td><td>Confidential</td></tr>
        </tbody></table>

        <h2>1. Subject of Examination</h2>
        <DTable rows={[
          ["File name", result.filename],
          ["File format", result.format],
          ["Dimensions", result.width && result.height ? `${result.width} × ${result.height} px` : "—"],
          ["File size", kb(result.file_size)],
          ["SHA-256 hash", result.sha256],
        ]} />
        <p className="d-note">The SHA-256 value identifies the exact file examined. Any change to the file, even one pixel, produces a different value.</p>

        <h2>2. Executive Summary</h2>
        <p><b>Overall assessment: {overall[1]}.</b> {overall[2]}</p>
        <DTable head={["Module", "Finding", "Status"]} rows={[
          ["1. AI-generated image detection", ai ? `${aiLabel} (${aiPct.toFixed(1)}% AI probability)` : "Not available", LV[aiLevel]],
          ["2. Manipulation detection", manip ? (manipFlag ? "Duplicated regions detected" : "No duplicated regions detected") : "Not available", LV[manipLevel]],
          ["3. Metadata analysis", meta ? (meta.metadata_found ? `${show(meta.metadata_count)} metadata fields found` : "No metadata found") : "Not available", LV[metaLevel]],
        ]} />

        <h2>3. Scope and Methodology</h2>
        <ul>
          <li><b>AI detection:</b> a trained neural-network classifier estimates the probability that the image was generated by AI.</li>
          <li><b>Manipulation detection:</b> copy-move analysis (feature matching), Error Level Analysis (compression differences) and noise-pattern analysis.</li>
          <li><b>Metadata analysis:</b> inspection of embedded EXIF data for camera details, dates, software and internal consistency.</li>
        </ul>

        <div className="d-break" />
        <h2>4. Findings</h2>

        <h3>4.1 AI-Generated Image Detection</h3>
        {ai ? (
          <>
            <DTable rows={[
              ["Classification", aiLabel],
              ["AI probability", `${aiPct.toFixed(1)}%`],
              ["Real probability", `${(100 - aiPct).toFixed(1)}%`],
              ["Model confidence", ai.confidence ?? `${Math.max(aiPct, 100 - aiPct).toFixed(1)}%`],
            ]} />
            <p>{aiPlain}</p>
            {Array.isArray(ai.reasons) && ai.reasons.length > 0 && (<><p className="d-lbl">Basis of result</p><ul>{ai.reasons.map((r, i) => <li key={i}>{show(r)}</li>)}</ul></>)}
            {Array.isArray(ai.limitations) && ai.limitations.length > 0 && (<><p className="d-lbl">Limitations</p><ul>{ai.limitations.map((r, i) => <li key={i}>{show(r)}</li>)}</ul></>)}
          </>
        ) : <p>Not available.</p>}

        <h3>4.2 Manipulation Detection</h3>
        {cmpFound && (<><p><b>Comparison with the original photo:</b> {cmpRegions.length} changed region(s) were found.</p>
          <DTable head={["#", "Change", "Location", "Size"]} rows={cmpRegions.map((g) => [g.id, g.type, g.location, `${g.area_pct}% of image`])} /></>)}
        <DTable head={["Test", "Result", "Basis"]} rows={mTests.map((t) => [t.title, !t.avail ? "Not available" : t.detected ? "Detected" : "Not detected", t.info + (t.note ? " " + t.note : "")])} />
        {manip && (
          <>
            <p><b>Copy-move analysis:</b> {manipFlag ? "Regions of the image appear to have been copied and pasted elsewhere in the same image." : "No copied regions were detected."}</p>
            <DTable rows={[["Key points detected", manip.keypoints_detected], ["Suspicious matches", manip.suspicious_matches]]} />
          </>
        )}
        {result.ela && (
          <>
            <p><b>Error Level Analysis (compression):</b> areas that recompress differently from the rest of the image may indicate editing.</p>
            <DTable rows={[["Mean error", result.ela.mean_error], ["Maximum error", result.ela.max_error]]} />
          </>
        )}
        {result.noise && (
          <>
            <p><b>Noise analysis:</b> an unedited photograph normally shows consistent sensor noise across the frame.</p>
            <DTable rows={[
              ["Mean noise", result.noise.mean_noise], ["Noise variance", result.noise.noise_variance],
              ["Local noise deviation", result.noise.local_noise_std], ["Blocks analysed", result.noise.blocks_analyzed],
            ]} />
          </>
        )}
        {elaSrc && (
          <div className="d-figs">
            <figure><img src={preview} alt="" /><figcaption>Exhibit A: Original image</figcaption></figure>
            <figure><img src={elaSrc} alt="" /><figcaption>Exhibit B: Error Level Analysis map</figcaption></figure>
            <figure>
              <div className="fx-hs">
                <img src={preview} alt="" />
                {hs && (
                  <div className="fx-hsgrid">
                    {hs.cells.map((v, i) => (
                      <i key={i} className={i === hs.top ? "top" : ""} style={{ background: `rgba(220,38,38,${v > 0.4 ? (v - 0.4) * 0.9 : 0})` }} />
                    ))}
                  </div>
                )}
              </div>
              <figcaption>Exhibit C: Hotspot map (outlined cell = strongest signal)</figcaption>
            </figure>
          </div>
        )}
        {hs && (
          <p>The strongest compression-difference signal is located in the <b>{region}</b> area of the image, with <b>{strength.toLowerCase()}</b> intensity ({hs.ratio.toFixed(1)}× the image average). Sharp edges and text also produce high ELA values, so this indicates where to look, not proof of editing.</p>
        )}

        <h3>4.3 Metadata Analysis</h3>
        {meta ? (
          <>
            <DTable rows={[
              ["Camera make", pickMeta(/^make$/i)], ["Camera model", pickMeta(/^model$/i)],
              ["Date taken", pickMeta(/datetimeoriginal/i) !== "Not found" ? pickMeta(/datetimeoriginal/i) : pickMeta(/^datetime$/i)],
              ["GPS location", pickMeta(/gps/i)], ["Software", pickMeta(/^software$/i)],
              ["Color space", pickMeta(/colou?r.?space/i)], ["EXIF status", meta.metadata_found ? `Present (${show(meta.metadata_count)} fields)` : "Missing"],
            ]} />
            <p className="d-lbl">Consistency checks</p>
            <DTable head={["Check", "Result", "Detail"]} rows={metaChecks.map(([ok, t, d], i) => [t, ok ? "Pass" : i === 0 ? "Note" : "Flag", d])} />
          </>
        ) : <p>Not available.</p>}

        <h2>5. Conclusion</h2>
        <p>{concl}</p>

        <h2>6. Limitations and Disclaimer</h2>
        <ul>
          <li>This report is produced by automated analysis. Results are technical indicators, not legal proof that an image is authentic, edited or AI-generated.</li>
          <li>Missing metadata is common for screenshots, messaging apps and social media, and does not prove editing. Present metadata can be altered.</li>
          <li>Error Level Analysis and noise analysis can produce false positives on resized, re-saved or heavily compressed images.</li>
          <li>AI detection accuracy depends on the training data of the model and may be lower for new generators.</li>
          <li>For legal or evidentiary use, findings should be verified by a qualified forensic examiner.</li>
        </ul>

        <h2>7. Certification</h2>
        <div className="d-sign">
          <div><span /> Reviewed by (name and designation)</div>
          <div><span /> Signature</div>
          <div><span /> Date</div>
        </div>

        <div className="d-break" />
        <h2>Appendix A: Complete Metadata Listing</h2>
        {metaEntries.length > 0 ? <DTable head={["Field", "Value"]} rows={metaEntries} /> : <p>No metadata fields were found in the file.</p>}
      </div>
    </div>
  );
}

const CSS = `
.fx{--card:#fff;--card2:#f4f6fa;--alt:#f4f6fa;--line:#e1e6ee;--text:#0f1b2d;--muted:#5a6a80;--ok:#15803d;--warn:#b45309;--bad:#b3261e;--info:#3a5a90;--acc:#2563eb;--acc-d:#1d4ed8;
  width:100%;box-sizing:border-box;padding:0 0 70px;color:var(--text);background:var(--alt);min-height:calc(100vh - 68px)}
.fx *{box-sizing:border-box}
.fx h1{font-size:30px;margin:0 0 6px;letter-spacing:-.6px}.fx h2{font-size:18px;margin:0;flex:1}.fx h3{margin:0 0 12px;font-size:16px}
.fx h4{margin:20px 0 8px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.fx .fx-muted{color:var(--muted)}.fx .fx-small{font-size:13px}

.fx-hero{background:linear-gradient(180deg,#0a1a33,#12294d);color:#fff;padding:36px 3vw;display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap}
.fx-hero h1{color:#fff;font-size:clamp(26px,3vw,36px);margin:0 0 4px}
.fx-hero p{color:#c3cee2;margin:0}
.fx-actions{display:flex;gap:10px;flex-wrap:wrap}

.fx-report{width:100%;padding:32px 3vw 0}
.fx-empty-page{max-width:520px;margin:120px auto;text-align:center;display:grid;gap:14px;justify-items:center;padding:0 24px}

.fx-btn{background:#fff;color:var(--text);border:1px solid #c8d1e0;border-radius:10px;padding:11px 18px;font-weight:600;font-family:inherit;font-size:15px;cursor:pointer;transition:background .15s}
.fx-btn:hover{background:var(--alt)}
.fx-btn.primary{background:var(--acc);border-color:var(--acc);color:#fff}
.fx-btn.primary:hover{background:var(--acc-d)}
.fx-btn.ghost{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.35)}
.fx-btn.ghost:hover{background:rgba(255,255,255,.1)}

.fx-card,.fx-box{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:26px;box-shadow:0 1px 2px rgba(15,27,45,.04),0 12px 32px rgba(15,27,45,.06)}
.fx-top{display:grid;grid-template-columns:minmax(320px,440px) 1fr;gap:24px;margin-bottom:24px}
.fx-thumb{width:100%;max-height:280px;object-fit:contain;background:#0b1220;border-radius:10px;margin-bottom:12px}
.fx-hash{display:block;word-break:break-all;font-size:12px;background:var(--alt);padding:10px;border-radius:8px;color:#33445c}
.fx-rows>div{display:flex;justify-content:space-between;gap:14px;padding:8px 0;border-bottom:1px solid var(--line);font-size:14px}
.fx-rows span{color:var(--muted)}.fx-rows b{text-align:right;word-break:break-word;max-width:62%;font-weight:600}
.fx-overall{display:flex;flex-direction:column}
.fx-big{display:flex;align-items:center;gap:12px;font-size:clamp(30px,3.4vw,46px);font-weight:800;letter-spacing:-1px}
.fx-big i{width:18px;height:18px;border-radius:50%;background:currentColor;box-shadow:0 0 12px currentColor}
.fx .ok{--c:var(--ok)}.fx .warn{--c:var(--warn)}.fx .bad{--c:var(--bad)}.fx .info{--c:var(--info)}
.fx-big.ok,.fx-verdict.ok{color:var(--ok)}.fx-big.warn,.fx-verdict.warn{color:var(--warn)}
.fx-big.bad,.fx-verdict.bad{color:var(--bad)}.fx-verdict.info,.fx-big.info{color:var(--info)}
.fx-chips{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-top:auto;padding-top:20px}
.fx-chip{background:var(--alt);border:1px solid var(--line);border-left:4px solid var(--c);border-radius:12px;padding:16px;color:inherit;text-decoration:none;display:grid;gap:6px}
.fx-chip span{color:var(--muted);font-size:13px}.fx-chip strong{font-size:18px}
.fx-pill{font-size:12px;font-weight:700;padding:4px 10px;border-radius:20px;color:var(--c);border:1px solid var(--c);background:#fff;justify-self:start;white-space:nowrap}
.fx-box>header .fx-pill{justify-self:auto}
.fx-grid3{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;align-items:start}
.fx-ev{grid-column:1;grid-row:1}#box1{grid-column:2;grid-row:1}#box2{grid-column:1/-1;grid-row:2}
.fx-metasec{margin-top:24px;padding-top:22px;border-top:1px solid var(--line)}
.fx-mhead{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}.fx-mhead h3{margin:0}
#box2 .fx-tiles{grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}
#box2 .fx-pair{grid-template-columns:repeat(2,minmax(0,1fr))}
@media(max-width:1000px){.fx-grid3{grid-template-columns:1fr}.fx-ev,#box1,#box2{grid-column:auto;grid-row:auto}}
.fx-box>header{display:flex;align-items:center;gap:12px;margin-bottom:14px}
.fx-num{background:var(--acc);color:#fff;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:14px;flex:none}
.fx-gauge{width:100%;max-width:320px;display:block;margin:0 auto}
.fx-verdict{text-align:center;font-size:26px;font-weight:800;margin-top:4px;letter-spacing:-.5px}
.fx-plain{text-align:center;color:var(--muted);margin:6px 0 14px}
.fx-split{display:flex;height:30px;border-radius:8px;overflow:hidden;font-size:12px;font-weight:700;color:#fff}
.fx-split div{display:grid;place-items:center;white-space:nowrap;overflow:hidden;min-width:0}
.fx-split .r{background:#15803d}.fx-split .a{background:#b3261e}
.fx-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-top:12px}
.fx-tile{background:var(--alt);border:1px solid var(--line);border-radius:10px;padding:12px;display:grid;gap:4px;min-width:0}
.fx-tile span{font-size:12px;color:var(--muted)}.fx-tile strong{font-size:15px;word-break:break-word}
.fx-list{margin:0;padding-left:18px;display:grid;gap:6px;font-size:14px}
.fx-callout{border-left:4px solid var(--c);background:var(--alt);border-radius:8px;padding:12px 14px;font-size:14px;margin-top:6px}
.fx-pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}.fx-pair figure{margin:0}
.fx-pair img{width:100%;display:block;border-radius:8px;background:#0b1220}
.fx-pair figcaption{font-size:12px;color:var(--muted);margin-top:6px}
.fx-hs{position:relative}
.fx-hsgrid{position:absolute;inset:0;display:grid;grid-template-columns:repeat(${G},1fr);grid-template-rows:repeat(${G},1fr);border-radius:8px;overflow:hidden}
.fx-hsgrid i.top{outline:3px solid #fff;outline-offset:-3px}
.fx-checks{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.fx-checks li{display:flex;gap:12px;background:var(--alt);border:1px solid var(--line);border-radius:10px;padding:10px 12px}
.fx-checks i{font-style:normal;font-weight:800;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;flex:none;color:#fff;background:var(--c)}
.fx-checks div{display:grid;gap:2px;font-size:14px}.fx-checks span{color:var(--muted);font-size:13px}
.fx-scroll{max-height:380px;overflow:auto;padding-right:6px}
.fx-disc{text-align:center;color:var(--muted);font-size:13px;margin-top:26px}

.fx-doc{display:none}
@media print{
  @page{size:A4;margin:16mm 14mm 18mm}
  .nav,.footer{display:none!important}
  body,.site{background:#fff!important}
  .fx{padding:0!important;color:#000!important;background:#fff!important;min-height:0!important}
  .fx>*:not(.fx-doc){display:none!important}
  .fx-doc{display:block;font-family:Georgia,"Times New Roman",serif;color:#111;font-size:10.5pt;line-height:1.45}
  .fx-doc *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .d-foot{position:fixed;bottom:0;left:0;right:0;font-size:8pt;color:#555;border-top:1px solid #999;padding-top:4px;text-align:center}
  .d-head{border-bottom:3px double #111;padding-bottom:10px;margin-bottom:12px;text-align:center}
  .d-org{letter-spacing:.35em;font-size:10pt;color:#444;font-weight:700}
  .fx-doc h1{font-size:19pt;margin:6px 0 0;text-transform:uppercase;letter-spacing:.03em}
  .fx-doc h2{font-size:12.5pt;margin:18px 0 6px;padding-bottom:3px;border-bottom:1.5px solid #111;text-transform:uppercase;break-after:avoid;flex:none}
  .fx-doc h3{font-size:11pt;margin:14px 0 6px;break-after:avoid}
  .fx-doc p{margin:6px 0}.fx-doc ul{margin:4px 0 6px;padding-left:20px}.fx-doc li{margin:2px 0}
  .d-lbl{font-weight:700;margin-top:10px!important}
  .d-note{font-size:9pt;color:#444;font-style:italic}
  .d-meta{width:100%;border-collapse:collapse;margin-bottom:6px;font-size:9.5pt}
  .d-meta td{border:1px solid #888;padding:5px 8px}.d-meta td:nth-child(odd){background:#eee;font-weight:700;width:16%}
  .d-tbl{width:100%;border-collapse:collapse;margin:6px 0 8px;font-size:9.5pt;break-inside:auto}
  .d-tbl tr{break-inside:avoid}
  .d-tbl th{background:#222;color:#fff;text-align:left;padding:5px 8px;border:1px solid #222}
  .d-tbl td{border:1px solid #999;padding:5px 8px;vertical-align:top;word-break:break-word}
  .d-tbl tbody tr td:first-child{background:#f1f1f1;font-weight:700;width:30%}
  .d-figs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:8px 0;break-inside:avoid}
  .d-figs figure{margin:0}.d-figs img{width:100%;display:block;border:1px solid #888}
  .d-figs figcaption{font-size:8pt;color:#333;margin-top:3px}
  .d-figs .fx-hs{position:relative}
  .d-figs .fx-hsgrid{position:absolute;inset:0;display:grid;grid-template-columns:repeat(12,1fr);grid-template-rows:repeat(12,1fr)}
  .d-figs .fx-hsgrid i.top{outline:2px solid #000;outline-offset:-2px}
  .d-sign{display:grid;grid-template-columns:2fr 2fr 1fr;gap:24px;margin-top:34px;font-size:9pt;color:#333}
  .d-sign span{display:block;border-bottom:1px solid #000;height:26px;margin-bottom:4px}
  .d-break{break-after:page}
}

/* Professional report dashboard refresh */
.fx{--alt:#f3f6fb;--card:#fff;--line:#e3e9f2;--text:#17243a;--muted:#68778e;--acc:#315be8;--acc-d:#2448c7;background:linear-gradient(180deg,#f7f9fd 0%,#eef3fa 100%);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:0}
.fx h1,.fx h2,.fx h3,.fx h4{letter-spacing:-.025em}
.fx-hero{padding:30px clamp(20px,4vw,64px);background:linear-gradient(115deg,#101d35 0%,#162c50 58%,#203d68 100%);position:relative;overflow:hidden}
.fx-hero:after{content:"";position:absolute;width:360px;height:360px;border:1px solid rgba(255,255,255,.08);border-radius:50%;right:10%;top:-245px;box-shadow:0 0 0 38px rgba(255,255,255,.025),0 0 0 78px rgba(255,255,255,.02);pointer-events:none}
.fx-hero>div{position:relative;z-index:1}
.fx-hero h1{font-weight:760;letter-spacing:-.045em}
.fx-hero p{font-size:13px;margin-top:8px}
.fx-actions{gap:8px}
.fx-btn{border-radius:9px;font-size:13px;padding:10px 14px;transition:transform .18s ease,background .18s ease,border-color .18s ease}
.fx-btn:hover{transform:translateY(-1px)}
.fx-btn.primary{background:#4169f5;border-color:#4169f5;box-shadow:0 5px 14px rgba(49,91,232,.2)}
.fx-report{max-width:none;margin:0;padding:28px clamp(16px,2vw,40px) 0}
.fx-overview{border:1px solid #dfe7f3;border-radius:18px;background:#fff;box-shadow:0 12px 36px rgba(25,48,84,.07);overflow:hidden;margin-bottom:30px}
.fx-overview-main{padding:26px clamp(18px,2.6vw,34px) 24px}
.fx-eyebrow,.fx-section-kicker{font-size:10px;font-weight:800;letter-spacing:.14em;color:#617493}
.fx-eyebrow{display:flex;align-items:center;gap:9px;margin-bottom:18px}
.fx-live-dot{width:7px;height:7px;background:#3cba85;border-radius:50%;box-shadow:0 0 0 4px #e8f8f1}
.fx-overview-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:24px}
.fx-overview-heading h2,.fx-probability-heading h2{font-size:25px;line-height:1.2;margin:0;font-weight:760;color:#17243a}
.fx-overview-sub{font-size:14px;color:#68778e;margin:8px 0 0;max-width:720px;line-height:1.6}
.fx-status-badge{display:inline-flex;align-items:center;gap:8px;white-space:nowrap;border-radius:999px;padding:9px 13px;font-size:12px;font-weight:750;border:1px solid #dce4ef;background:#f7f9fc;color:#334155}
.fx-status-badge i{width:7px;height:7px;border-radius:50%;background:currentColor}
.fx-status-badge.ok{color:#16784b;background:#edfaf3;border-color:#c8efda}
.fx-status-badge.warn{color:#9a5b08;background:#fff7e8;border-color:#f5dfb4}
.fx-status-badge.bad{color:#b42332;background:#fff0f1;border-color:#f5cbd0}
.fx-status-badge.info{color:#3458a5;background:#eff5ff;border-color:#d5e2ff}
.fx-summary-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.fx-summary-metric{display:flex;gap:12px;align-items:flex-start;padding:16px 14px;border:1px solid #e7ecf4;background:#fbfcfe;border-radius:12px;min-width:0}
.fx-metric-icon{width:36px;height:36px;display:grid;place-items:center;flex:none;border-radius:10px;background:#fff0f1;color:#bc3543;font-size:12px;font-weight:850;border:1px solid #f8dadd}
.fx-metric-icon.real{background:#eaf9f0;color:#16804e;border-color:#d0f0dc;font-size:17px}
.fx-metric-icon.edit{background:#fff7e8;color:#9a5b08;border-color:#f5e5c4;font-size:20px}
.fx-metric-icon.alert{background:#fff0f1;color:#bc3543;border-color:#f8dadd;font-size:20px}
.fx-metric-icon.meta{background:#eef4ff;color:#3a5ed0;border-color:#d9e4ff;font-size:20px}
.fx-summary-metric>div{display:grid;gap:4px;min-width:0}
.fx-summary-metric small{font-size:11px;color:#697991;font-weight:650}
.fx-summary-metric strong{font-size:23px;line-height:1.2;letter-spacing:-.04em;color:#1c2b43;overflow-wrap:anywhere}
.fx-summary-metric div>span{font-size:11px;line-height:1.45;color:#7b879a}
.fx-overview-foot{display:flex;flex-wrap:wrap;gap:10px 26px;padding:13px clamp(18px,2.6vw,34px);border-top:1px solid #e8edf5;background:#f8fafd;color:#67758b;font-size:11px}
.fx-overview-foot span{min-width:0;overflow-wrap:anywhere}
.fx-overview-foot b{color:#35445d;margin-right:5px}
.fx-section-intro{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin:4px 2px 16px}
.fx-section-intro h2{font-size:23px;margin:5px 0 0;font-weight:760}
.fx-section-intro p{font-size:12px;color:#738198;max-width:430px;margin:0;line-height:1.55}
.fx-grid3{gap:20px}
.fx-card,.fx-box{border:1px solid #e1e8f2;border-radius:15px;padding:clamp(17px,2vw,26px);box-shadow:0 5px 20px rgba(25,48,84,.045);transition:box-shadow .2s ease,border-color .2s ease}
.fx-card:hover,.fx-box:hover{box-shadow:0 10px 28px rgba(25,48,84,.075);border-color:#d3deee}
.fx-box>header{padding-bottom:13px;border-bottom:1px solid #edf0f5;margin-bottom:18px}
.fx-num{border-radius:9px;width:30px;height:30px;background:#edf2ff;color:#315be8;font-size:12px}
.fx-pill{border:0;background:#f2f5fa;padding:6px 10px;font-size:10px;letter-spacing:.02em}
.fx-pill.ok{color:#16784b;background:#eaf8f0}.fx-pill.warn{color:#9a5b08;background:#fff4dc}.fx-pill.bad{color:#b42332;background:#ffedef}.fx-pill.info{color:#3458a5;background:#edf3ff}
.fx-tile{border-radius:10px;background:#f8fafd;border-color:#e8edf5;padding:13px}
.fx-tile span{font-size:11px;font-weight:600}.fx-tile strong{font-size:14px;color:#26364f}
.fx-rows>div{padding:10px 0;font-size:12px}
.fx-hash{background:#f5f7fb;border:1px solid #e7ecf4;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;line-height:1.6}
.fx-verdict{font-size:24px;font-weight:800}
.fx-plain{font-size:13px;line-height:1.6}
.fx-split{height:34px;border-radius:10px;font-size:11px}
.fx-callout{border-radius:10px;line-height:1.55}
.fx-pair{gap:14px}
.fx-pair img{border:1px solid #e5eaf2}
.fx-pair figcaption{font-size:11px;line-height:1.5}
.fx-checks li{border-radius:10px;background:#fbfcfe}
.fx-checks div{line-height:1.45}
.fx-checks span{line-height:1.5}
.fx-metasec{padding-top:25px}
.fx-disc{font-size:11px;line-height:1.6;margin:20px auto 0;max-width:900px}
.fx-probability-panel{margin-top:28px;padding:clamp(18px,2.7vw,34px);border-radius:18px;border:1px solid #dce5f2;background:linear-gradient(145deg,#fff 0%,#f8faff 100%);box-shadow:0 10px 32px rgba(25,48,84,.06)}
.fx-probability-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:22px}
.fx-probability-heading h2{margin-top:6px}
.fx-probability-heading p{color:#718097;font-size:12px;line-height:1.65;max-width:760px;margin:8px 0 0}
.fx-probability-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.fx-prob-card{min-width:0;border:1px solid #e2e9f3;border-radius:13px;padding:18px;background:#fff}
.fx-prob-card-top{display:flex;align-items:center;gap:9px;color:#56657c;font-size:12px;font-weight:700}
.fx-prob-symbol{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;font-size:11px;font-weight:850;background:#fff0f1;color:#b42332}
.fx-prob-real .fx-prob-symbol{background:#eaf9f0;color:#16784b;font-size:16px}
.fx-prob-manip .fx-prob-symbol{background:#fff5e3;color:#9a5b08;font-size:17px}
.fx-prob-number{display:block;font-size:42px;letter-spacing:-.055em;line-height:1.2;margin:18px 0 13px;color:#b42332}
.fx-prob-number small{font-size:20px;letter-spacing:0;margin-left:2px}
.fx-prob-real .fx-prob-number{color:#16784b}
.fx-prob-word{display:block;font-size:27px;letter-spacing:-.04em;margin:24px 0 21px;color:#9a5b08}
.fx-prob-track{height:8px;background:#fbe4e7;border-radius:99px;overflow:hidden}
.fx-prob-track span{display:block;height:100%;background:linear-gradient(90deg,#e45b68,#b42332);border-radius:99px;transition:width .3s ease}
.fx-prob-real .fx-prob-track{background:#dff4e7}
.fx-prob-real .fx-prob-track span{background:linear-gradient(90deg,#44be83,#16804e)}
.fx-prob-track.neutral{background:#f6ebd4}
.fx-prob-track.neutral span{background:linear-gradient(90deg,#f1bb52,#b97914)}
.fx-prob-card p{font-size:11px;line-height:1.65;color:#758198;margin:13px 0 0;min-height:54px}
.fx-final-note{display:flex;align-items:flex-start;gap:11px;margin-top:18px;padding:14px 16px;border:1px solid #dbe6fa;background:#f0f5ff;border-radius:11px;color:#435575}
.fx-final-note>span{font-size:17px;color:#315be8;line-height:1.3}
.fx-final-note p{font-size:11px;line-height:1.7;margin:0}
.fx-no-score{padding:18px;border:1px dashed #d7e0ee;border-radius:12px;color:#66758d;background:#fbfcff;font-size:13px}
@media(max-width:1100px){.fx-summary-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.fx-probability-grid{grid-template-columns:1fr 1fr}.fx-prob-card:last-child{grid-column:1/-1}}
@media(max-width:700px){.fx-overview-heading,.fx-probability-heading,.fx-section-intro{align-items:flex-start;flex-direction:column}.fx-summary-metrics,.fx-probability-grid{grid-template-columns:1fr}.fx-prob-card:last-child{grid-column:auto}.fx-summary-metric strong{font-size:21px}.fx-overview-main{padding:20px 16px}.fx-overview-foot{flex-direction:column;gap:8px}.fx-section-intro p{max-width:none}.fx-pair{grid-template-columns:1fr!important}.fx-hero{padding:24px 18px}.fx-actions{width:100%}.fx-actions .fx-btn{flex:1 1 auto}.fx-probability-heading h2{font-size:22px}}
@media(prefers-reduced-motion:reduce){.fx *{transition:none!important}}
@media print{
  .fx-overview,.fx-section-intro,.fx-probability-panel{box-shadow:none;border:1px solid #bbb}
  .fx-summary-metrics,.fx-probability-grid{grid-template-columns:repeat(2,1fr)}
  .fx-prob-card:last-child{grid-column:auto}
}

/* manipulation panels: equal size */
.fx-grid3{align-items:stretch}
.fx-mgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;align-items:stretch}
.fx-mp{border:1px solid var(--line);border-radius:14px;padding:18px;background:#fbfcfe;display:flex;flex-direction:column;gap:12px;min-width:0}
.fx-mp h4{margin:0}
.fx-mp .fx-tiles{margin-top:0;grid-template-columns:repeat(2,minmax(0,1fr))}
.fx-mp .fx-callout{margin-top:0}
.fx-mp .fx-foot{margin:auto 0 0}
.fx-frame{height:230px;background:#0b1220;border-radius:10px;display:grid;place-items:center;overflow:hidden}
.fx-frame .fx-hs{display:block;position:relative;width:fit-content;max-width:100%}
.fx-frame img{display:block;width:auto;height:auto;max-width:100%;max-height:230px;border:0}
.fx-frame .fx-hsgrid{border-radius:0}
@media(max-width:1200px){.fx-mgrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:700px){.fx-mgrid{grid-template-columns:1fr}}

/* full-width layout */
.fx-hero{padding-left:clamp(16px,2vw,40px);padding-right:clamp(16px,2vw,40px)}
.fx-report{max-width:none!important;width:100%;margin:0!important;padding-left:clamp(16px,2vw,40px);padding-right:clamp(16px,2vw,40px)}

/* evidence + metadata as separate boxes */
.fx-metasec{margin:0;padding:0;border:0}
.fx-grid3{grid-template-columns:repeat(3,minmax(0,1fr))}
.fx-ev{grid-column:1;grid-row:1}
.fx-meta{grid-column:2;grid-row:1}
#box1{grid-column:3;grid-row:1}
#box2{grid-column:1/-1;grid-row:2}
@media(max-width:1300px){.fx-grid3{grid-template-columns:repeat(2,minmax(0,1fr))}#box1{grid-column:1/-1;grid-row:2}#box2{grid-column:1/-1;grid-row:3}}
@media(max-width:1000px){.fx-grid3{grid-template-columns:1fr}.fx-ev,.fx-meta,#box1,#box2{grid-column:auto;grid-row:auto}}

/* manipulation verdict cards */
.fx-vgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;align-items:stretch;margin-bottom:16px}
.fx-verd{border:1px solid var(--line);border-top:4px solid var(--c);border-radius:14px;padding:18px;background:#fff;display:flex;flex-direction:column;gap:10px;min-width:0}
.fx-vtop{display:flex;align-items:center;justify-content:space-between;gap:10px}
.fx-vtop h4{margin:0}
.fx-vbadge{font-size:12px;font-weight:800;padding:4px 12px;border-radius:99px;color:#fff;background:var(--c);white-space:nowrap}
.fx-vinfo{margin:0;font-size:14px}
.fx-verd .fx-rows{margin-top:auto}
@media(max-width:1200px){.fx-vgrid{grid-template-columns:1fr}}

.fx-vnote{display:flex;gap:10px;align-items:flex-start;background:#fff7e6;border:1px solid #f0cfa0;border-left:4px solid #e0793a;color:#5c2e05;border-radius:10px;padding:10px 12px;font-size:13px;font-weight:600;line-height:1.45}
.fx-vnote b{flex:none;width:20px;height:20px;border-radius:50%;background:#e0793a;color:#fff;display:grid;place-items:center;font-size:12px}

/* original comparison */
#box4{grid-column:1/-1}
.fx-cmpimgs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin:16px 0}
.fx-cmpimgs figure{margin:0}
.fx-cmpimgs figcaption{font-size:13px;color:var(--muted);margin-top:6px;text-align:center}
.fx-frame.tall{height:420px}
.fx-frame.tall img{max-height:420px}
.fx-cmptbl{width:100%;border-collapse:collapse;font-size:14px}
.fx-cmptbl th{text-align:left;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:8px 10px;border-bottom:2px solid var(--line)}
.fx-cmptbl td{padding:10px;border-bottom:1px solid var(--line);vertical-align:middle}
.fx-t-removed{background:#b3261e}.fx-t-added{background:#15803d}.fx-t-changed{background:#b45309}
@media(max-width:900px){.fx-cmpimgs{grid-template-columns:1fr}}

`;