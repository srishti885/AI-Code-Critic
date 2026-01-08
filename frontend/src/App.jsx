import React, { useState, useEffect } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import html2pdf from "html2pdf.js";
import confetti from "canvas-confetti";
import { Sparkles, Terminal, ShieldCheck, Zap, FileDown, Trash2, Code, CheckCircle2, UserCircle, LogOut, History, X } from "lucide-react";

function App() {
  const [code, setCode] = useState("");
  const [review, setReview] = useState("");
  const [fixedCode, setFixedCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(null);
  
  // Auth & UI States
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")) || null);
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [authData, setAuthData] = useState({ email: "", password: "" });
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Auth Functions
  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/signup";
    try {
      const res = await axios.post(`http://localhost:5000${endpoint}`, authData);
      if (isLogin) {
        localStorage.setItem("user", JSON.stringify(res.data));
        setUser(res.data);
        setShowAuth(false);
        confetti({ particleCount: 100, spread: 50 });
      } else {
        alert("Account Created! Please Login.");
        setIsLogin(true);
      }
    } catch (err) {
      alert(err.response?.data?.error || "Auth Failed");
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setHistory([]);
  };

  const handleReview = async () => {
    if (!code) return;
    setLoading(true); setReview(""); setFixedCode(""); setScore(null);
    try {
      const token = user?.token;
      const res = await axios.post("http://localhost:5000/api/review", { code, token });
      setReview(res.data.review);
      setFixedCode(res.data.fixedCode);
      setScore(res.data.score);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    } catch (err) {
      setReview("### Error\nConnection failed.");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!user) return setShowAuth(true);
    try {
      const res = await axios.get("http://localhost:5000/api/history", {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setHistory(res.data);
      setShowHistory(true);
    } catch (err) { alert("Session Expired"); logout(); }
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.logoBox}><Zap size={22} color="#fff" fill="#fff" /></div>
        <div style={styles.sideIcons}>
          <Code size={20} color="#6366f1" />
          <History size={20} color="#94a3b8" style={{cursor: 'pointer'}} onClick={fetchHistory} />
          <div style={styles.divider}></div>
          {user ? (
            <LogOut size={20} color="#f43f5e" style={{cursor: 'pointer'}} onClick={logout} />
          ) : (
            <UserCircle size={22} color="#94a3b8" style={{cursor: 'pointer'}} onClick={() => setShowAuth(true)} />
          )}
        </div>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <nav style={styles.navbar}>
          <div style={styles.brand}>CODECRITIC <span style={styles.pro}>PRO</span></div>
          <div style={styles.navBtns}>
            {score && <div style={styles.score}>Health Score: {score}%</div>}
            {user && <span style={styles.userLabel}>{user.email.split('@')[0]}</span>}
            <button style={styles.pdfBtn} onClick={() => html2pdf().from(document.getElementById('report')).save()} disabled={!review}><FileDown size={16} /> Export</button>
          </div>
        </nav>

        <main style={styles.main}>
          <div style={styles.pane}>
            <div style={styles.paneHead}><Terminal size={14} /> editor.js</div>
            <textarea style={styles.editor} value={code} onChange={(e)=>setCode(e.target.value)} placeholder="Paste source code here..." />
          </div>

          <div style={styles.pane}>
            <div style={styles.paneHead}><Sparkles size={14} color="#6366f1" /> AI Audit</div>
            <div style={styles.preview} id="report">
              {loading ? (
                <div style={styles.loader}><div className="radar"></div><p>Analyzing Logic...</p></div>
              ) : (
                <div className="md-content">
                   {fixedCode && (
                     <button style={styles.applyBtn} onClick={() => {setCode(fixedCode); setFixedCode("");}}><CheckCircle2 size={16} /> Apply Optimization</button>
                   )}
                   <ReactMarkdown>{review || "System ready. Input code to start."}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </main>

        <div style={styles.footer}>
          <button onClick={handleReview} disabled={loading} style={loading ? styles.btnOff : styles.btn}>
            {loading ? "SCANNING..." : "TRIGGER AI ANALYSIS"}
          </button>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuth && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <X size={20} style={styles.close} onClick={() => setShowAuth(false)} />
            <h2 style={{marginBottom: '20px'}}>{isLogin ? "Login to Pro" : "Create Account"}</h2>
            <form onSubmit={handleAuth} style={styles.form}>
              <input type="email" placeholder="Email" required style={styles.input} onChange={e=>setAuthData({...authData, email: e.target.value})} />
              <input type="password" placeholder="Password" required style={styles.input} onChange={e=>setAuthData({...authData, password: e.target.value})} />
              <button type="submit" style={styles.authBtn}>{isLogin ? "Sign In" : "Register"}</button>
            </form>
            <p style={styles.switch} onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? "New here? Create account" : "Already have account? Login"}
            </p>
          </div>
        </div>
      )}

      {/* History Side Panel */}
      {showHistory && (
        <div style={styles.overlay} onClick={() => setShowHistory(false)}>
          <div style={styles.historyPanel} onClick={e => e.stopPropagation()}>
            <div style={styles.paneHead}>RECORDS HISTORY</div>
            <div style={{padding: '15px'}}>
              {history.map((h, i) => (
                <div key={i} style={styles.historyItem} onClick={() => {setCode(h.codeSnippet); setReview(h.review); setShowHistory(false);}}>
                  <div style={{fontWeight: 'bold', fontSize: '12px'}}>Session {history.length - i}</div>
                  <div style={{fontSize: '11px', color: '#64748b'}}>{new Date(h.createdAt).toLocaleDateString()} | Score: {h.score}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .radar { width: 40px; height: 40px; border: 3px solid #6366f1; border-radius: 50%; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { transform: scale(0.6); opacity: 1; } 100% { transform: scale(1.4); opacity: 0; } }
        .md-content h3 { color: #1e293b; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-top: 15px; }
        .md-content pre { background: #0f172a; color: #f8fafc; padding: 15px; border-radius: 12px; font-size: 13px; overflow-x: auto; }
      `}</style>
    </div>
  );
}

const styles = {
  container: { height: "100vh", width: "100vw", display: "flex", background: "#f8fafc", fontFamily: "'Inter', sans-serif" },
  sidebar: { width: "65px", background: "#0f172a", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0" },
  logoBox: { background: "#6366f1", padding: "8px", borderRadius: "10px", marginBottom: "40px" },
  sideIcons: { display: "flex", flexDirection: "column", gap: "25px", alignItems: "center" },
  divider: { width: "30px", height: "1px", background: "#334155" },
  navbar: { height: "65px", background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 30px" },
  brand: { fontWeight: "900", fontSize: "18px", letterSpacing: "-1px" },
  pro: { background: "#6366f1", color: "#fff", fontSize: "10px", padding: "2px 6px", borderRadius: "4px" },
  navBtns: { display: "flex", alignItems: "center", gap: "15px" },
  userLabel: { fontSize: "12px", color: "#64748b", fontWeight: "600" },
  score: { background: "#f0fdf4", color: "#16a34a", padding: "5px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "800", border: "1px solid #bbf7d0" },
  pdfBtn: { background: "#1e293b", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" },
  main: { flex: 1, display: "flex", padding: "20px", gap: "20px", overflow: "hidden" },
  pane: { flex: 1, background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", overflow: "hidden" },
  paneHead: { padding: "10px 15px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: "11px", fontWeight: "700", color: "#64748b", display: "flex", alignItems: "center", gap: "8px" },
  editor: { flex: 1, padding: "20px", border: "none", outline: "none", resize: "none", fontSize: "14px", fontFamily: "'Fira Code', monospace" },
  preview: { flex: 1, padding: "20px", overflowY: "auto" },
  applyBtn: { background: "#6366f1", color: "#fff", border: "none", padding: "8px 15px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", fontWeight: "700", marginBottom: "15px" },
  footer: { height: "80px", display: "flex", justifyContent: "center", alignItems: "center" },
  btn: { background: "#6366f1", color: "#fff", padding: "14px 50px", borderRadius: "10px", border: "none", fontSize: "15px", fontWeight: "800", cursor: "pointer" },
  btnOff: { background: "#e2e8f0", color: "#94a3b8", padding: "14px 50px", borderRadius: "10px" },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  modal: { background: '#fff', padding: '40px', borderRadius: '20px', width: '350px', position: 'relative' },
  close: { position: 'absolute', top: '20px', right: '20px', cursor: 'pointer', color: '#94a3b8' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' },
  authBtn: { background: '#6366f1', color: '#fff', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' },
  switch: { marginTop: '20px', fontSize: '13px', textAlign: 'center', color: '#6366f1', cursor: 'pointer' },
  historyPanel: { position: 'absolute', right: 0, height: '100%', width: '300px', background: '#fff', boxShadow: '-10px 0 30px rgba(0,0,0,0.1)' },
  historyItem: { padding: '15px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: '0.2s', ':hover': {background: '#f8fafc'} },
  loader: { height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '15px' }
};

export default App;