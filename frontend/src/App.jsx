import { useState, useEffect, useCallback } from "react";
import "./App.css";
import Home from "./pages/Home";
import Analyze from "./pages/Analyze";
import Report from "./pages/Report";
   import ReportCard from "./pages/ReportCard";


const routeOf = () => window.location.hash.replace(/^#/, "") || "/";

export default function App() {
  const [route, setRoute] = useState(routeOf());

  const go = useCallback((path) => {
    window.location.hash = path;
  }, []);

  useEffect(() => {
    const onHash = () => {
      setRoute(routeOf());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const toSection = (id) => {
    const scroll = () => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    if (route !== "/") {
      go("/");
      setTimeout(scroll, 120);
    } else scroll();
  };

  return (
    <div className="site">
      <header className="nav">
        <div className="container nav-in">
          <button className="brand" onClick={() => go("/")}>
            <span className="brand-mark">F</span>
            ForensiX AI
          </button>

          <nav className="nav-links" aria-label="Main">
            <button onClick={() => toSection("model")}>Model</button>
            <button onClick={() => toSection("how")}>How it works</button>
            <button onClick={() => toSection("checks")}>Checks</button>
            <button onClick={() => toSection("faq")}>FAQ</button>
          </nav>

          <button className="btn btn-light" onClick={() => go("/analyze")}>Analyze an image</button>
        </div>
      </header>

         {route === "/report" ? <Report /> : route === "/card" ? <ReportCard /> : route === "/analyze" ? <Analyze /> : <Home go={go} />}

      <footer className="footer">
        <div className="container footer-in">
          <div>
            <span className="brand light"><span className="brand-mark">F</span>ForensiX AI</span>
            <p>Digital image forensics, explained simply.</p>
          </div>
          <nav aria-label="Footer">
            <button onClick={() => toSection("model")}>Model</button>
            <button onClick={() => toSection("how")}>How it works</button>
            <button onClick={() => toSection("faq")}>FAQ</button>
          </nav>
        </div>
        <div className="container copy">
          © {new Date().getFullYear()} ForensiX AI. Results are indicators, not legal proof.
        </div>
      </footer>
    </div>
  );
}