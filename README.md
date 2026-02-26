# ⬡ FitCore — Entrenador y Nutricionista con IA

Aplicación web completa para control de dieta y ejercicio con agentes de IA especializados.

## Arquitectura

```
fitcore/
├── frontend/          # React + Vite
│   └── src/
│       ├── App.jsx              # Router, contextos Auth/Theme, Layout
│       ├── pages/
│       │   ├── AuthPage.jsx     # Login / Registro
│       │   ├── OnboardingPage.jsx # Configuración inicial (3 pasos)
│       │   ├── DashboardPage.jsx  # Panel principal con resumen
│       │   ├── ChatPage.jsx     # Chatbot multi-agente
│       │   ├── StatsPage.jsx    # Estadísticas con gráficas
│       │   └── ProfilePage.jsx  # Editar perfil y objetivos
│       └── styles/
│           └── main.css         # Estilos completos dark/light
│
├── backend/           # Node.js + Express
│   ├── server.js              # API completa (auth, logs, chat, stats)
│   └── services/
│       ├── nutrition_lookup.py  # DB nutricional basada en USDA
│       └── exercise_lookup.py   # DB ejercicios basada en MET values
│
└── data/              # JSON store (reemplazar por DB en producción)
```

## Requisitos

- **Node.js** >= 18
- **Python** >= 3.8
- **API Key de Gemini** (opcional, tiene fallback simulado)

## Instalación y Ejecución

### 1. Backend

```bash
cd backend
npm install
# Opcional: configurar Gemini
export GEMINI_API_KEY="tu-api-key-de-gemini"
npm start
# → http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

## Funcionalidades

### 1. Gestión de Usuarios
- Registro e inicio de sesión con JWT
- Perfil completamente editable

### 2. Onboarding (3 pasos conversacionales)
- **Paso 1**: Datos corporales (peso, altura, % grasa, % músculo, objetivos)
- **Paso 2**: Deportes actuales/planeados + metas de rendimiento
- **Paso 3**: Restricciones alimentarias, alergias, estilo de vida

### 3. Objetivos
| Tipo | Campos |
|------|--------|
| Composición corporal | Peso, % grasa, % músculo |
| Rendimiento | Disciplina + meta + métrica (ej: Sentadilla → 120kg) |
| Nutrición | Calculados automáticamente (Harris-Benedict + actividad) |

### 4. Chat IA Multi-Agente
Tres agentes especializados coordinados:

| Agente | Rol | Especialidad |
|--------|-----|-------------|
| **⬡ FitCore (Cerebro)** | Coordinador | Sintetiza nutrición + entrenamiento, visión integral |
| **🥗 NutriCore** | Nutricionista | Análisis de comidas, macros, recomendaciones dietéticas |
| **💪 TrainCore** | Entrenador | Rutinas, calorías quemadas, recuperación |

El cerebro detecta automáticamente si el mensaje necesita al nutricionista, entrenador, o ambos.

### 5. Registro por Chat
El usuario puede registrar de forma natural:
- "Almorcé pollo con arroz y ensalada" → registra comida con estimación nutricional
- "Hoy hice 45 min de pesas" → registra ejercicio con calorías quemadas
- "¿Qué debería cenar?" → recibe recomendación personalizada

### 6. Fuentes de Datos Nutricionales
- **USDA FoodData Central** (fdc.nal.usda.gov) — base de datos local con 80+ alimentos
- **Compendium of Physical Activities** (Ainsworth et al.) — valores MET para 60+ ejercicios
- **ICBF** (Tabla de composición de alimentos colombianos) — platos latinoamericanos
- Fórmula de calorías: `MET × peso(kg) × duración(horas)`
- Fórmula BMR: Harris-Benedict con multiplicador de actividad

### 7. Panel de Estadísticas
- Filtro: Semana / Mes / Año
- Gráficas: Progreso de peso, calorías diarias, minutos de ejercicio
- Composición corporal: Anillos de progreso (grasa, músculo, IMC)
- Sueño y estado de ánimo
- Seguimiento de metas de rendimiento deportivo

### 8. Sueño y Estado de Ánimo
- Registro rápido desde el dashboard (emojis + horas)
- Se considera en las recomendaciones del entrenador
- Historial visible en estadísticas

## API Endpoints

### Auth
| Method | Path | Descripción |
|--------|------|------------|
| POST | `/api/auth/register` | Registro |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Usuario actual |

### Profile
| Method | Path | Descripción |
|--------|------|------------|
| POST | `/api/profile/onboard` | Guardar onboarding |
| PUT | `/api/profile/update` | Actualizar perfil |

### Logs
| Method | Path | Descripción |
|--------|------|------------|
| GET | `/api/logs/today` | Registro de hoy |
| POST | `/api/logs/mood-sleep` | Registrar ánimo/sueño |
| POST | `/api/logs/meal` | Registrar comida |
| POST | `/api/logs/exercise` | Registrar ejercicio |
| POST | `/api/logs/weight` | Registrar peso |

### Chat
| Method | Path | Descripción |
|--------|------|------------|
| GET | `/api/chat/history` | Historial de chat |
| POST | `/api/chat/send` | Enviar mensaje al agente |

### Stats & Lookup
| Method | Path | Descripción |
|--------|------|------------|
| GET | `/api/stats?range=week` | Estadísticas |
| GET | `/api/nutrition/lookup?food=pollo` | Buscar info nutricional |
| GET | `/api/exercise/lookup?exercise=correr` | Buscar info ejercicio |

## Configuración Gemini (LLM)

Usar modelo `gemini-2.0-flash` (rápido y eficiente):

```bash
export GEMINI_API_KEY="AIza..."
```

Sin API key, el sistema usa respuestas simuladas inteligentes que demuestran la funcionalidad.

## Para Producción

1. **Base de datos**: Reemplazar JSON files por PostgreSQL/MongoDB
2. **USDA API**: Integrar con `https://api.nal.usda.gov/fdc/v1/` para datos en tiempo real
3. **Open Food Facts**: `https://world.openfoodfacts.org/api/v2/search` (gratis, sin key)
4. **Auth**: Agregar OAuth (Google/Apple), verificación de email
5. **Caché**: Redis para sesiones y consultas frecuentes
6. **Deploy**: Docker + Railway/Fly.io/Vercel

## Tecnologías

- **Frontend**: React 18, Vite, CSS Variables (dark/light)
- **Backend**: Express.js, JWT, bcrypt
- **Python**: Scripts de procesamiento nutricional y ejercicio
- **LLM**: Google Gemini 2.0 Flash
- **Diseño**: Sistema de diseño propio "FitCore" (DM Sans + Space Mono)
