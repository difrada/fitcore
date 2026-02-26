#!/usr/bin/env python3
"""
Exercise Calorie Lookup Service
Based on the Compendium of Physical Activities (Ainsworth et al.)
Reference: https://sites.google.com/site/compendiumofphysicalactivities/

Formula: Calories = MET × weight(kg) × duration(hours)
"""

import sys
import json
import base64

# MET values from the Compendium of Physical Activities (2024 update)
# Source: Ainsworth BE, et al. Compendium of Physical Activities
EXERCISE_DB = {
    # === STRENGTH TRAINING ===
    "pesas": {"name": "Entrenamiento con pesas (general)", "met": 6.0, "category": "fuerza", "source": "Compendium Code 02054"},
    "gimnasio": {"name": "Entrenamiento en gimnasio (general)", "met": 6.0, "category": "fuerza", "source": "Compendium Code 02054"},
    "sentadilla": {"name": "Sentadillas con peso", "met": 6.0, "category": "fuerza", "source": "Compendium Code 02054"},
    "sentadillas": {"name": "Sentadillas con peso", "met": 6.0, "category": "fuerza", "source": "Compendium Code 02054"},
    "press banca": {"name": "Press de banca", "met": 6.0, "category": "fuerza", "source": "Compendium Code 02054"},
    "press": {"name": "Press (general)", "met": 6.0, "category": "fuerza", "source": "Compendium Code 02054"},
    "peso muerto": {"name": "Peso muerto", "met": 6.5, "category": "fuerza", "source": "Compendium Code 02054"},
    "deadlift": {"name": "Peso muerto", "met": 6.5, "category": "fuerza", "source": "Compendium Code 02054"},
    "curl": {"name": "Curl de bíceps", "met": 5.0, "category": "fuerza", "source": "Compendium Code 02050"},
    "biceps": {"name": "Entrenamiento de bíceps", "met": 5.0, "category": "fuerza", "source": "Compendium Code 02050"},
    "dominadas": {"name": "Dominadas", "met": 8.0, "category": "fuerza", "source": "Compendium Code 02052"},
    "pull ups": {"name": "Dominadas (pull-ups)", "met": 8.0, "category": "fuerza", "source": "Compendium Code 02052"},
    "flexiones": {"name": "Flexiones de brazos", "met": 8.0, "category": "fuerza", "source": "Compendium Code 02052"},
    "push ups": {"name": "Flexiones (push-ups)", "met": 8.0, "category": "fuerza", "source": "Compendium Code 02052"},
    "abdominales": {"name": "Abdominales", "met": 4.0, "category": "fuerza", "source": "Compendium Code 02022"},
    "plancha": {"name": "Plancha isométrica", "met": 4.0, "category": "fuerza", "source": "Compendium Code 02022"},

    # === CARDIO ===
    "correr": {"name": "Correr (8 km/h)", "met": 8.3, "category": "cardio", "source": "Compendium Code 12029"},
    "running": {"name": "Running (8 km/h)", "met": 8.3, "category": "cardio", "source": "Compendium Code 12029"},
    "trotar": {"name": "Trotar (6.4 km/h)", "met": 7.0, "category": "cardio", "source": "Compendium Code 12020"},
    "correr rapido": {"name": "Correr rápido (12 km/h)", "met": 11.5, "category": "cardio", "source": "Compendium Code 12050"},
    "sprint": {"name": "Sprint", "met": 14.0, "category": "cardio", "source": "Compendium Code 12080"},
    "caminar": {"name": "Caminar (5.5 km/h)", "met": 3.6, "category": "cardio", "source": "Compendium Code 17190"},
    "caminata": {"name": "Caminata moderada", "met": 3.6, "category": "cardio", "source": "Compendium Code 17190"},
    "bicicleta": {"name": "Ciclismo moderado", "met": 7.5, "category": "cardio", "source": "Compendium Code 01040"},
    "ciclismo": {"name": "Ciclismo moderado", "met": 7.5, "category": "cardio", "source": "Compendium Code 01040"},
    "bici": {"name": "Ciclismo moderado", "met": 7.5, "category": "cardio", "source": "Compendium Code 01040"},
    "spinning": {"name": "Spinning / ciclo indoor", "met": 8.5, "category": "cardio", "source": "Compendium Code 02015"},
    "elíptica": {"name": "Máquina elíptica", "met": 5.0, "category": "cardio", "source": "Compendium Code 02048"},
    "eliptica": {"name": "Máquina elíptica", "met": 5.0, "category": "cardio", "source": "Compendium Code 02048"},
    "escaladora": {"name": "Escaladora (stepper)", "met": 9.0, "category": "cardio", "source": "Compendium Code 02065"},
    "remo": {"name": "Máquina de remo (moderado)", "met": 7.0, "category": "cardio", "source": "Compendium Code 02070"},
    "saltar cuerda": {"name": "Saltar la cuerda", "met": 12.3, "category": "cardio", "source": "Compendium Code 15551"},
    "cuerda": {"name": "Saltar la cuerda", "met": 12.3, "category": "cardio", "source": "Compendium Code 15551"},

    # === SWIMMING ===
    "natación": {"name": "Natación (moderada)", "met": 7.0, "category": "cardio", "source": "Compendium Code 18310"},
    "natacion": {"name": "Natación (moderada)", "met": 7.0, "category": "cardio", "source": "Compendium Code 18310"},
    "nadar": {"name": "Nadar (moderado)", "met": 7.0, "category": "cardio", "source": "Compendium Code 18310"},

    # === HIIT / CROSSFIT ===
    "crossfit": {"name": "CrossFit / HIIT", "met": 10.0, "category": "hiit", "source": "Compendium Code 02072"},
    "hiit": {"name": "HIIT (entrenamiento intervalos)", "met": 10.0, "category": "hiit", "source": "Compendium Code 02072"},
    "circuito": {"name": "Entrenamiento en circuito", "met": 8.0, "category": "hiit", "source": "Compendium Code 02040"},
    "burpees": {"name": "Burpees", "met": 10.0, "category": "hiit", "source": "Compendium Code 02072 (estimado)"},
    "calistenia": {"name": "Calistenia (vigorosa)", "met": 8.0, "category": "fuerza", "source": "Compendium Code 02052"},

    # === SPORTS ===
    "fútbol": {"name": "Fútbol", "met": 7.0, "category": "deporte", "source": "Compendium Code 15610"},
    "futbol": {"name": "Fútbol", "met": 7.0, "category": "deporte", "source": "Compendium Code 15610"},
    "básquet": {"name": "Básquetbol", "met": 6.5, "category": "deporte", "source": "Compendium Code 15055"},
    "basquet": {"name": "Básquetbol", "met": 6.5, "category": "deporte", "source": "Compendium Code 15055"},
    "basketball": {"name": "Basketball", "met": 6.5, "category": "deporte", "source": "Compendium Code 15055"},
    "tenis": {"name": "Tenis (singles)", "met": 7.3, "category": "deporte", "source": "Compendium Code 15675"},
    "boxeo": {"name": "Boxeo (entrenamiento)", "met": 7.8, "category": "deporte", "source": "Compendium Code 15150"},
    "artes marciales": {"name": "Artes marciales", "met": 10.3, "category": "deporte", "source": "Compendium Code 15425"},
    "kickboxing": {"name": "Kickboxing", "met": 10.3, "category": "deporte", "source": "Compendium Code 15425"},
    "senderismo": {"name": "Senderismo / hiking", "met": 6.0, "category": "cardio", "source": "Compendium Code 17080"},
    "hiking": {"name": "Senderismo / hiking", "met": 6.0, "category": "cardio", "source": "Compendium Code 17080"},
    "escalada": {"name": "Escalada en roca", "met": 8.0, "category": "deporte", "source": "Compendium Code 15360"},

    # === FLEXIBILITY / MIND-BODY ===
    "yoga": {"name": "Yoga (general)", "met": 3.0, "category": "flexibilidad", "source": "Compendium Code 02101"},
    "pilates": {"name": "Pilates", "met": 3.8, "category": "flexibilidad", "source": "Compendium Code 02101"},
    "stretching": {"name": "Estiramientos", "met": 2.3, "category": "flexibilidad", "source": "Compendium Code 02101"},
    "estiramientos": {"name": "Estiramientos", "met": 2.3, "category": "flexibilidad", "source": "Compendium Code 02101"},
    "tai chi": {"name": "Tai Chi", "met": 3.0, "category": "flexibilidad", "source": "Compendium Code 02101"},
    "danza": {"name": "Danza (general)", "met": 5.5, "category": "cardio", "source": "Compendium Code 03031"},
    "baile": {"name": "Baile (general)", "met": 5.5, "category": "cardio", "source": "Compendium Code 03031"},
}


def normalize(text):
    text = text.lower().strip()
    replacements = {"á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ñ": "n"}
    for k, v in replacements.items():
        text = text.replace(k, v)
    return text


def find_exercise(query):
    normalized = normalize(query)
    
    # Exact match
    for key, data in EXERCISE_DB.items():
        if normalize(key) == normalized:
            return data
    
    # Partial match
    matches = []
    for key, data in EXERCISE_DB.items():
        nk = normalize(key)
        if nk in normalized or normalized in nk:
            matches.append((key, data))
    
    if matches:
        matches.sort(key=lambda x: len(x[0]), reverse=True)
        return matches[0][1]
    
    # Word-level
    query_words = set(normalized.split())
    for key, data in EXERCISE_DB.items():
        key_words = set(normalize(key).split())
        if query_words & key_words:
            return data
    
    return None


def calculate_calories(met, weight_kg, duration_min):
    """Calories = MET × weight(kg) × duration(hours)"""
    duration_hours = duration_min / 60.0
    return round(met * weight_kg * duration_hours)


def get_intensity(met):
    if met < 3:
        return "baja"
    elif met < 6:
        return "moderada"
    elif met < 9:
        return "alta"
    else:
        return "muy alta"


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No arguments provided"}))
        sys.exit(1)
    
    try:
        args = json.loads(base64.b64decode(sys.argv[1]))
    except Exception:
        print(json.dumps({"error": "Invalid arguments"}))
        sys.exit(1)
    
    exercise_query = args.get("exercise", "")
    duration_min = args.get("duration_min", 30)
    weight_kg = args.get("weight_kg", 70)
    
    if not exercise_query:
        print(json.dumps({"error": "No exercise specified"}))
        sys.exit(1)
    
    exercise_data = find_exercise(exercise_query)
    
    if exercise_data:
        calories = calculate_calories(exercise_data["met"], weight_kg, duration_min)
        result = {
            "found": True,
            "query": exercise_query,
            "name": exercise_data["name"],
            "met": exercise_data["met"],
            "category": exercise_data["category"],
            "intensity": get_intensity(exercise_data["met"]),
            "duration_min": duration_min,
            "weight_kg": weight_kg,
            "calories_burned": calories,
            "source": exercise_data["source"],
            "formula": f"MET({exercise_data['met']}) × peso({weight_kg}kg) × duración({round(duration_min/60, 2)}h) = {calories} kcal"
        }
        print(json.dumps(result, ensure_ascii=False))
    else:
        print(json.dumps({
            "found": False,
            "query": exercise_query,
            "message": f"No se encontró '{exercise_query}'. Prueba: pesas, correr, natación, yoga, fútbol, etc.",
            "available_categories": ["fuerza", "cardio", "hiit", "deporte", "flexibilidad"],
        }, ensure_ascii=False))


if __name__ == "__main__":
    main()
