import { useState, useEffect, useRef } from "react";
import { api } from "../App";

export default function StatsPage() {
  const [range, setRange] = useState("week");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api(`/stats?range=${range}`)
      .then(setStats)
      .catch(() => setStats(getMockStats(range)))
      .finally(() => setLoading(false));
  }, [range]);

  return (
    <div className="stats-page">
      <div className="page-header">
        <h1>Estadísticas</h1>
        <div className="range-selector">
          {[
            { id: "week", label: "Semana" },
            { id: "month", label: "Mes" },
            { id: "year", label: "Año" },
          ].map((r) => (
            <button
              key={r.id}
              className={`range-btn ${range === r.id ? "active" : ""}`}
              onClick={() => setRange(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="stats-loading">Cargando estadísticas...</div>
      ) : stats ? (
        <>
          {/* Weight Trend */}
          <section className="section">
            <h2 className="section-title">Progreso de Peso</h2>
            <div className="chart-card">
              <MiniChart
                data={stats.weightTrend || []}
                target={stats.targetWeight}
                label="Peso"
                unit="kg"
                color="#00f0ff"
              />
            </div>
          </section>

          {/* Nutrition Overview */}
          <section className="section">
            <h2 className="section-title">Nutrición</h2>
            <div className="stats-grid-4">
              <StatCard label="Calorías/día" value={stats.avgCalories} target={stats.targetCalories} unit="kcal" color="#f97316" />
              <StatCard label="Proteína/día" value={stats.avgProtein} target={stats.targetProtein} unit="g" color="#4ade80" />
              <StatCard label="Carbos/día" value={stats.avgCarbs} target={stats.targetCarbs} unit="g" color="#facc15" />
              <StatCard label="Grasa/día" value={stats.avgFat} target={stats.targetFat} unit="g" color="#f472b6" />
            </div>
          </section>

          {/* Calories Chart */}
          <section className="section">
            <h2 className="section-title">Calorías Diarias</h2>
            <div className="chart-card">
              <BarChart data={stats.caloriesByDay || []} target={stats.targetCalories} color="#f97316" unit="kcal" />
            </div>
          </section>

          {/* Exercise */}
          <section className="section">
            <h2 className="section-title">Ejercicio</h2>
            <div className="stats-grid-3">
              <StatCard label="Minutos/día" value={stats.avgExerciseMin} target={stats.targetExerciseMin} unit="min" color="#00f0ff" />
              <StatCard label="Sesiones" value={stats.totalSessions} unit="" color="#a78bfa" />
              <StatCard label="Calorías quemadas" value={stats.totalCalBurned} unit="kcal" color="#f97316" />
            </div>
          </section>

          {/* Exercise Chart */}
          <section className="section">
            <h2 className="section-title">Minutos de Ejercicio</h2>
            <div className="chart-card">
              <BarChart data={stats.exerciseByDay || []} target={stats.targetExerciseMin} color="#00f0ff" unit="min" />
            </div>
          </section>

          {/* Body Composition */}
          <section className="section">
            <h2 className="section-title">Composición Corporal</h2>
            <div className="stats-grid-3">
              <ProgressRing label="% Grasa" current={stats.currentBodyFat} target={stats.targetBodyFat} color="#f97316" />
              <ProgressRing label="% Músculo" current={stats.currentMuscle} target={stats.targetMuscle} color="#4ade80" />
              <ProgressRing label="IMC" current={stats.currentBMI} target={stats.targetBMI} color="#00f0ff" />
            </div>
          </section>

          {/* Mood & Sleep */}
          <section className="section">
            <h2 className="section-title">Sueño y Estado de Ánimo</h2>
            <div className="chart-card">
              <MiniChart
                data={stats.sleepTrend || []}
                target={stats.targetSleep}
                label="Sueño"
                unit="hrs"
                color="#a78bfa"
              />
            </div>
            {stats.moodDistribution && (
              <div className="mood-distribution">
                {Object.entries(stats.moodDistribution).map(([mood, count]) => (
                  <div key={mood} className="mood-item">
                    <span className="mood-emoji">{mood}</span>
                    <span className="mood-count">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Performance Goals Tracking */}
          {stats.performanceProgress?.length > 0 && (
            <section className="section">
              <h2 className="section-title">Metas de Rendimiento</h2>
              <div className="perf-track-grid">
                {stats.performanceProgress.map((p, i) => (
                  <div key={i} className="perf-track-card">
                    <h4>{p.discipline}</h4>
                    <div className="perf-bar-bg">
                      <div className="perf-bar-fill" style={{ width: `${p.progress}%`, background: p.progress >= 100 ? "#4ade80" : "#00f0ff" }} />
                    </div>
                    <div className="perf-bar-labels">
                      <span>{p.current} {p.metric}</span>
                      <span>Meta: {p.target} {p.metric}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="stats-empty">No hay suficientes datos aún. ¡Empieza a registrar!</div>
      )}
    </div>
  );
}

function StatCard({ label, value, target, unit, color }) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <span className="stat-value" style={{ color }}>{value || 0}<small> {unit}</small></span>
      {target && (
        <>
          <div className="stat-bar-bg">
            <div className="stat-bar-fill" style={{ width: `${pct}%`, background: color }} />
          </div>
          <span className="stat-target">Meta: {target} {unit}</span>
        </>
      )}
    </div>
  );
}

function ProgressRing({ label, current, target, color }) {
  const pct = target ? Math.min(100, (current / target) * 100) : 0;
  const r = 45;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="progress-ring-card">
      <svg viewBox="0 0 100 100" className="progress-ring-svg">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        <text x="50" y="45" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
          {current || "—"}
        </text>
        <text x="50" y="62" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="8">
          Meta: {target || "—"}
        </text>
      </svg>
      <span className="ring-label">{label}</span>
    </div>
  );
}

function BarChart({ data, target, color, unit }) {
  if (!data.length) return <div className="chart-empty">Sin datos</div>;
  const max = Math.max(...data.map((d) => d.value), target || 0) * 1.2 || 1;

  return (
    <div className="bar-chart">
      {target && (
        <div className="bar-target-line" style={{ bottom: `${(target / max) * 100}%` }}>
          <span className="target-label">Meta: {target} {unit}</span>
        </div>
      )}
      <div className="bars">
        {data.map((d, i) => (
          <div key={i} className="bar-col">
            <div className="bar-wrapper">
              <div
                className="bar"
                style={{
                  height: `${(d.value / max) * 100}%`,
                  background: d.value >= (target || Infinity) ? color : `${color}88`,
                }}
              />
            </div>
            <span className="bar-label">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniChart({ data, target, label, unit, color }) {
  if (!data.length) return <div className="chart-empty">Sin datos</div>;
  const values = data.map((d) => d.value);
  const min = Math.min(...values, target || Infinity) * 0.95;
  const max = Math.max(...values, target || 0) * 1.05;
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * 100;
    const y = 100 - ((d.value - min) / range) * 100;
    return `${x},${y}`;
  }).join(" ");

  const targetY = target ? 100 - ((target - min) / range) * 100 : null;

  return (
    <div className="mini-chart">
      <div className="mini-chart-header">
        <span>{label}</span>
        <span className="mini-latest">{values[values.length - 1]} {unit}</span>
      </div>
      <svg viewBox="-5 -5 110 110" preserveAspectRatio="none" className="mini-chart-svg">
        {targetY !== null && (
          <line x1="0" y1={targetY} x2="100" y2={targetY} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
        )}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        {data.map((d, i) => {
          const x = (i / Math.max(data.length - 1, 1)) * 100;
          const y = 100 - ((d.value - min) / range) * 100;
          return <circle key={i} cx={x} cy={y} r="1.5" fill={color} />;
        })}
      </svg>
      <div className="mini-chart-labels">
        {data.filter((_, i) => i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2)).map((d, i) => (
          <span key={i}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

// Mock data fallback
function getMockStats(range) {
  const days = range === "week" ? 7 : range === "month" ? 30 : 12;
  const labels = range === "year"
    ? ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
    : Array.from({ length: days }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        return d.toLocaleDateString("es", { weekday: "short" });
      });

  return {
    weightTrend: labels.map((l, i) => ({ label: l, value: 80 - i * 0.2 + Math.random() * 0.5 })),
    targetWeight: 75,
    avgCalories: 2100, targetCalories: 2200,
    avgProtein: 120, targetProtein: 150,
    avgCarbs: 250, targetCarbs: 270,
    avgFat: 70, targetFat: 65,
    caloriesByDay: labels.map((l) => ({ label: l, value: 1800 + Math.random() * 600 })),
    avgExerciseMin: 45, targetExerciseMin: 60,
    totalSessions: range === "week" ? 5 : range === "month" ? 20 : 240,
    totalCalBurned: range === "week" ? 2500 : range === "month" ? 10000 : 120000,
    exerciseByDay: labels.map((l) => ({ label: l, value: Math.floor(Math.random() * 90) })),
    currentBodyFat: 18, targetBodyFat: 15,
    currentMuscle: 37, targetMuscle: 40,
    currentBMI: 24.5, targetBMI: 23,
    sleepTrend: labels.map((l) => ({ label: l, value: 6 + Math.random() * 3 })),
    targetSleep: 8,
    moodDistribution: { "😊": 4, "😐": 2, "😔": 1, "😤": 0, "😴": 1 },
    performanceProgress: [
      { discipline: "Sentadilla", current: 100, target: 120, metric: "kg", progress: 83 },
      { discipline: "5K Running", current: 28, target: 25, metric: "min", progress: 60 },
    ],
  };
}
