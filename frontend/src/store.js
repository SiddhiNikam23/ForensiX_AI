let data = null;

export const setReport = (d) => {
  data = d;
  try { sessionStorage.setItem("fx-report", JSON.stringify(d)); } catch (e) { /* too large, memory only */ }
};

export const getReport = () => {
  if (data) return data;
  try {
    const s = sessionStorage.getItem("fx-report");
    if (s) { data = JSON.parse(s); return data; }
  } catch (e) { /* ignore */ }
  return null;
};

export const patchReport = (patch) => {
  const cur = getReport();
  if (!cur) return;
  data = { ...cur, ...patch };
  try { sessionStorage.setItem("fx-report", JSON.stringify(data)); } catch (e) { /* too large, memory only */ }
};