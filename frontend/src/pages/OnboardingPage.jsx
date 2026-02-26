import { useState } from "react";
import { api } from "../App";

const SPORTS_OPTIONS = [
  "Gimnasio / Pesas", "Running", "Ciclismo", "Natación", "CrossFit",
  "Yoga / Pilates", "Artes marciales", "Fútbol", "Básquet", "Tenis",
  "Calistenia", "Senderismo", "Danza", "Boxeo", "Otro"
];

const DIET_RESTRICTIONS = [
  "Sin gluten", "Vegetariano", "Vegano", "Sin lactosa", "Keto",
  "Bajo en sodio", "Sin frutos secos", "Halal", "Kosher", "Ninguna"
];

export default function OnboardingPage({ onComplete }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    // Body
    age: "", height: "", currentWeight: "", targetWeight: "",
    bodyFatPct: "", targetBodyFatPct: "",
    musclePct: "", targetMusclePct: "",
    // Sports & Goals
    currentSports: [],
    plannedSports: [],
    performanceGoals: [{ discipline: "", goal: "", metric: "" }],
    // Diet
    dietRestrictions: [],
    allergies: "",
    mealsPerDay: 3,
    // Lifestyle
    sleepHours: 7,
    stressLevel: "medio",
    activityLevel: "moderado",
    // Extra
    comments: "",
  });

  const update = (key, val) => setData((d) => ({ ...d, [key]: val }));

  const toggleInArray = (key, val) => {
    setData((d) => {
      const arr = d[key];
      return { ...d, [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] };
    });
  };

  const addPerformanceGoal = () => {
    setData((d) => ({
      ...d,
      performanceGoals: [...d.performanceGoals, { discipline: "", goal: "", metric: "" }],
    }));
  };

  const updateGoal = (idx, field, val) => {
    setData((d) => {
      const goals = [...d.performanceGoals];
      goals[idx] = { ...goals[idx], [field]: val };
      return { ...d, performanceGoals: goals };
    });
  };

  const removeGoal = (idx) => {
    setData((d) => ({
      ...d,
      performanceGoals: d.performanceGoals.filter((_, i) => i !== idx),
    }));
  };

  const submit = async () => {
    setLoading(true);
    try {
      const res = await api("/profile/onboard", { method: "POST", body: data });
      onComplete(res.user);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: "¡Hola! Cuéntame sobre ti",
      subtitle: "Empecemos con lo básico para personalizar tu experiencia",
      content: (
        <div className="onboard-fields">
          <div className="field-row">
            <Field label="Edad" type="number" value={data.age} onChange={(v) => update("age", v)} placeholder="25" />
            <Field label="Altura (cm)" type="number" value={data.height} onChange={(v) => update("height", v)} placeholder="175" />
          </div>
          <div className="field-row">
            <Field label="Peso actual (kg)" type="number" value={data.currentWeight} onChange={(v) => update("currentWeight", v)} placeholder="80" />
            <Field label="Peso objetivo (kg)" type="number" value={data.targetWeight} onChange={(v) => update("targetWeight", v)} placeholder="75" />
          </div>
          <div className="field-row">
            <Field label="% Grasa actual" type="number" value={data.bodyFatPct} onChange={(v) => update("bodyFatPct", v)} placeholder="20" />
            <Field label="% Grasa objetivo" type="number" value={data.targetBodyFatPct} onChange={(v) => update("targetBodyFatPct", v)} placeholder="15" />
          </div>
          <div className="field-row">
            <Field label="% Músculo actual" type="number" value={data.musclePct} onChange={(v) => update("musclePct", v)} placeholder="35" />
            <Field label="% Músculo objetivo" type="number" value={data.targetMusclePct} onChange={(v) => update("targetMusclePct", v)} placeholder="40" />
          </div>
          <div className="field-row">
            <Field label="Horas de sueño" type="number" value={data.sleepHours} onChange={(v) => update("sleepHours", v)} placeholder="7" />
            <div className="field">
              <label>Nivel de actividad</label>
              <select value={data.activityLevel} onChange={(e) => update("activityLevel", e.target.value)}>
                <option value="sedentario">Sedentario</option>
                <option value="ligero">Ligero</option>
                <option value="moderado">Moderado</option>
                <option value="activo">Activo</option>
                <option value="muy activo">Muy activo</option>
              </select>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Deportes y Rendimiento",
      subtitle: "¿Qué deportes practicas y cuáles son tus metas?",
      content: (
        <div className="onboard-fields">
          <div className="chip-section">
            <label>Deportes que practicas actualmente</label>
            <div className="chip-grid">
              {SPORTS_OPTIONS.map((s) => (
                <button
                  key={s}
                  className={`chip ${data.currentSports.includes(s) ? "active" : ""}`}
                  onClick={() => toggleInArray("currentSports", s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="chip-section">
            <label>Deportes que planeas hacer</label>
            <div className="chip-grid">
              {SPORTS_OPTIONS.map((s) => (
                <button
                  key={s}
                  className={`chip ${data.plannedSports.includes(s) ? "active" : ""}`}
                  onClick={() => toggleInArray("plannedSports", s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="performance-goals">
            <label>Metas de rendimiento</label>
            <p className="hint">Ej: "Sentadilla → 120kg", "5km → menos de 25 min"</p>
            {data.performanceGoals.map((g, i) => (
              <div key={i} className="goal-row">
                <input placeholder="Disciplina" value={g.discipline} onChange={(e) => updateGoal(i, "discipline", e.target.value)} />
                <input placeholder="Meta" value={g.goal} onChange={(e) => updateGoal(i, "goal", e.target.value)} />
                <input placeholder="Métrica" value={g.metric} onChange={(e) => updateGoal(i, "metric", e.target.value)} />
                {data.performanceGoals.length > 1 && (
                  <button className="remove-goal" onClick={() => removeGoal(i)}>✕</button>
                )}
              </div>
            ))}
            <button className="add-goal-btn" onClick={addPerformanceGoal}>+ Agregar meta</button>
          </div>
        </div>
      ),
    },
    {
      title: "Alimentación",
      subtitle: "Cuéntame sobre tus preferencias y restricciones",
      content: (
        <div className="onboard-fields">
          <div className="chip-section">
            <label>Restricciones alimentarias</label>
            <div className="chip-grid">
              {DIET_RESTRICTIONS.map((r) => (
                <button
                  key={r}
                  className={`chip ${data.dietRestrictions.includes(r) ? "active" : ""}`}
                  onClick={() => toggleInArray("dietRestrictions", r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <Field
            label="Alergias específicas"
            value={data.allergies}
            onChange={(v) => update("allergies", v)}
            placeholder="Ej: mariscos, soya..."
          />

          <div className="field">
            <label>Comidas al día: {data.mealsPerDay}</label>
            <input
              type="range"
              min={2} max={6}
              value={data.mealsPerDay}
              onChange={(e) => update("mealsPerDay", parseInt(e.target.value))}
            />
            <div className="range-labels">
              <span>2</span><span>3</span><span>4</span><span>5</span><span>6</span>
            </div>
          </div>

          <div className="field">
            <label>Nivel de estrés</label>
            <select value={data.stressLevel} onChange={(e) => update("stressLevel", e.target.value)}>
              <option value="bajo">Bajo</option>
              <option value="medio">Medio</option>
              <option value="alto">Alto</option>
            </select>
          </div>

          <div className="field full">
            <label>Comentarios adicionales</label>
            <textarea
              value={data.comments}
              onChange={(e) => update("comments", e.target.value)}
              placeholder="Cualquier detalle que quieras que tengamos en cuenta: lesiones, horarios, preferencias..."
              rows={4}
            />
          </div>
        </div>
      ),
    },
  ];

  const current = steps[step];
  const canNext = step < steps.length - 1;
  const canPrev = step > 0;
  const isLast = step === steps.length - 1;

  return (
    <div className="onboard-page">
      <div className="onboard-bg">
        <div className="onboard-gradient" />
      </div>

      <div className="onboard-container">
        <div className="onboard-progress">
          {steps.map((_, i) => (
            <div key={i} className={`progress-dot ${i <= step ? "active" : ""}`} />
          ))}
        </div>

        <div className="onboard-card">
          <h2>{current.title}</h2>
          <p className="onboard-subtitle">{current.subtitle}</p>
          {current.content}
        </div>

        <div className="onboard-nav">
          {canPrev && (
            <button className="nav-btn secondary" onClick={() => setStep(step - 1)}>
              ← Atrás
            </button>
          )}
          <div style={{ flex: 1 }} />
          {canNext && (
            <button className="nav-btn primary" onClick={() => setStep(step + 1)}>
              Siguiente →
            </button>
          )}
          {isLast && (
            <button className="nav-btn primary" onClick={submit} disabled={loading}>
              {loading ? "Guardando..." : "Comenzar mi viaje ⬡"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, type = "text", value, onChange, placeholder }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
