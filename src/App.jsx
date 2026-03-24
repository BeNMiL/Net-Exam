import { useState, useEffect, useCallback, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, PieChart, Pie, Cell } from "recharts";
import QUESTIONS from "./questions.js";

// ─── DOMAIN METADATA ─────────────────────────────────────────────────────────
const DOMAINS = {
  "1.0": { name: "Networking Concepts", pct: 23, color: "#3b82f6", icon: "🌐" },
  "2.0": { name: "Network Implementation", pct: 20, color: "#8b5cf6", icon: "🔧" },
  "3.0": { name: "Network Operations", pct: 19, color: "#10b981", icon: "⚙️" },
  "4.0": { name: "Network Security", pct: 14, color: "#f59e0b", icon: "🛡️" },
  "5.0": { name: "Network Troubleshooting", pct: 24, color: "#ef4444", icon: "🔍" },
};

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const formatTime = (s) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const getGrade = (pct) => {
  if (pct >= 90) return { letter: "A", color: "#10b981" };
  if (pct >= 80) return { letter: "B", color: "#3b82f6" };
  if (pct >= 72) return { letter: "C", color: "#f59e0b" };
  if (pct >= 60) return { letter: "D", color: "#f97316" };
  return { letter: "F", color: "#ef4444" };
};

// ─── SUBNET CALCULATOR COMPONENT ─────────────────────────────────────────────
function SubnetCalc({ onClose }) {
  const [ip, setIp] = useState("192.168.1.0");
  const [cidr, setCidr] = useState(24);
  const calc = () => {
    try {
      const parts = ip.split(".").map(Number);
      if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return null;
      const ipNum = (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
      const mask = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
      const net = (ipNum & mask) >>> 0;
      const bcast = (net | ~mask) >>> 0;
      const first = (net + 1) >>> 0;
      const last = (bcast - 1) >>> 0;
      const hosts = Math.max(0, Math.pow(2, 32 - cidr) - 2);
      const toIp = (n) => `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;
      return { network: toIp(net), broadcast: toIp(bcast), first: toIp(first), last: toIp(last), mask: toIp(mask), hosts, subnets: Math.pow(2, cidr - Math.floor(cidr / 8) * 8 > 0 ? cidr % 8 : 0) };
    } catch { return null; }
  };
  const result = calc();
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#1a1a2e", borderRadius: 16, padding: 32, maxWidth: 480, width: "90%", border: "1px solid #333" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          <h3 style={{ margin: 0, color: "#e2e8f0", fontSize: 20 }}>🧮 Subnet Calculator</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 24, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="IP Address" style={{ flex: 1, padding: "10px 14px", background: "#0d1117", border: "1px solid #333", borderRadius: 8, color: "#e2e8f0", fontSize: 16 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: "#94a3b8", fontSize: 18 }}>/</span>
            <input type="number" min={0} max={32} value={cidr} onChange={(e) => setCidr(Number(e.target.value))} style={{ width: 60, padding: "10px 8px", background: "#0d1117", border: "1px solid #333", borderRadius: 8, color: "#e2e8f0", fontSize: 16, textAlign: "center" }} />
          </div>
        </div>
        {result && (
          <div style={{ display: "grid", gap: 10 }}>
            {[["Network", result.network], ["Subnet Mask", result.mask], ["First Host", result.first], ["Last Host", result.last], ["Broadcast", result.broadcast], ["Usable Hosts", result.hosts.toLocaleString()]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#0d1117", borderRadius: 8 }}>
                <span style={{ color: "#94a3b8", fontSize: 14 }}>{k}</span>
                <span style={{ color: "#e2e8f0", fontFamily: "monospace", fontSize: 14 }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("home");
  const [history, setHistory] = useState([]);
  const [flagged, setFlagged] = useState([]);
  const [showCalc, setShowCalc] = useState(false);
  
  // Exam config
  const [examDomain, setExamDomain] = useState("all");
  const [examMode, setExamMode] = useState("study");
  const [examCount, setExamCount] = useState(20);
  
  // Active exam state
  const [examQs, setExamQs] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({});
  const [timer, setTimer] = useState(0);
  const [examActive, setExamActive] = useState(false);
  const [examFinished, setExamFinished] = useState(false);
  const [examResult, setExamResult] = useState(null);
  const timerRef = useRef(null);
  const [usedIds, setUsedIds] = useState(new Set());

  // ─── LOAD/SAVE STATE ─────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const h = localStorage.getItem("exam-history");
      if (h) setHistory(JSON.parse(h));
    } catch {}
    try {
      const f = localStorage.getItem("flagged-questions");
      if (f) setFlagged(JSON.parse(f));
    } catch {}
    try {
      const u = localStorage.getItem("used-question-ids");
      if (u) setUsedIds(new Set(JSON.parse(u)));
    } catch {}
  }, []);

  const saveHistory = (h) => {
    setHistory(h);
    try { localStorage.setItem("exam-history", JSON.stringify(h)); } catch {}
  };
  const saveFlagged = (f) => {
    setFlagged(f);
    try { localStorage.setItem("flagged-questions", JSON.stringify(f)); } catch {}
  };
  const saveUsedIds = (ids) => {
    setUsedIds(ids);
    try { localStorage.setItem("used-question-ids", JSON.stringify([...ids])); } catch {}
  };

  // ─── TIMER ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (examActive && !examFinished) {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [examActive, examFinished]);

  // ─── START EXAM ──────────────────────────────────────────────────────────
  const startExam = () => {
    let pool = examDomain === "all" ? [...QUESTIONS] : QUESTIONS.filter((q) => q.domain === examDomain);
    // Prioritize questions not recently used
    const unused = pool.filter((q) => !usedIds.has(q.id));
    let selected;
    if (unused.length >= examCount) {
      selected = shuffle(unused).slice(0, examCount);
    } else {
      selected = shuffle(pool).slice(0, examCount);
    }
    // Track used IDs
    const newUsed = new Set(usedIds);
    selected.forEach((q) => newUsed.add(q.id));
    if (newUsed.size > QUESTIONS.length * 0.8) {
      // Reset if we've used most questions
      saveUsedIds(new Set(selected.map((q) => q.id)));
    } else {
      saveUsedIds(newUsed);
    }
    
    setExamQs(selected);
    setCurrentQ(0);
    setAnswers({});
    setRevealed({});
    setTimer(0);
    setExamActive(true);
    setExamFinished(false);
    setExamResult(null);
    setView("exam");
  };

  // ─── ANSWER HANDLING ─────────────────────────────────────────────────────
  const handleAnswer = (qIdx, optIdx) => {
    const q = examQs[qIdx];
    const current = answers[qIdx] || [];
    let newAns;
    if (q.type === "multi") {
      newAns = current.includes(optIdx) ? current.filter((i) => i !== optIdx) : [...current, optIdx];
    } else {
      newAns = [optIdx];
    }
    setAnswers({ ...answers, [qIdx]: newAns });
  };

  const submitAnswer = (qIdx) => {
    setRevealed({ ...revealed, [qIdx]: true });
  };

  // ─── FINISH EXAM ─────────────────────────────────────────────────────────
  const finishExam = () => {
    clearInterval(timerRef.current);
    let correct = 0;
    const domainScores = {};
    examQs.forEach((q, i) => {
      const userAns = (answers[i] || []).sort().join(",");
      const correctAns = q.ans.sort().join(",");
      const isCorrect = userAns === correctAns;
      if (isCorrect) correct++;
      if (!domainScores[q.domain]) domainScores[q.domain] = { correct: 0, total: 0 };
      domainScores[q.domain].total++;
      if (isCorrect) domainScores[q.domain].correct++;
    });
    const pct = Math.round((correct / examQs.length) * 100);
    const result = {
      id: Date.now(),
      date: new Date().toISOString(),
      domain: examDomain,
      mode: examMode,
      total: examQs.length,
      correct,
      pct,
      time: timer,
      domainScores,
    };
    setExamResult(result);
    setExamFinished(true);
    saveHistory([result, ...history].slice(0, 50));
  };

  // ─── TOGGLE FLAG ─────────────────────────────────────────────────────────
  const toggleFlag = (qId) => {
    const newF = flagged.includes(qId) ? flagged.filter((f) => f !== qId) : [...flagged, qId];
    saveFlagged(newF);
  };

  // ─── STATS COMPUTATION ───────────────────────────────────────────────────
  const domainStats = Object.keys(DOMAINS).map((d) => {
    const relevant = history.filter((h) => h.domain === "all" || h.domain === d);
    const scores = relevant.flatMap((h) => (h.domainScores[d] ? [Math.round((h.domainScores[d].correct / h.domainScores[d].total) * 100)] : []));
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return { domain: d, name: DOMAINS[d].name.split(" ").slice(-1)[0], fullName: DOMAINS[d].name, avg, attempts: scores.length, color: DOMAINS[d].color };
  });

  // ─── RENDER ────────────────────────────────────────────────────────────────
  const styles = {
    app: { minHeight: "100vh", background: "#0a0a1a", color: "#e2e8f0", fontFamily: "'Geist', 'SF Pro Display', -apple-system, sans-serif" },
    nav: { background: "linear-gradient(135deg, #0d1117 0%, #161b22 100%)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(20px)" },
    btn: { padding: "10px 20px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, transition: "all 0.2s" },
    card: { background: "rgba(255,255,255,0.03)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", padding: 24, transition: "all 0.3s" },
  };

  // ─── HOME VIEW ─────────────────────────────────────────────────────────────
  if (view === "home") {
    const recent = history[0];
    const totalAttempts = history.length;
    const avgScore = totalAttempts ? Math.round(history.reduce((a, h) => a + h.pct, 0) / totalAttempts) : 0;
    const bestScore = totalAttempts ? Math.max(...history.map((h) => h.pct)) : 0;
    const trendData = history.slice(0, 10).reverse().map((h, i) => ({ name: `#${i + 1}`, score: h.pct }));

    return (
      <div style={styles.app}>
        {showCalc && <SubnetCalc onClose={() => setShowCalc(false)} />}
        <nav style={styles.nav}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>N+</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" }}>Network+ N10-009</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Practice Exam Platform</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowCalc(true)} style={{ ...styles.btn, background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}>🧮 Subnet Calc</button>
            <button onClick={() => setView("progress")} style={{ ...styles.btn, background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}>📊 Progress</button>
            <button onClick={() => setView("flagged")} style={{ ...styles.btn, background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}>🚩 Flagged ({flagged.length})</button>
          </div>
        </nav>

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
          {/* Stats Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
            {[
              { label: "Total Attempts", value: totalAttempts, icon: "📝", color: "#3b82f6" },
              { label: "Average Score", value: `${avgScore}%`, icon: "📊", color: "#10b981" },
              { label: "Best Score", value: `${bestScore}%`, icon: "🏆", color: "#f59e0b" },
              { label: "Questions Seen", value: usedIds.size, icon: "📚", color: "#8b5cf6" },
            ].map((s) => (
              <div key={s.label} style={{ ...styles.card, textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: s.color, letterSpacing: "-0.03em" }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Recent + Trend */}
          {recent && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 16, marginBottom: 32 }}>
              <div style={styles.card}>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Last Attempt</div>
                <div style={{ fontSize: 48, fontWeight: 800, color: getGrade(recent.pct).color, letterSpacing: "-0.04em" }}>{recent.pct}%</div>
                <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
                  {recent.correct}/{recent.total} correct • {formatTime(recent.time)} • {recent.domain === "all" ? "All Domains" : DOMAINS[recent.domain]?.name}
                </div>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>{new Date(recent.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
              </div>
              <div style={styles.card}>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Score Trend</div>
                {trendData.length > 1 ? (
                  <ResponsiveContainer width="100%" height={130}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} />
                      <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6" }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 130, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>Take more tests to see trends</div>
                )}
              </div>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div style={{ ...styles.card, marginBottom: 32 }}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>Attempt History</div>
              <div style={{ maxHeight: 200, overflowY: "auto" }}>
                {history.slice(0, 10).map((h, i) => (
                  <div key={h.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 9 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: getGrade(h.pct).color + "20", color: getGrade(h.pct).color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>{getGrade(h.pct).letter}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{h.pct}% — {h.correct}/{h.total}</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>{h.domain === "all" ? "All Domains" : DOMAINS[h.domain]?.name} • {h.mode} mode</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "#475569" }}>{new Date(h.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Domain Selection */}
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>Start a Practice Session</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
            <div onClick={() => { setExamDomain("all"); setView("config"); }} style={{ ...styles.card, cursor: "pointer", textAlign: "center", borderColor: "rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.05)" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Full Exam</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>All 5 domains mixed</div>
              <div style={{ fontSize: 11, color: "#3b82f6", marginTop: 6 }}>90 questions available</div>
            </div>
            {Object.entries(DOMAINS).map(([key, d]) => (
              <div key={key} onClick={() => { setExamDomain(key); setView("config"); }} style={{ ...styles.card, cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{d.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{key}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{d.name}</div>
                <div style={{ fontSize: 11, color: d.color, marginTop: 6 }}>{QUESTIONS.filter((q) => q.domain === key).length} questions • {d.pct}% of exam</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── CONFIG VIEW ───────────────────────────────────────────────────────────
  if (view === "config") {
    const poolSize = examDomain === "all" ? QUESTIONS.length : QUESTIONS.filter((q) => q.domain === examDomain).length;
    return (
      <div style={styles.app}>
        <nav style={styles.nav}>
          <button onClick={() => setView("home")} style={{ ...styles.btn, background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}>← Back</button>
          <div style={{ fontWeight: 700 }}>{examDomain === "all" ? "Full Exam" : `${examDomain} — ${DOMAINS[examDomain].name}`}</div>
          <div />
        </nav>
        <div style={{ maxWidth: 500, margin: "60px auto", padding: "0 24px" }}>
          <div style={styles.card}>
            <h2 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>Configure Your Session</h2>
            
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Mode</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { key: "study", label: "📖 Study Mode", desc: "Instant feedback, explanations, hints" },
                  { key: "exam", label: "📝 Exam Mode", desc: "Timed, no hints, score at end" },
                ].map((m) => (
                  <div key={m.key} onClick={() => setExamMode(m.key)} style={{ ...styles.card, cursor: "pointer", borderColor: examMode === m.key ? "#3b82f6" : "rgba(255,255,255,0.06)", background: examMode === m.key ? "rgba(59,130,246,0.08)" : "transparent" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{m.label}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{m.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Questions ({poolSize} available)</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[10, 20, 30, 50, 90].filter((n) => n <= poolSize).map((n) => (
                  <button key={n} onClick={() => setExamCount(n)} style={{ ...styles.btn, background: examCount === n ? "#3b82f6" : "rgba(255,255,255,0.06)", color: examCount === n ? "#fff" : "#94a3b8", minWidth: 56 }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={startExam} style={{ ...styles.btn, width: "100%", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", color: "#fff", fontSize: 16, padding: "14px 24px" }}>
              🚀 Start {examMode === "exam" ? "Exam" : "Study Session"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── EXAM VIEW ─────────────────────────────────────────────────────────────
  if (view === "exam") {
    if (examFinished && examResult) {
      // Results view
      const domainBreakdown = Object.entries(examResult.domainScores).map(([d, s]) => ({
        domain: d,
        name: DOMAINS[d]?.name || d,
        pct: Math.round((s.correct / s.total) * 100),
        correct: s.correct,
        total: s.total,
        color: DOMAINS[d]?.color || "#888",
      }));
      const passed = examResult.pct >= 72;

      return (
        <div style={styles.app}>
          {showCalc && <SubnetCalc onClose={() => setShowCalc(false)} />}
          <nav style={styles.nav}>
            <button onClick={() => setView("home")} style={{ ...styles.btn, background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}>← Home</button>
            <div style={{ fontWeight: 700 }}>Results</div>
            <div />
          </nav>
          <div style={{ maxWidth: 700, margin: "40px auto", padding: "0 24px" }}>
            <div style={{ ...styles.card, textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 72, fontWeight: 900, color: passed ? "#10b981" : "#ef4444", letterSpacing: "-0.04em" }}>{examResult.pct}%</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: passed ? "#10b981" : "#ef4444", marginBottom: 4 }}>{passed ? "PASS" : "NEEDS IMPROVEMENT"}</div>
              <div style={{ fontSize: 14, color: "#64748b" }}>{examResult.correct}/{examResult.total} correct • {formatTime(examResult.time)} elapsed</div>
              <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>Passing score: 720/900 (~72%)</div>
            </div>

            <div style={styles.card}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>Domain Breakdown</div>
              {domainBreakdown.map((d) => (
                <div key={d.domain} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{d.domain} {d.name}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: d.pct >= 72 ? "#10b981" : "#ef4444" }}>{d.pct}% ({d.correct}/{d.total})</span>
                  </div>
                  <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${d.pct}%`, background: d.color, borderRadius: 4, transition: "width 1s ease" }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button onClick={() => { setExamFinished(false); setCurrentQ(0); }} style={{ ...styles.btn, flex: 1, background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}>📋 Review Answers</button>
              <button onClick={() => setView("home")} style={{ ...styles.btn, flex: 1, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", color: "#fff" }}>🏠 Back to Home</button>
            </div>
          </div>
        </div>
      );
    }

    // Active exam
    const q = examQs[currentQ];
    if (!q) return null;
    const userAns = answers[currentQ] || [];
    const isRevealed = revealed[currentQ];
    const isCorrect = isRevealed && userAns.sort().join(",") === [...q.ans].sort().join(",");
    const isFlagged = flagged.includes(q.id);
    const answeredCount = Object.keys(answers).length;
    const timeLimit = examMode === "exam" ? examQs.length * 60 : null; // 1 min per question in exam

    return (
      <div style={styles.app}>
        {showCalc && <SubnetCalc onClose={() => setShowCalc(false)} />}
        {/* Top bar */}
        <nav style={styles.nav}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => { if (confirm("End this session?")) { setExamActive(false); setView("home"); } }} style={{ ...styles.btn, background: "rgba(255,255,255,0.06)", color: "#94a3b8", padding: "8px 14px" }}>✕</button>
            <span style={{ fontSize: 14, color: "#64748b" }}>Q {currentQ + 1} / {examQs.length}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setShowCalc(true)} style={{ ...styles.btn, background: "rgba(255,255,255,0.06)", color: "#94a3b8", padding: "8px 12px", fontSize: 13 }}>🧮</button>
            <span style={{ fontFamily: "monospace", fontSize: 16, color: timeLimit && timer > timeLimit * 0.8 ? "#ef4444" : "#94a3b8" }}>⏱ {formatTime(timer)}</span>
            <span style={{ fontSize: 13, color: "#64748b" }}>{answeredCount}/{examQs.length} answered</span>
          </div>
        </nav>

        <div style={{ maxWidth: 740, margin: "24px auto", padding: "0 24px" }}>
          {/* Question nav dots */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 20, justifyContent: "center" }}>
            {examQs.map((_, i) => {
              const answered = answers[i] !== undefined;
              const isActive = i === currentQ;
              const wasFlagged = flagged.includes(examQs[i].id);
              let bg = "rgba(255,255,255,0.06)";
              if (isActive) bg = "#3b82f6";
              else if (examMode === "study" && revealed[i]) {
                const ua = (answers[i] || []).sort().join(",");
                const ca = [...examQs[i].ans].sort().join(",");
                bg = ua === ca ? "#10b981" : "#ef4444";
              } else if (answered) bg = "rgba(59,130,246,0.3)";
              return (
                <div key={i} onClick={() => setCurrentQ(i)} style={{ width: 28, height: 28, borderRadius: 6, background: bg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 11, fontWeight: 600, color: isActive ? "#fff" : "#94a3b8", position: "relative" }}>
                  {i + 1}
                  {wasFlagged && <div style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />}
                </div>
              );
            })}
          </div>

          {/* Domain badge */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, background: DOMAINS[q.domain]?.color + "20", color: DOMAINS[q.domain]?.color, fontWeight: 600 }}>
              {q.domain} {DOMAINS[q.domain]?.name}
            </span>
            <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}>
              {q.type === "multi" ? "Select all that apply" : "Single answer"}
            </span>
          </div>

          {/* Question */}
          <div style={{ ...styles.card, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, lineHeight: 1.6, flex: 1, paddingRight: 16 }}>{q.q}</h3>
              <button onClick={() => toggleFlag(q.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, flexShrink: 0 }}>
                {isFlagged ? "🚩" : "🏳️"}
              </button>
            </div>

            {/* Options */}
            <div style={{ display: "grid", gap: 10 }}>
              {q.opts.map((opt, oi) => {
                const selected = userAns.includes(oi);
                const isCorrectOpt = q.ans.includes(oi);
                let optBg = "rgba(255,255,255,0.03)";
                let optBorder = "rgba(255,255,255,0.08)";
                let optColor = "#e2e8f0";

                if (isRevealed) {
                  if (isCorrectOpt) { optBg = "rgba(16,185,129,0.1)"; optBorder = "#10b981"; optColor = "#10b981"; }
                  else if (selected && !isCorrectOpt) { optBg = "rgba(239,68,68,0.1)"; optBorder = "#ef4444"; optColor = "#ef4444"; }
                } else if (selected) {
                  optBg = "rgba(59,130,246,0.1)"; optBorder = "#3b82f6"; optColor = "#3b82f6";
                }

                return (
                  <div key={oi} onClick={() => !isRevealed && handleAnswer(currentQ, oi)} style={{ padding: "14px 16px", borderRadius: 10, border: `2px solid ${optBorder}`, background: optBg, cursor: isRevealed ? "default" : "pointer", display: "flex", alignItems: "center", gap: 12, transition: "all 0.15s" }}>
                    <div style={{ width: 28, height: 28, borderRadius: q.type === "multi" ? 6 : "50%", border: `2px solid ${selected || (isRevealed && isCorrectOpt) ? optBorder : "rgba(255,255,255,0.15)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: selected || (isRevealed && isCorrectOpt) ? optBg : "transparent", fontSize: 13, fontWeight: 700, color: optColor }}>
                      {isRevealed ? (isCorrectOpt ? "✓" : selected ? "✗" : String.fromCharCode(65 + oi)) : String.fromCharCode(65 + oi)}
                    </div>
                    <span style={{ fontSize: 15, color: optColor }}>{opt}</span>
                  </div>
                );
              })}
            </div>

            {/* Explanation (study mode) */}
            {examMode === "study" && isRevealed && (
              <div style={{ marginTop: 16, padding: 16, borderRadius: 10, background: isCorrect ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)", border: `1px solid ${isCorrect ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}` }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: isCorrect ? "#10b981" : "#ef4444" }}>
                  {isCorrect ? "✅ Correct!" : "❌ Incorrect"}
                </div>
                <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.7 }}>{q.exp}</div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
            <button onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0} style={{ ...styles.btn, background: "rgba(255,255,255,0.06)", color: currentQ === 0 ? "#333" : "#94a3b8" }}>← Previous</button>
            <div style={{ display: "flex", gap: 10 }}>
              {examMode === "study" && !isRevealed && userAns.length > 0 && (
                <button onClick={() => submitAnswer(currentQ)} style={{ ...styles.btn, background: "#10b981", color: "#fff" }}>Check Answer</button>
              )}
              {currentQ < examQs.length - 1 ? (
                <button onClick={() => setCurrentQ(currentQ + 1)} style={{ ...styles.btn, background: "#3b82f6", color: "#fff" }}>Next →</button>
              ) : (
                <button onClick={finishExam} style={{ ...styles.btn, background: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "#fff" }}>
                  🏁 Finish {examMode === "exam" ? "Exam" : "Session"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── PROGRESS VIEW ─────────────────────────────────────────────────────────
  if (view === "progress") {
    const radarData = domainStats.map((d) => ({ subject: d.domain, score: d.avg, fullMark: 100 }));
    return (
      <div style={styles.app}>
        <nav style={styles.nav}>
          <button onClick={() => setView("home")} style={{ ...styles.btn, background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}>← Back</button>
          <div style={{ fontWeight: 700 }}>📊 Progress Dashboard</div>
          <div />
        </nav>
        <div style={{ maxWidth: 800, margin: "32px auto", padding: "0 24px" }}>
          {/* Radar chart */}
          <div style={{ ...styles.card, marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>Domain Proficiency</div>
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 13 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 11 }} />
                  <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>Complete some tests to see your progress</div>
            )}
          </div>

          {/* Domain bars */}
          <div style={styles.card}>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>Domain Scores</div>
            {domainStats.map((d) => (
              <div key={d.domain} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: d.color }}>{d.domain}</span>
                    <span style={{ fontSize: 14, color: "#94a3b8", marginLeft: 8 }}>{d.fullName}</span>
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 800, color: d.avg >= 72 ? "#10b981" : d.avg > 0 ? "#f59e0b" : "#475569" }}>{d.avg}%</span>
                </div>
                <div style={{ height: 10, background: "rgba(255,255,255,0.06)", borderRadius: 5, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${d.avg}%`, background: `linear-gradient(90deg, ${d.color}, ${d.color}aa)`, borderRadius: 5, transition: "width 1s ease" }} />
                </div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>{d.attempts} attempt{d.attempts !== 1 ? "s" : ""} • {QUESTIONS.filter((q) => q.domain === d.domain).length} questions in bank</div>
              </div>
            ))}
          </div>

          {/* Recommendations */}
          {history.length > 0 && (
            <div style={{ ...styles.card, marginTop: 24 }}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>💡 Study Recommendations</div>
              {domainStats.filter((d) => d.avg < 72 && d.attempts > 0).length > 0 ? (
                domainStats.filter((d) => d.avg < 72 && d.attempts > 0).sort((a, b) => a.avg - b.avg).map((d) => (
                  <div key={d.domain} style={{ padding: "10px 14px", marginBottom: 8, borderRadius: 8, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#ef4444" }}>Focus on {d.domain} {d.fullName}</span>
                    <span style={{ fontSize: 13, color: "#94a3b8", marginLeft: 8 }}>Currently at {d.avg}% — needs 72% to pass</span>
                  </div>
                ))
              ) : history.length > 0 ? (
                <div style={{ fontSize: 14, color: "#10b981" }}>You're above passing in all attempted domains. Keep practicing!</div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── FLAGGED VIEW ──────────────────────────────────────────────────────────
  if (view === "flagged") {
    const flaggedQs = QUESTIONS.filter((q) => flagged.includes(q.id));
    return (
      <div style={styles.app}>
        <nav style={styles.nav}>
          <button onClick={() => setView("home")} style={{ ...styles.btn, background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}>← Back</button>
          <div style={{ fontWeight: 700 }}>🚩 Flagged Questions ({flaggedQs.length})</div>
          <div />
        </nav>
        <div style={{ maxWidth: 740, margin: "32px auto", padding: "0 24px" }}>
          {flaggedQs.length === 0 ? (
            <div style={{ ...styles.card, textAlign: "center", padding: 48 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🏳️</div>
              <div style={{ fontSize: 16, color: "#64748b" }}>No flagged questions yet. Flag questions during practice to review them later.</div>
            </div>
          ) : (
            flaggedQs.map((q) => (
              <div key={q.id} style={{ ...styles.card, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 12, background: DOMAINS[q.domain]?.color + "20", color: DOMAINS[q.domain]?.color, fontWeight: 600, marginRight: 8 }}>{q.domain}</span>
                    <div style={{ fontSize: 15, fontWeight: 600, marginTop: 10, lineHeight: 1.5 }}>{q.q}</div>
                    <div style={{ fontSize: 13, color: "#10b981", marginTop: 10, lineHeight: 1.6 }}>
                      ✅ Answer: {q.ans.map((a) => q.opts[a]).join(", ")}
                    </div>
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 6, lineHeight: 1.6 }}>{q.exp}</div>
                  </div>
                  <button onClick={() => toggleFlag(q.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#f59e0b" }}>🚩</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return null;
}
