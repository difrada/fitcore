import { useState, useEffect, useRef } from "react";
import { api } from "../App";

const AGENTS = {
  cerebro: { icon: "⬡", name: "FitCore", color: "#00f0ff", desc: "Tu asistente principal" },
  nutricionista: { icon: "🥗", name: "Nutricionista", color: "#4ade80", desc: "Consejos de alimentación" },
  entrenador: { icon: "💪", name: "Entrenador", color: "#f97316", desc: "Planificación de ejercicio" },
};

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState("cerebro");
  const [showAgents, setShowAgents] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    api("/chat/history?limit=50")
      .then((data) => setMessages(data.messages || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text, ts: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await api("/chat/send", {
        method: "POST",
        body: { message: text, agent: activeAgent },
      });

      // The backend returns responses from potentially multiple agents
      const newMsgs = res.responses || [{ role: "assistant", agent: "cerebro", content: res.reply }];
      setMessages((m) => [...m, ...newMsgs]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", agent: "cerebro", content: "Lo siento, hubo un error. Intenta de nuevo.", error: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const quickActions = [
    { label: "Registrar comida", prompt: "Acabo de comer: " },
    { label: "Registrar ejercicio", prompt: "Hoy hice ejercicio: " },
    { label: "¿Qué debería comer?", prompt: "¿Qué me recomiendas comer ahora?" },
    { label: "Consejo de entrenamiento", prompt: "Dame un consejo para mi entrenamiento de hoy" },
    { label: "¿Cómo voy?", prompt: "¿Cómo voy con mis objetivos esta semana?" },
  ];

  return (
    <div className="chat-page">
      <div className="chat-header">
        <div className="chat-title-row">
          <h1>Chat con IA</h1>
          <button className="agents-toggle" onClick={() => setShowAgents(!showAgents)}>
            <span>{AGENTS[activeAgent].icon}</span>
            <span className="agent-active-name">{AGENTS[activeAgent].name}</span>
            <span className="chevron">{showAgents ? "▲" : "▼"}</span>
          </button>
        </div>

        {showAgents && (
          <div className="agents-panel">
            {Object.entries(AGENTS).map(([key, agent]) => (
              <button
                key={key}
                className={`agent-option ${activeAgent === key ? "active" : ""}`}
                onClick={() => { setActiveAgent(key); setShowAgents(false); }}
              >
                <span className="agent-icon">{agent.icon}</span>
                <div>
                  <span className="agent-name" style={{ color: agent.color }}>{agent.name}</span>
                  <span className="agent-desc">{agent.desc}</span>
                </div>
              </button>
            ))}
            <p className="agents-note">
              El agente Cerebro coordina al Nutricionista y Entrenador automáticamente.
              También puedes hablar directamente con cada uno.
            </p>
          </div>
        )}
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <span className="empty-icon">⬡</span>
            <h2>¡Hola! Soy FitCore</h2>
            <p>
              Cuéntame qué has comido, qué ejercicio has hecho, o pregúntame
              cualquier cosa sobre tu plan nutricional o de entrenamiento.
            </p>
            <div className="quick-actions">
              {quickActions.map((qa) => (
                <button
                  key={qa.label}
                  className="quick-action-btn"
                  onClick={() => { setInput(qa.prompt); inputRef.current?.focus(); }}
                >
                  {qa.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {loading && (
          <div className="msg assistant">
            <div className="msg-agent-icon">{AGENTS[activeAgent].icon}</div>
            <div className="msg-bubble typing">
              <span className="dot" /><span className="dot" /><span className="dot" />
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      <div className="chat-input-area">
        <div className="quick-chips-scroll">
          {quickActions.map((qa) => (
            <button
              key={qa.label}
              className="quick-chip"
              onClick={() => { setInput(qa.prompt); inputRef.current?.focus(); }}
            >
              {qa.label}
            </button>
          ))}
        </div>
        <div className="chat-input-row">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cuéntame qué comiste, qué ejercicio hiciste, o pregúntame algo..."
            rows={1}
            disabled={loading}
          />
          <button className="send-btn" onClick={send} disabled={loading || !input.trim()}>
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  const agent = msg.agent ? AGENTS[msg.agent] : null;

  // Parse nutrition data if present
  const hasNutrition = msg.nutritionData && !isUser;

  return (
    <div className={`msg ${isUser ? "user" : "assistant"} ${msg.error ? "error" : ""}`}>
      {!isUser && agent && (
        <div className="msg-agent-icon" style={{ color: agent.color }}>
          {agent.icon}
        </div>
      )}
      <div className="msg-content">
        {!isUser && agent && msg.agent !== "cerebro" && (
          <span className="msg-agent-label" style={{ color: agent.color }}>
            {agent.name}
          </span>
        )}
        <div className="msg-bubble">
          <p>{msg.content}</p>
        </div>
        {hasNutrition && (
          <div className="nutrition-card">
            <h4>Información Nutricional</h4>
            <div className="nutrition-grid">
              {msg.nutritionData.calories && <NutriBadge label="Calorías" value={msg.nutritionData.calories} unit="kcal" />}
              {msg.nutritionData.protein && <NutriBadge label="Proteína" value={msg.nutritionData.protein} unit="g" />}
              {msg.nutritionData.carbs && <NutriBadge label="Carbos" value={msg.nutritionData.carbs} unit="g" />}
              {msg.nutritionData.fat && <NutriBadge label="Grasa" value={msg.nutritionData.fat} unit="g" />}
              {msg.nutritionData.fiber && <NutriBadge label="Fibra" value={msg.nutritionData.fiber} unit="g" />}
            </div>
            {msg.nutritionData.source && (
              <span className="nutrition-source">Fuente: {msg.nutritionData.source}</span>
            )}
          </div>
        )}
        <span className="msg-time">
          {msg.ts ? new Date(msg.ts).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }) : ""}
        </span>
      </div>
    </div>
  );
}

function NutriBadge({ label, value, unit }) {
  return (
    <div className="nutri-badge">
      <span className="nutri-val">{value}</span>
      <span className="nutri-unit">{unit}</span>
      <span className="nutri-label">{label}</span>
    </div>
  );
}
