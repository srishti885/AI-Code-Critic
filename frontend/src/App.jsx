import React, { useState, useEffect } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import html2pdf from "html2pdf.js";
import confetti from "canvas-confetti";
import { Sparkles, Terminal, ShieldCheck, Zap, FileDown, Trash2, Code, CheckCircle2, UserCircle, LogOut, History, X, Copy, Check, Users, Crown, CreditCard, Rocket } from "lucide-react";

function App() {
  const [code, setCode] = useState("");
  const [review, setReview] = useState("");
  const [fixedCode, setFixedCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(null);
  const [copied, setCopied] = useState(false);
  
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")) || null);
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [authData, setAuthData] = useState({ email: "", password: "" });
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // --- NEW FEATURES STATES ---
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [usageCount, setUsageCount] = useState(user?.usageCount || 0);
  const [upgrading, setUpgrading] = useState(false);

  // ADMIN STATES
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminStats, setAdminStats] = useState(null);

  // --- FEEDBACK STATES ---
  const [feedback, setFeedback] = useState({ rating: 5, comment: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/signup";
    try {
      const res = await axios.post(`http://localhost:5000${endpoint}`, authData);
      if (isLogin) {
        localStorage.setItem("user", JSON.stringify(res.data));
        setUser(res.data);
        setUsageCount(res.data.usageCount || 0);
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
    setShowAdmin(false);
    setUsageCount(0);
  };

  const handleUpgrade = async () => {
    setUpgrading(true);
    setTimeout(() => {
      const updatedUser = { ...user, subscription: 'premium', role: 'admin' }; 
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setUpgrading(false);
      setShowUpgrade(false);
      confetti({
        particleCount: 150,
        spread: 70,
        colors: ['#f59e0b', '#6366f1', '#ffffff']
      });
      alert("✨ Payment Successful! Your PRO account is now active.");
    }, 2000);
  };

  const fetchAdminStats = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/admin/stats", {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setAdminStats(res.data);
      setShowAdmin(true);
    } catch (err) {
      alert("Unauthorized: Admins Only");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      fetchAdminStats();
    } catch (err) {
      alert("Delete failed");
    }
  };

  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await axios.patch(`http://localhost:5000/api/admin/users/${userId}/role`, 
        { role: newRole },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      fetchAdminStats();
    } catch (err) {
      alert("Role update failed");
    }
  };

  const handleReview = async () => {
    if (!code) return;
    if (!user) return setShowAuth(true);

    if (user.role !== 'admin' && user.subscription !== 'premium' && usageCount >= 3) {
        setShowUpgrade(true);
        return;
    }

    setLoading(true); setReview(""); setFixedCode(""); setScore(null);
    try {
      const res = await axios.post("http://localhost:5000/api/review", { code, token: user.token });
      setReview(res.data.review);
      setFixedCode(res.data.fixedCode);
      setScore(res.data.score);
      setUsageCount(res.data.usageCount); 
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    } catch (err) {
      if (err.response?.status === 403) {
          setShowUpgrade(true);
      } else {
          setReview("### Error\n" + (err.response?.data?.error || "Connection failed."));
      }
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

  const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFeedback({ rating: 5, comment: "" });
    }, 3000);
  };

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <div style={styles.logoBox}><Zap size={22} color="#fff" fill="#fff" /></div>
        <div style={styles.sideIcons}>
          <Code size={20} color="#6366f1" style={{cursor: 'pointer'}} />
          <History size={20} color="#94a3b8" style={{cursor: 'pointer'}} onClick={fetchHistory} />
          <Crown size={20} color="#f59e0b" style={{cursor:'pointer'}} onClick={() => setShowUpgrade(true)} />
          {user?.role === 'admin' && (
            <ShieldCheck size={20} color="#f59e0b" style={{cursor: 'pointer'}} onClick={fetchAdminStats} />
          )}
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
            {user && (
                <div style={styles.usageTag}>
                    <Rocket size={12} /> {user.subscription === 'premium' || user.role === 'admin' ? "PRO ACCESS" : `${3 - usageCount} Free Audits Left`}
                </div>
            )}
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
                      <div style={{ marginBottom: "20px" }}>
                        <button style={styles.applyBtn} onClick={() => { setCode(fixedCode); setFixedCode(""); }}>
                          <CheckCircle2 size={16} /> Apply Optimization
                        </button>
                        <div style={{ position: 'relative' }}> 
                          <div style={styles.fixedCodeBox}>
                            <p style={styles.fixedLabel}>CORRECTED CODE:</p>
                            <button onClick={() => handleCopy(fixedCode)} style={styles.copyButton} title="Copy Code">
                              {copied ? <Check size={16} color="#4ade80" /> : <Copy size={16} />}
                            </button>
                            <pre style={styles.pre}><code>{fixedCode}</code></pre>
                          </div>
                        </div>
                      </div>
                    )}
                    <ReactMarkdown>{review || "System ready. Input code to start."}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* --- FEEDBACK SECTION --- */}
        <section style={styles.feedbackSection}>
          <h3 style={{fontSize: '13px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569'}}>
            <Sparkles size={14} color="#6366f1" /> Rate your Audit Experience
          </h3>
          {submitted ? (
            <div style={styles.successMsg}>
              <CheckCircle2 size={16} /> Thank you! Your feedback helps us improve.
            </div>
          ) : (
            <form onSubmit={handleFeedbackSubmit} style={styles.feedbackForm}>
              <div style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} onClick={() => setFeedback({...feedback, rating: star})}
                    style={{ cursor: 'pointer', color: star <= feedback.rating ? '#f59e0b' : '#cbd5e1' }}>★</span>
                ))}
              </div>
              <input type="text" placeholder="Share your feedback..." style={styles.feedbackInput} value={feedback.comment} onChange={(e) => setFeedback({...feedback, comment: e.target.value})} />
              <button type="submit" style={styles.feedbackBtn}>Send Feedback</button>
            </form>
          )}
        </section>

        <div style={styles.footer}>
          <button onClick={handleReview} disabled={loading} style={loading ? styles.btnOff : styles.btn}>
            {loading ? "SCANNING..." : "TRIGGER AI ANALYSIS"}
          </button>
        </div>

        {/* --- YOUR NAME FOOTER --- */}
        <footer style={styles.nameFooter}>
          <div style={styles.nameFooterLine}></div>
          <p style={styles.nameFooterText}>DESIGNED AND DEVELOPED BY SRISHTI</p>
        </footer>
      </div>

      {showUpgrade && (
          <div style={styles.overlay} onClick={() => !upgrading && setShowUpgrade(false)}>
              <div style={styles.upgradeCard} onClick={e => e.stopPropagation()}>
                  {!upgrading && <X size={20} style={styles.close} onClick={() => setShowUpgrade(false)} />}
                  <Crown size={40} color="#f59e0b" fill="#f59e0b" style={{marginBottom:'15px'}} />
                  <h2 style={{marginBottom:'10px'}}>Upgrade to Pro</h2>
                  <p style={{fontSize:'14px', color:'#64748b', marginBottom:'20px'}}>Free limit reached. Get unlimited audits and priority AI processing.</p>
                  <div style={{fontSize:'32px', fontWeight:'900', marginBottom:'20px'}}>$9.99<span style={{fontSize:'14px', color:'#94a3b8'}}>/mo</span></div>
                  <button style={styles.upgradeBtn} onClick={handleUpgrade} disabled={upgrading}>
                      {upgrading ? "PROCESSING..." : <><CreditCard size={18} /> ACTIVATE PRO NOW</>}
                  </button>
              </div>
          </div>
      )}

      {showAdmin && adminStats && (
        <div style={styles.overlay} onClick={() => setShowAdmin(false)}>
          <div style={{...styles.modal, width: '90%', maxWidth: '1000px'}} onClick={e => e.stopPropagation()}>
            <X size={20} style={styles.close} onClick={() => setShowAdmin(false)} />
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
               <h2 style={{display:'flex', alignItems:'center', gap:'10px'}}><ShieldCheck color="#f59e0b"/> System Administration</h2>
               <div style={{display:'flex', gap:'20px'}}>
                  <div style={styles.statCard}>Users: {adminStats.totalUsers}</div>
                  <div style={styles.statCard}>Total Audits: {adminStats.totalAudits}</div>
               </div>
            </div>
            <div style={{maxHeight: '450px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px'}}>
                <table style={styles.table}>
                   <thead style={{position: 'sticky', top: 0, background: '#f8fafc'}}>
                      <tr>
                         <th style={styles.th}>User Email</th>
                         <th style={styles.th}>Role</th>
                         <th style={styles.th}>Audits</th>
                         <th style={styles.th}>Actions</th>
                      </tr>
                   </thead>
                   <tbody>
                      {adminStats.users.map((u, i) => (
                         <tr key={i} style={{borderBottom: '1px solid #f1f5f9'}}>
                            <td style={styles.td}>{u.email}</td>
                            <td style={styles.td}>
                                <span style={{...styles.pro, background: u.role === 'admin' ? '#f59e0b' : '#6366f1'}}>
                                    {u.role.toUpperCase()}
                                </span>
                            </td>
                            <td style={styles.td}>{u.history.length}</td>
                            <td style={styles.td}>
                                <div style={{display: 'flex', gap: '10px'}}>
                                    <button onClick={() => handleToggleRole(u._id, u.role)} style={styles.actionBtn}><Users size={16} color="#6366f1" /></button>
                                    {u.email !== user.email && (
                                        <button onClick={() => handleDeleteUser(u._id)} style={{...styles.actionBtn, borderColor: '#fecaca'}}><Trash2 size={16} color="#f43f5e" /></button>
                                    )}
                                </div>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
            </div>
          </div>
        </div>
      )}

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

      {showHistory && (
        <div style={styles.overlay} onClick={() => setShowHistory(false)}>
          <div style={styles.historyPanel} onClick={e => e.stopPropagation()}>
            <div style={styles.paneHead}>RECORDS HISTORY</div>
            <div style={{padding: '15px'}}>
              {history.length > 0 ? history.map((h, i) => (
                <div key={i} style={styles.historyItem} onClick={() => {setCode(h.codeSnippet); setReview(h.review); setShowHistory(false);}}>
                  <div style={{fontWeight: 'bold', fontSize: '12px'}}>Session {history.length - i}</div>
                  <div style={{fontSize: '11px', color: '#64748b'}}>{new Date(h.createdAt).toLocaleDateString()} | Score: {h.score}%</div>
                </div>
              )) : <p style={{fontSize:'12px', color:'#94a3b8', textAlign:'center'}}>No history found</p>}
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
  usageTag: { background: "#f1f5f9", padding: "5px 12px", borderRadius: "8px", fontSize: "11px", fontWeight: "800", display: "flex", alignItems: "center", gap: "6px", color: "#475569" },
  userLabel: { fontSize: "12px", color: "#64748b", fontWeight: "600" },
  score: { background: "#f0fdf4", color: "#16a34a", padding: "5px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "800", border: "1px solid #bbf7d0" },
  pdfBtn: { background: "#1e293b", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" },
  main: { flex: 1, display: "flex", padding: "20px", gap: "20px", overflow: "hidden" },
  pane: { flex: 1, background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", overflow: "hidden" },
  paneHead: { padding: "10px 15px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: "11px", fontWeight: "700", color: "#64748b", display: "flex", alignItems: "center", gap: "8px" },
  editor: { flex: 1, padding: "20px", border: "none", outline: "none", resize: "none", fontSize: "14px", fontFamily: "'Fira Code', monospace" },
  preview: { flex: 1, padding: "20px", overflowY: "auto" },
  applyBtn: { background: "#6366f1", color: "#fff", border: "none", padding: "8px 15px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", fontWeight: "700", marginBottom: "15px" },
  copyButton: { position: 'absolute', top: '12px', right: '12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', padding: '6px', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' },
  fixedCodeBox: { background: "#0f172a", padding: "15px", borderRadius: "12px", border: "1px solid #1e293b" },
  fixedLabel: { color: "#6366f1", fontSize: "10px", fontWeight: "900", marginBottom: "8px", letterSpacing: "1px" },
  pre: { margin: 0, color: "#7dd3fc", fontSize: "13px", overflowX: "auto" },
  footer: { height: "80px", display: "flex", justifyContent: "center", alignItems: "center" },
  btn: { background: "#6366f1", color: "#fff", padding: "14px 50px", borderRadius: "10px", border: "none", fontSize: "15px", fontWeight: "800", cursor: "pointer" },
  btnOff: { background: "#e2e8f0", color: "#94a3b8", padding: "14px 50px", borderRadius: "10px" },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  modal: { background: '#fff', padding: '40px', borderRadius: '20px', width: '350px', position: 'relative' },
  upgradeCard: { background: '#fff', padding: '40px', borderRadius: '24px', width: '380px', position: 'relative', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  upgradeBtn: { width: '100%', background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff', padding: '15px', borderRadius: '12px', border: 'none', fontWeight: '800', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' },
  close: { position: 'absolute', top: '20px', right: '20px', cursor: 'pointer', color: '#94a3b8' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' },
  authBtn: { background: '#6366f1', color: '#fff', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' },
  switch: { marginTop: '20px', fontSize: '13px', textAlign: 'center', color: '#6366f1', cursor: 'pointer' },
  historyPanel: { position: 'absolute', right: 0, height: '100%', width: '300px', background: '#fff', boxShadow: '-10px 0 30px rgba(0,0,0,0.1)' },
  historyItem: { padding: '15px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' },
  loader: { height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '15px' },
  statCard: { background: '#f8fafc', padding: '10px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' },
  th: { padding: '15px', color: '#64748b', fontWeight: '800', borderBottom: '2px solid #e2e8f0' },
  td: { padding: '15px', color: '#1e293b' },
  actionBtn: { padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  
  feedbackSection: { margin: '0 20px 10px 20px', padding: '15px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' },
  feedbackForm: { display: 'flex', alignItems: 'center', gap: '15px' },
  stars: { fontSize: '20px', display: 'flex', gap: '4px' },
  feedbackInput: { flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', outline: 'none' },
  feedbackBtn: { background: '#f1f5f9', color: '#475569', border: 'none', padding: '8px 15px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' },
  successMsg: { color: '#16a34a', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', background: '#f0fdf4', padding: '8px', borderRadius: '8px' },

  // --- FOOTER STYLES ADDED ---
  nameFooter: { paddingBottom: '30px', textAlign: 'center', background: '#f8fafc' },
  nameFooterLine: { width: '35px', height: '2px', background: '#e2e8f0', margin: '0 auto 10px auto', borderRadius: '2px' },
  nameFooterText: { fontSize: '10px', color: '#94a3b8', letterSpacing: '2px', fontWeight: '600', textTransform: 'uppercase' }
};

export default App;