import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync, exec } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 4000;
const JWT_SECRET = process.env.JWT_SECRET || "fitcore-secret-2026";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// ===== DATA STORE =====
const DATA_DIR = path.join(__dirname, "../data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadData(file) {
  const fp = path.join(DATA_DIR, file);
  if (!fs.existsSync(fp)) return {};
  return JSON.parse(fs.readFileSync(fp, "utf-8"));
}
function saveData(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

let users = loadData("users.json");
let profiles = loadData("profiles.json");
let chatHistory = loadData("chats.json");
let dailyLogs = loadData("logs.json");

function persist() {
  saveData("users.json", users);
  saveData("profiles.json", profiles);
  saveData("chats.json", chatHistory);
  saveData("logs.json", dailyLogs);
}

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json({ limit: "5mb" }));

function auth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "No autorizado" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ message: "Token inválido" });
  }
}

// ===== HELPERS =====
function sanitizeUser(user) {
  const { password, ...rest } = user;
  rest.profile = profiles[user.id] || null;
  return rest;
}

function avg(arr) {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

function calcBMI(weight, height) {
  const w = parseFloat(weight);
  const h = parseFloat(height) / 100;
  if (!w || !h) return 0;
  return Math.round((w / (h * h)) * 10) / 10;
}

// ===== AUTH ROUTES =====
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "Campos requeridos" });
    const existing = Object.values(users).find((u) => u.email === email);
    if (existing) return res.status(400).json({ message: "Email ya registrado" });

    const id = uuid();
    const hash = await bcrypt.hash(password, 10);
    users[id] = { id, name, email, password: hash, onboarded: false, createdAt: new Date().toISOString() };
    persist();

    const token = jwt.sign({ id }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, user: sanitizeUser(users[id]) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = Object.values(users).find((u) => u.email === email);
    if (!user) return res.status(400).json({ message: "Credenciales inválidas" });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: "Credenciales inválidas" });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/auth/me", auth, (req, res) => {
  const user = users[req.userId];
  if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
  res.json(sanitizeUser(user));
});

// ===== PROFILE / ONBOARDING =====
app.post("/api/profile/onboard", auth, (req, res) => {
  profiles[req.userId] = { ...req.body, updatedAt: new Date().toISOString() };
  users[req.userId].onboarded = true;
  persist();
  calculateNutritionTargets(req.userId);
  res.json({ user: sanitizeUser(users[req.userId]) });
});

app.put("/api/profile/update", auth, (req, res) => {
  profiles[req.userId] = { ...profiles[req.userId], ...req.body, updatedAt: new Date().toISOString() };
  persist();
  calculateNutritionTargets(req.userId);
  res.json({ user: sanitizeUser(users[req.userId]) });
});

// ===== DAILY LOGS =====
app.get("/api/logs/today", auth, (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const userLogs = dailyLogs[req.userId] || {};
  res.json(userLogs[today] || { date: today, meals: [], exercises: [], mood: null, sleepHours: null });
});

app.post("/api/logs/mood-sleep", auth, (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  if (!dailyLogs[req.userId]) dailyLogs[req.userId] = {};
  if (!dailyLogs[req.userId][today]) dailyLogs[req.userId][today] = { date: today, meals: [], exercises: [] };
  if (req.body.mood) dailyLogs[req.userId][today].mood = req.body.mood;
  if (req.body.sleepHours) dailyLogs[req.userId][today].sleepHours = req.body.sleepHours;
  persist();
  res.json({ ok: true });
});

app.post("/api/logs/meal", auth, (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  if (!dailyLogs[req.userId]) dailyLogs[req.userId] = {};
  if (!dailyLogs[req.userId][today]) dailyLogs[req.userId][today] = { date: today, meals: [], exercises: [] };
  dailyLogs[req.userId][today].meals.push({
    id: uuid(),
    ...req.body,
    loggedAt: new Date().toISOString(),
  });
  persist();
  res.json({ ok: true, log: dailyLogs[req.userId][today] });
});

app.post("/api/logs/exercise", auth, (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  if (!dailyLogs[req.userId]) dailyLogs[req.userId] = {};
  if (!dailyLogs[req.userId][today]) dailyLogs[req.userId][today] = { date: today, meals: [], exercises: [] };
  dailyLogs[req.userId][today].exercises.push({
    id: uuid(),
    ...req.body,
    loggedAt: new Date().toISOString(),
  });
  persist();
  res.json({ ok: true, log: dailyLogs[req.userId][today] });
});

app.post("/api/logs/weight", auth, (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  if (!dailyLogs[req.userId]) dailyLogs[req.userId] = {};
  if (!dailyLogs[req.userId][today]) dailyLogs[req.userId][today] = { date: today, meals: [], exercises: [] };
  dailyLogs[req.userId][today].weight = parseFloat(req.body.weight);
  // Also update current weight in profile
  if (profiles[req.userId]) {
    profiles[req.userId].currentWeight = req.body.weight;
  }
  persist();
  res.json({ ok: true });
});

// ===== DASHBOARD SUMMARY =====
app.get("/api/dashboard/summary", auth, (req, res) => {
  const profile = profiles[req.userId] || {};
  const today = new Date().toISOString().split("T")[0];
  const todayLog = (dailyLogs[req.userId] || {})[today] || {};
  const totalCalories = (todayLog.meals || []).reduce((s, m) => s + (m.calories || 0), 0);
  const totalProtein = (todayLog.meals || []).reduce((s, m) => s + (m.protein || 0), 0);
  const totalExMin = (todayLog.exercises || []).reduce((s, e) => s + (e.durationMin || 0), 0);
  const targets = profile.nutritionTargets || {};

  res.json({
    todayCalories: Math.round(totalCalories),
    targetCalories: targets.calories || 2200,
    todayProtein: Math.round(totalProtein),
    targetProtein: targets.protein || 150,
    todayExerciseMinutes: totalExMin,
    targetExerciseMinutes: 60,
    aiTip: null,
  });
});

// ===== STATS =====
app.get("/api/stats", auth, (req, res) => {
  const range = req.query.range || "week";
  const userLogs = dailyLogs[req.userId] || {};
  const profile = profiles[req.userId] || {};
  const days = range === "week" ? 7 : range === "month" ? 30 : 365;
  const entries = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const log = userLogs[key] || {};
    const label = range === "year"
      ? d.toLocaleDateString("es", { month: "short" })
      : d.toLocaleDateString("es", { weekday: "short", day: "numeric" });

    entries.push({
      date: key, label,
      calories: (log.meals || []).reduce((s, m) => s + (m.calories || 0), 0),
      protein: (log.meals || []).reduce((s, m) => s + (m.protein || 0), 0),
      carbs: (log.meals || []).reduce((s, m) => s + (m.carbs || 0), 0),
      fat: (log.meals || []).reduce((s, m) => s + (m.fat || 0), 0),
      exerciseMin: (log.exercises || []).reduce((s, e) => s + (e.durationMin || 0), 0),
      calBurned: (log.exercises || []).reduce((s, e) => s + (e.caloriesBurned || 0), 0),
      weight: log.weight || null,
      sleepHours: log.sleepHours || null,
      mood: log.mood || null,
    });
  }

  const withCalories = entries.filter((e) => e.calories > 0);
  const targets = profile.nutritionTargets || {};

  res.json({
    weightTrend: entries.filter((e) => e.weight).map((e) => ({ label: e.label, value: e.weight })),
    targetWeight: parseFloat(profile.targetWeight) || 75,
    avgCalories: avg(withCalories.map((e) => e.calories)),
    targetCalories: targets.calories || 2200,
    avgProtein: avg(withCalories.map((e) => e.protein)),
    targetProtein: targets.protein || 150,
    avgCarbs: avg(withCalories.map((e) => e.carbs)),
    targetCarbs: targets.carbs || 270,
    avgFat: avg(withCalories.map((e) => e.fat)),
    targetFat: targets.fat || 65,
    caloriesByDay: entries.map((e) => ({ label: e.label, value: e.calories })),
    avgExerciseMin: avg(entries.map((e) => e.exerciseMin)),
    targetExerciseMin: 60,
    totalSessions: entries.filter((e) => e.exerciseMin > 0).length,
    totalCalBurned: entries.reduce((s, e) => s + e.calBurned, 0),
    exerciseByDay: entries.map((e) => ({ label: e.label, value: e.exerciseMin })),
    currentBodyFat: parseFloat(profile.bodyFatPct) || 0,
    targetBodyFat: parseFloat(profile.targetBodyFatPct) || 0,
    currentMuscle: parseFloat(profile.musclePct) || 0,
    targetMuscle: parseFloat(profile.targetMusclePct) || 0,
    currentBMI: calcBMI(profile.currentWeight, profile.height),
    targetBMI: calcBMI(profile.targetWeight, profile.height),
    sleepTrend: entries.filter((e) => e.sleepHours).map((e) => ({ label: e.label, value: e.sleepHours })),
    targetSleep: parseFloat(profile.sleepHours) || 8,
    moodDistribution: entries.reduce((acc, e) => { if (e.mood) acc[e.mood] = (acc[e.mood] || 0) + 1; return acc; }, {}),
    performanceProgress: (profile.performanceGoals || []).filter((g) => g.discipline).map((g) => ({
      discipline: g.discipline,
      current: g.currentValue || 0,
      target: g.goal,
      metric: g.metric,
      progress: g.currentValue && g.goal ? Math.round((parseFloat(g.currentValue) / parseFloat(g.goal)) * 100) : 0,
    })),
  });
});

// ===== CHAT HISTORY =====
app.get("/api/chat/history", auth, (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const msgs = (chatHistory[req.userId] || []).slice(-limit);
  res.json({ messages: msgs });
});

// ===== CHAT: MULTI-AGENT AI =====
app.post("/api/chat/send", auth, async (req, res) => {
  try {
    const { message, agent } = req.body;
    const profile = profiles[req.userId] || {};
    const today = new Date().toISOString().split("T")[0];
    const todayLog = (dailyLogs[req.userId] || {})[today] || {};

    // Save user message
    if (!chatHistory[req.userId]) chatHistory[req.userId] = [];
    chatHistory[req.userId].push({
      role: "user", content: message, ts: new Date().toISOString(),
    });

    // Build context for AI
    const userContext = buildUserContext(profile, todayLog);
    const recentHistory = chatHistory[req.userId].slice(-20);

    // Determine which agents to invoke
    let responses = [];

    if (agent === "cerebro" || agent === undefined) {
      // The "brain" agent decides if it needs specialist input
      const analysis = analyzeMessage(message);

      if (analysis.needsNutrition) {
        const nutriReply = await callGeminiAgent("nutricionista", message, userContext, recentHistory);
        responses.push({ role: "assistant", agent: "nutricionista", content: nutriReply.text, nutritionData: nutriReply.nutritionData, ts: new Date().toISOString() });
      }

      if (analysis.needsTraining) {
        const trainReply = await callGeminiAgent("entrenador", message, userContext, recentHistory);
        responses.push({ role: "assistant", agent: "entrenador", content: trainReply.text, ts: new Date().toISOString() });
      }

      // Brain always synthesizes
      const brainReply = await callGeminiAgent("cerebro", message, userContext, recentHistory, responses);
      responses.push({ role: "assistant", agent: "cerebro", content: brainReply.text, nutritionData: brainReply.nutritionData, ts: new Date().toISOString() });
    } else {
      // Direct call to specific agent
      const reply = await callGeminiAgent(agent, message, userContext, recentHistory);
      responses.push({ role: "assistant", agent, content: reply.text, nutritionData: reply.nutritionData, ts: new Date().toISOString() });
    }

    // Process any food/exercise logging from AI response
    for (const r of responses) {
      if (r.nutritionData && r.nutritionData.shouldLog) {
        await logMealFromAI(req.userId, r.nutritionData);
      }
    }

    // Save assistant messages
    chatHistory[req.userId].push(...responses);
    persist();

    res.json({ responses });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ===== NUTRITION LOOKUP (Python) =====
app.get("/api/nutrition/lookup", auth, async (req, res) => {
  const food = req.query.food;
  if (!food) return res.status(400).json({ message: "Se requiere nombre del alimento" });
  try {
    const result = await runPython("nutrition_lookup.py", { food });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===== EXERCISE CALORIE LOOKUP (Python) =====
app.get("/api/exercise/lookup", auth, async (req, res) => {
  const { exercise, durationMin, weightKg } = req.query;
  if (!exercise) return res.status(400).json({ message: "Se requiere nombre del ejercicio" });
  try {
    const result = await runPython("exercise_lookup.py", {
      exercise,
      duration_min: parseFloat(durationMin) || 30,
      weight_kg: parseFloat(weightKg) || parseFloat(profiles[req.userId]?.currentWeight) || 70,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===== AI AGENT LOGIC =====
function analyzeMessage(message) {
  const lower = message.toLowerCase();
  const foodWords = ["comí", "comida", "almorcé", "desayuné", "cené", "comer", "comi", "almorce", "desayune", "cene",
    "pollo", "arroz", "ensalada", "fruta", "proteína", "carbohidrato", "grasa", "dieta", "hambre",
    "calorías", "nutrición", "receta", "snack", "merienda", "comido", "tomé", "jugo", "bebí"];
  const exerciseWords = ["ejercicio", "entrené", "corrí", "gimnasio", "pesas", "sentadilla", "press",
    "correr", "bici", "natación", "yoga", "rutina", "repeticiones", "series", "entrenamiento",
    "cardio", "peso muerto", "deporte", "crossfit", "entrenador", "entrene", "corri"];

  return {
    needsNutrition: foodWords.some((w) => lower.includes(w)),
    needsTraining: exerciseWords.some((w) => lower.includes(w)),
  };
}

function buildUserContext(profile, todayLog) {
  const meals = (todayLog.meals || []);
  const exercises = (todayLog.exercises || []);
  const totalCals = meals.reduce((s, m) => s + (m.calories || 0), 0);
  const totalProt = meals.reduce((s, m) => s + (m.protein || 0), 0);
  const totalCarbs = meals.reduce((s, m) => s + (m.carbs || 0), 0);
  const totalFat = meals.reduce((s, m) => s + (m.fat || 0), 0);
  const targets = profile.nutritionTargets || {};

  return `
=== PERFIL DEL USUARIO ===
Edad: ${profile.age || "?"} | Altura: ${profile.height || "?"}cm | Peso actual: ${profile.currentWeight || "?"}kg | Peso objetivo: ${profile.targetWeight || "?"}kg
% Grasa actual: ${profile.bodyFatPct || "?"}% | Objetivo: ${profile.targetBodyFatPct || "?"}%
% Músculo actual: ${profile.musclePct || "?"}% | Objetivo: ${profile.targetMusclePct || "?"}%
Nivel actividad: ${profile.activityLevel || "moderado"} | Sueño: ${profile.sleepHours || "?"}h | Estrés: ${profile.stressLevel || "medio"}
Deportes actuales: ${(profile.currentSports || []).join(", ") || "ninguno"}
Deportes planeados: ${(profile.plannedSports || []).join(", ") || "ninguno"}
Metas rendimiento: ${(profile.performanceGoals || []).filter(g => g.discipline).map(g => `${g.discipline}: ${g.goal} ${g.metric}`).join(", ") || "ninguna"}
Restricciones dieta: ${(profile.dietRestrictions || []).join(", ") || "ninguna"}
Alergias: ${profile.allergies || "ninguna"}
Comidas/día: ${profile.mealsPerDay || 3}
Comentarios: ${profile.comments || "ninguno"}

=== OBJETIVOS NUTRICIONALES DIARIOS ===
Calorías: ${targets.calories || "~2200"} kcal | Proteína: ${targets.protein || "~150"}g | Carbos: ${targets.carbs || "~270"}g | Grasa: ${targets.fat || "~65"}g

=== HOY ===
Sueño: ${todayLog.sleepHours || "no registrado"} hrs | Ánimo: ${todayLog.mood || "no registrado"}
Comidas registradas (${meals.length}): ${meals.map(m => `${m.description || m.name || "?"} (${m.calories || "?"}kcal)`).join(", ") || "ninguna aún"}
Total consumido: ${Math.round(totalCals)} kcal | ${Math.round(totalProt)}g prot | ${Math.round(totalCarbs)}g carbs | ${Math.round(totalFat)}g grasa
Ejercicios hoy (${exercises.length}): ${exercises.map(e => `${e.description || e.name || "?"} (${e.durationMin || "?"}min)`).join(", ") || "ninguno aún"}
`;
}

const AGENT_PROMPTS = {
  nutricionista: `Eres un nutricionista deportivo profesional llamado "NutriCore". Tu rol:
- Analizar la alimentación del usuario y dar consejos basados en sus objetivos
- Cuando el usuario mencione una comida, DEBES estimar sus valores nutricionales usando fuentes confiables (USDA FoodData Central, tablas de composición de alimentos)
- Dar recomendaciones sobre qué comer para sus próximas comidas
- Considerar restricciones alimentarias y alergias del usuario
- Ser preciso con calorías, macros (proteínas, carbohidratos, grasas), fibra
- Tener en cuenta el balance del día: lo que ya comió vs lo que le falta
- Responde SIEMPRE en español

IMPORTANTE: Cuando el usuario registre una comida, responde con un JSON al final de tu mensaje entre etiquetas <nutrition_data>:
<nutrition_data>
{"shouldLog": true, "description": "nombre de la comida", "calories": X, "protein": X, "carbs": X, "fat": X, "fiber": X, "source": "USDA/tabla nutricional", "servingSize": "descripción de la porción"}
</nutrition_data>

Si solo es consulta sin registro, no incluyas la etiqueta.`,

  entrenador: `Eres un entrenador personal profesional llamado "TrainCore". Tu rol:
- Diseñar y aconsejar sobre rutinas de ejercicio según los objetivos del usuario
- Cuando el usuario registre ejercicio, estimar las calorías quemadas (usando tablas MET - Compendium of Physical Activities)
- Considerar el nivel de sueño y estado de ánimo para modular la intensidad
- Dar consejos de recuperación, progresión y técnica
- Tener en cuenta lesiones o limitaciones del usuario
- Responde SIEMPRE en español

IMPORTANTE: Cuando el usuario registre un ejercicio, responde con JSON entre etiquetas <exercise_data>:
<exercise_data>
{"shouldLog": true, "description": "nombre del ejercicio", "durationMin": X, "caloriesBurned": X, "type": "fuerza/cardio/flexibilidad", "intensity": "baja/media/alta", "source": "Compendium of Physical Activities MET values"}
</exercise_data>

Si solo es consulta sin registro, no incluyas la etiqueta.`,

  cerebro: `Eres "FitCore", el asistente principal de salud y fitness del usuario. Eres la mente maestra que coordina entre un nutricionista (NutriCore) y un entrenador (TrainCore).

Tu rol:
- Sintetizar los consejos de nutrición y entrenamiento de forma coherente
- Dar una visión integrada: cómo la alimentación impacta el rendimiento y viceversa
- Motivar al usuario y hacer seguimiento de sus objetivos
- Si recibes respuestas de los especialistas, resúmelas y agrega tu perspectiva integradora
- Si el usuario pregunta algo general, responde tú directamente
- Considera siempre: sueño, estado de ánimo, estrés, y cómo afectan al plan
- Sé amigable pero profesional. No uses jerga excesiva.
- Responde SIEMPRE en español
- Sé conciso pero informativo. No repitas lo que ya dijeron los especialistas si están en la misma respuesta.

Si necesitas dar datos nutricionales o de ejercicio, usa las mismas etiquetas que los especialistas.`
};

async function callGeminiAgent(agentType, message, userContext, history, specialistResponses = []) {
  const systemPrompt = AGENT_PROMPTS[agentType];

  let specialistContext = "";
  if (specialistResponses.length > 0 && agentType === "cerebro") {
    specialistContext = "\n\n=== RESPUESTAS DE ESPECIALISTAS ===\n" +
      specialistResponses.map((r) => `[${r.agent?.toUpperCase()}]: ${r.content}`).join("\n\n");
  }

  const conversationHistory = history.slice(-10).map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  const payload = {
    contents: [
      ...conversationHistory,
      {
        role: "user",
        parts: [{ text: message }],
      },
    ],
    systemInstruction: {
      parts: [{ text: systemPrompt + "\n\n" + userContext + specialistContext }],
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1500,
      topP: 0.9,
    },
  };

  if (!GEMINI_API_KEY) {
    // Fallback without API key - return simulated response
    return simulateAgentResponse(agentType, message, userContext);
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Lo siento, no pude procesar tu mensaje.";

    // Extract nutrition/exercise data from response
    const nutritionData = extractTagData(text, "nutrition_data");
    const exerciseData = extractTagData(text, "exercise_data");

    // Clean the text (remove tags)
    const cleanText = text
      .replace(/<nutrition_data>[\s\S]*?<\/nutrition_data>/g, "")
      .replace(/<exercise_data>[\s\S]*?<\/exercise_data>/g, "")
      .trim();

    return {
      text: cleanText,
      nutritionData: nutritionData || exerciseData || null,
    };
  } catch (err) {
    console.error(`Gemini API error (${agentType}):`, err);
    return simulateAgentResponse(agentType, message, userContext);
  }
}

function extractTagData(text, tagName) {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`);
  const match = text.match(regex);
  if (match) {
    try {
      return JSON.parse(match[1].trim());
    } catch {
      return null;
    }
  }
  return null;
}

function simulateAgentResponse(agentType, message, context) {
  const lower = message.toLowerCase();

  if (agentType === "nutricionista") {
    if (lower.includes("comí") || lower.includes("comi") || lower.includes("comido") || lower.includes("almorcé") || lower.includes("desayuné") || lower.includes("cené")) {
      return {
        text: `He registrado tu comida. Basándome en la descripción, aquí está la estimación nutricional. Recuerda que estos valores son aproximados y se basan en porciones estándar. Para mayor precisión, podrías pesar tus alimentos.\n\nConsejo: Asegúrate de incluir una buena fuente de proteína en tu próxima comida para mantener el balance del día.`,
        nutritionData: {
          shouldLog: true,
          description: message.replace(/com[íi]|almorcé|desayuné|cené/gi, "").trim(),
          calories: 450,
          protein: 25,
          carbs: 50,
          fat: 15,
          fiber: 5,
          source: "Estimación basada en USDA FoodData Central",
          servingSize: "1 porción estándar",
        },
      };
    }
    return {
      text: "Como nutricionista, te recomiendo mantener un balance adecuado de macronutrientes. Según tu perfil y objetivos, procura incluir proteína magra, carbohidratos complejos y grasas saludables en cada comida. ¿Quieres que te sugiera opciones específicas para tu próxima comida?",
      nutritionData: null,
    };
  }

  if (agentType === "entrenador") {
    if (lower.includes("entrené") || lower.includes("entrene") || lower.includes("hice") || lower.includes("corrí") || lower.includes("corri")) {
      return {
        text: `¡Excelente sesión! He registrado tu ejercicio. Basándome en los valores MET del Compendium of Physical Activities, aquí está la estimación de calorías quemadas.\n\nRecuerda que la recuperación es tan importante como el entrenamiento. Asegúrate de hidratarte bien y descansar adecuadamente.`,
        nutritionData: {
          shouldLog: true,
          description: message,
          durationMin: 45,
          caloriesBurned: 350,
          type: "mixto",
          intensity: "media",
          source: "Compendium of Physical Activities MET values",
        },
      };
    }
    return {
      text: "Como entrenador, considerando tu nivel de actividad y objetivos, te sugiero mantener una rutina equilibrada entre fuerza y cardio. ¿Te gustaría que diseñe una rutina específica para hoy?",
      nutritionData: null,
    };
  }

  // Cerebro
  return {
    text: `¡Hola! Soy FitCore, tu asistente de salud integral. Estoy aquí para ayudarte a alcanzar tus objetivos coordinando nutrición y entrenamiento.\n\nPuedes contarme qué comiste, qué ejercicio hiciste, preguntarme qué comer, pedirme una rutina, o consultar cómo vas con tus metas. ¿En qué te puedo ayudar?`,
    nutritionData: null,
  };
}

async function logMealFromAI(userId, data) {
  const today = new Date().toISOString().split("T")[0];
  if (!dailyLogs[userId]) dailyLogs[userId] = {};
  if (!dailyLogs[userId][today]) dailyLogs[userId][today] = { date: today, meals: [], exercises: [] };

  if (data.calories && !data.caloriesBurned) {
    dailyLogs[userId][today].meals.push({
      id: uuid(),
      description: data.description,
      calories: data.calories,
      protein: data.protein || 0,
      carbs: data.carbs || 0,
      fat: data.fat || 0,
      fiber: data.fiber || 0,
      source: data.source,
      servingSize: data.servingSize,
      loggedAt: new Date().toISOString(),
    });
  } else if (data.caloriesBurned) {
    dailyLogs[userId][today].exercises.push({
      id: uuid(),
      description: data.description,
      durationMin: data.durationMin || 30,
      caloriesBurned: data.caloriesBurned || 0,
      type: data.type,
      intensity: data.intensity,
      source: data.source,
      loggedAt: new Date().toISOString(),
    });
  }
  persist();
}

// ===== PYTHON INTEGRATION =====
function runPython(script, args) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, "services", script);
    const argsStr = Buffer.from(JSON.stringify(args)).toString("base64");
    exec(`python3 "${scriptPath}" "${argsStr}"`, { timeout: 15000 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error("Invalid Python output"));
      }
    });
  });
}

function calculateNutritionTargets(userId) {
  const profile = profiles[userId];
  if (!profile) return;

  // Harris-Benedict BMR + activity multiplier
  const weight = parseFloat(profile.currentWeight) || 70;
  const height = parseFloat(profile.height) || 170;
  const age = parseFloat(profile.age) || 30;

  // Assuming male for simplicity — in production, ask for sex
  const bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);

  const activityMultipliers = {
    sedentario: 1.2,
    ligero: 1.375,
    moderado: 1.55,
    activo: 1.725,
    "muy activo": 1.9,
  };
  const multiplier = activityMultipliers[profile.activityLevel] || 1.55;
  let tdee = bmr * multiplier;

  // Adjust for goal
  const targetWeight = parseFloat(profile.targetWeight) || weight;
  if (targetWeight < weight) {
    tdee -= 400; // Caloric deficit
  } else if (targetWeight > weight) {
    tdee += 300; // Caloric surplus
  }

  const calories = Math.round(tdee);
  const protein = Math.round(weight * 1.8); // 1.8g/kg for active individuals
  const fat = Math.round((calories * 0.25) / 9); // 25% from fat
  const carbs = Math.round((calories - (protein * 4) - (fat * 9)) / 4);

  profiles[userId].nutritionTargets = { calories, protein, fat, carbs };
  persist();
}

// ===== START =====
app.listen(PORT, () => {
  console.log(`🏋️ FitCore API running on http://localhost:${PORT}`);
});
