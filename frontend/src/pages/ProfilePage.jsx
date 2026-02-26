import { useState, useEffect } from "react";
import { api, useAuth } from "../App";

const SPORTS_OPTIONS = [
  "Gimnasio / Pesas", "Running", "Ciclismo", "Natación", "CrossFit",
  "Yoga / Pilates", "Artes marciales", "Fútbol", "Básquet", "Tenis",
  "Calistenia", "Senderismo", "Danza", "Boxeo", "Otro"
];

const DIET_RESTRICTIONS = [
  "Sin gluten", "Vegetariano", "Vegano", "Sin lactosa", "Keto",
  "Bajo en sodio", "Sin frutos secos", "Halal", "Kosher", "Ninguna"
];

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState("body");

  useEffect(() => {
    if (user?.profile) {
      setForm({ ...user.profile });
    }
  }, [user]);

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const toggleInArray = (key, val) => {
    setForm((f) => {
      const arr = f[key] || [];
      return { ...f, [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] };
    });
  };

  const addGoal = () => {
    setForm((f) => ({
      ...f,
      performanceGoals: [...(f.performanceGoals || []), { discipline: "", goal: "", metric: "" }],
    }));
  };

  const updateGoal = (idx, field, val) => {
    setForm((f) => {
      const goals = [...(f.performanceGoals || [])];
      goals[idx] = { ...goals[idx], [field]: val };
      return { ...f, performanceGoals: goals };
    });
  };

  const removeGoal = (idx) => {
    setForm((f) => ({
      ...f,
      performanceGoals: (f.performanceGoals || []).filter((_, i) => i !== idx),
    }));
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await api("/profile/update", { method: "PUT", body: form });
      setUser(res.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <div className="profile-loading">Cargando perfil...</div>;

  const tabs = [
    { id: "body", label: "Cuerpo", icon: "◉" },
    { id: "sports", label: "Deportes", icon: "◈" },
    { id: "diet", label: "Dieta", icon: "◎" },
    { id: "lifestyle", label: "Estilo", icon: "◐" },
  ];

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>Mi Perfil</h1>
        <div className="profile-actions">
          {saved && <span className="save-success">✓ Guardado</span>}
          <button className="save-btn" onClick={save} disabled={saving}>
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </div>

      <div className="profile-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`profile-tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      <div className="profile-content">
        {tab === "body" && (
          <div className="profile-section">
            <h2>Objetivos Corporales</h2>
            <div className="field-grid">
              <Field label="Edad" type="number" value={form.age} onChange={(v) => update("age", v)} />
              <Field label="Altura (cm)" type="number" value={form.height} onChange={(v) => update("height", v)} />
              <Field label="Peso actual (kg)" type="number" value={form.currentWeight} onChange={(v) => update("currentWeight", v)} />
              <Field label="Peso objetivo (kg)" type="number" value={form.targetWeight} onChange={(v) => update("targetWeight", v)} />
              <Field label="% Grasa actual" type="number" value={form.bodyFatPct} onChange={(v) => update("bodyFatPct", v)} />
              <Field label="% Grasa objetivo" type="number" value={form.targetBodyFatPct} onChange={(v) => update("targetBodyFatPct", v)} />
              <Field label="% Músculo actual" type="number" value={form.musclePct} onChange={(v) => update("musclePct", v)} />
              <Field label="% Músculo objetivo" type="number" value={form.targetMusclePct} onChange={(v) => update("targetMusclePct", v)} />
            </div>
          </div>
        )}

        {tab === "sports" && (
          <div className="profile-section">
            <h2>Deportes</h2>
            <div className="chip-section">
              <label>Deportes actuales</label>
              <div className="chip-grid">
                {SPORTS_OPTIONS.map((s) => (
                  <button key={s} className={`chip ${(form.currentSports || []).includes(s) ? "active" : ""}`}
                    onClick={() => toggleInArray("currentSports", s)}>{s}</button>
                ))}
              </div>
            </div>
            <div className="chip-section">
              <label>Deportes planeados</label>
              <div className="chip-grid">
                {SPORTS_OPTIONS.map((s) => (
                  <button key={s} className={`chip ${(form.plannedSports || []).includes(s) ? "active" : ""}`}
                    onClick={() => toggleInArray("plannedSports", s)}>{s}</button>
                ))}
              </div>
            </div>

            <h3>Metas de Rendimiento</h3>
            {(form.performanceGoals || []).map((g, i) => (
              <div key={i} className="goal-row">
                <input placeholder="Disciplina" value={g.discipline} onChange={(e) => updateGoal(i, "discipline", e.target.value)} />
                <input placeholder="Meta" value={g.goal} onChange={(e) => updateGoal(i, "goal", e.target.value)} />
                <input placeholder="Métrica" value={g.metric} onChange={(e) => updateGoal(i, "metric", e.target.value)} />
                <button className="remove-goal" onClick={() => removeGoal(i)}>✕</button>
              </div>
            ))}
            <button className="add-goal-btn" onClick={addGoal}>+ Agregar meta</button>
          </div>
        )}

        {tab === "diet" && (
          <div className="profile-section">
            <h2>Alimentación</h2>
            <div className="chip-section">
              <label>Restricciones</label>
              <div className="chip-grid">
                {DIET_RESTRICTIONS.map((r) => (
                  <button key={r} className={`chip ${(form.dietRestrictions || []).includes(r) ? "active" : ""}`}
                    onClick={() => toggleInArray("dietRestrictions", r)}>{r}</button>
                ))}
              </div>
            </div>
            <Field label="Alergias" value={form.allergies} onChange={(v) => update("allergies", v)} />
            <div className="field">
              <label>Comidas al día: {form.mealsPerDay || 3}</label>
              <input type="range" min={2} max={6} value={form.mealsPerDay || 3}
                onChange={(e) => update("mealsPerDay", parseInt(e.target.value))} />
            </div>
          </div>
        )}

        {tab === "lifestyle" && (
          <div className="profile-section">
            <h2>Estilo de Vida</h2>
            <div className="field-grid">
              <Field label="Horas de sueño" type="number" value={form.sleepHours} onChange={(v) => update("sleepHours", v)} />
              <div className="field">
                <label>Nivel de estrés</label>
                <select value={form.stressLevel || "medio"} onChange={(e) => update("stressLevel", e.target.value)}>
                  <option value="bajo">Bajo</option>
                  <option value="medio">Medio</option>
                  <option value="alto">Alto</option>
                </select>
              </div>
              <div className="field">
                <label>Nivel de actividad</label>
                <select value={form.activityLevel || "moderado"} onChange={(e) => update("activityLevel", e.target.value)}>
                  <option value="sedentario">Sedentario</option>
                  <option value="ligero">Ligero</option>
                  <option value="moderado">Moderado</option>
                  <option value="activo">Activo</option>
                  <option value="muy activo">Muy activo</option>
                </select>
              </div>
            </div>
            <div className="field full">
              <label>Comentarios adicionales</label>
              <textarea
                value={form.comments || ""}
                onChange={(e) => update("comments", e.target.value)}
                rows={5}
                placeholder="Lesiones, horarios, preferencias, restricciones médicas..."
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, type = "text", value, onChange, placeholder }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
