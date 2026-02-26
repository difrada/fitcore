import { useState, useEffect } from "react";
import { api, useAuth } from "../App";

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [todayLog, setTodayLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quickMood, setQuickMood] = useState("");
  const [quickSleep, setQuickSleep] = useState("");

  useEffect(() => {
    Promise.all([
      api("/dashboard/summary").catch(() => null),
      api("/logs/today").catch(() => null),
    ]).then(([s, t]) => {
      setSummary(s);
      setTodayLog(t);
      setLoading(false);
    });
  }, []);

  const logMoodSleep = async () => {
    if (!quickMood && !quickSleep) return;
    try {
      await api("/logs/mood-sleep", {
        method: "POST",
        body: { mood: quickMood, sleepHours: quickSleep ? parseFloat(quickSleep) : null },
      });
      setQuickMood("");
      setQuickSleep("");
    } catch {}
  };

  const profile = user?.profile || {};
  const goals = {
    weight: { current: profile.currentWeight, target: profile.targetWeight, unit: "kg", label: "Peso" },
    bodyFat: { current: profile.bodyFatPct, target: profile.targetBodyFatPct, unit: "%", label: "% Grasa" },
    muscle: { current: profile.musclePct, target: profile.targetMusclePct, unit: "%", label: "% Músculo" },
  };

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Buenos {getGreeting()}, <span className="accent">{user?.name?.split(" ")[0]}</span></h1>
        <p className="page-subtitle">Aquí tienes tu resumen del día</p>
      </div>

      {/* Goal Progress Cards */}
      <section className="section">
        <h2 className="section-title">Objetivos Principales</h2>
        <div className="goals-grid">
          {Object.entries(goals).map(([key, g]) => (
            g.target && (
              <GoalCard key={key} label={g.label} current={g.current} target={g.target} unit={g.unit} />
            )
          ))}
        </div>
      </section>

      {/* Performance Goals */}
      {profile.performanceGoals?.length > 0 && profile.performanceGoals[0]?.discipline && (
        <section className="section">
          <h2 className="section-title">Metas de Rendimiento</h2>
          <div className="perf-goals-grid">
            {profile.performanceGoals.filter(g => g.discipline).map((g, i) => (
              <div key={i} className="perf-card">
                <span className="perf-discipline">{g.discipline}</span>
                <span className="perf-target">{g.goal} {g.metric}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick Log */}
      <section className="section">
        <h2 className="section-title">Registro Rápido</h2>
        <div className="quick-log-card">
          <div className="quick-log-row">
            <div className="quick-field">
              <label>Estado de ánimo</label>
              <div className="mood-selector">
                {["😊", "😐", "😔", "😤", "😴"].map((m) => (
                  <button
                    key={m}
                    className={`mood-btn ${quickMood === m ? "active" : ""}`}
                    onClick={() => setQuickMood(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="quick-field">
              <label>Horas de sueño</label>
              <input
                type="number"
                value={quickSleep}
                onChange={(e) => setQuickSleep(e.target.value)}
                placeholder="7.5"
                step="0.5"
                min="0"
                max="16"
              />
            </div>
            <button className="quick-save-btn" onClick={logMoodSleep}>
              Guardar
            </button>
          </div>
        </div>
      </section>

      {/* Today's Summary */}
      <section className="section">
        <h2 className="section-title">Hoy</h2>
        <div className="today-grid">
          <SummaryCard
            icon="🔥"
            label="Calorías consumidas"
            value={summary?.todayCalories || 0}
            target={summary?.targetCalories || "—"}
            unit="kcal"
          />
          <SummaryCard
            icon="💪"
            label="Ejercicio"
            value={summary?.todayExerciseMinutes || 0}
            target={summary?.targetExerciseMinutes || "—"}
            unit="min"
          />
          <SummaryCard
            icon="💧"
            label="Proteína"
            value={summary?.todayProtein || 0}
            target={summary?.targetProtein || "—"}
            unit="g"
          />
          <SummaryCard
            icon="😴"
            label="Sueño"
            value={todayLog?.sleepHours || "—"}
            target={profile.sleepHours || 7}
            unit="hrs"
          />
        </div>
      </section>

      {/* AI Tip */}
      {summary?.aiTip && (
        <section className="section">
          <div className="ai-tip-card">
            <span className="ai-tip-icon">⬡</span>
            <div>
              <h3>Consejo del día</h3>
              <p>{summary.aiTip}</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function GoalCard({ label, current, target, unit }) {
  const curr = parseFloat(current) || 0;
  const tgt = parseFloat(target) || 1;
  const diff = Math.abs(tgt - curr);
  const total = Math.abs(tgt - curr) || 1;
  // For weight/fat going down vs muscle going up
  const progress = curr && tgt ? Math.min(100, Math.max(0, (1 - diff / Math.max(curr, tgt)) * 100)) : 0;

  return (
    <div className="goal-card">
      <div className="goal-header">
        <span className="goal-label">{label}</span>
        <span className="goal-values">{curr}{unit} → {tgt}{unit}</span>
      </div>
      <div className="goal-bar-bg">
        <div className="goal-bar-fill" style={{ width: `${progress}%` }} />
      </div>
      <span className="goal-diff">Faltan {diff.toFixed(1)}{unit}</span>
    </div>
  );
}

function SummaryCard({ icon, label, value, target, unit }) {
  return (
    <div className="summary-card">
      <span className="summary-icon">{icon}</span>
      <div className="summary-info">
        <span className="summary-label">{label}</span>
        <span className="summary-value">{value} <small>/ {target} {unit}</small></span>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "días";
  if (h < 18) return "tardes";
  return "noches";
}
