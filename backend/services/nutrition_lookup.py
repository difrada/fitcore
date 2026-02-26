#!/usr/bin/env python3
"""
Nutrition Lookup Service
Uses a comprehensive food database based on USDA FoodData Central values.
For production, integrate with the official USDA FoodData Central API:
https://fdc.nal.usda.gov/api-guide.html (API key: https://fdc.nal.usda.gov/api-key-signup.html)

Also compatible with Open Food Facts API (free, no key needed):
https://world.openfoodfacts.org/api/v2/search
"""

import sys
import json
import base64
import re

# Comprehensive food database (per 100g) based on USDA FoodData Central
# Source references: USDA SR28, FoodData Central (fdc.nal.usda.gov)
FOOD_DB = {
    # === PROTEINS ===
    "pollo": {"name": "Pechuga de pollo (cocida)", "calories": 165, "protein": 31, "carbs": 0, "fat": 3.6, "fiber": 0, "serving_g": 150, "source": "USDA FDC #171077"},
    "pechuga": {"name": "Pechuga de pollo (cocida)", "calories": 165, "protein": 31, "carbs": 0, "fat": 3.6, "fiber": 0, "serving_g": 150, "source": "USDA FDC #171077"},
    "res": {"name": "Carne de res magra (cocida)", "calories": 250, "protein": 26, "carbs": 0, "fat": 15, "fiber": 0, "serving_g": 150, "source": "USDA FDC #174032"},
    "carne": {"name": "Carne de res magra (cocida)", "calories": 250, "protein": 26, "carbs": 0, "fat": 15, "fiber": 0, "serving_g": 150, "source": "USDA FDC #174032"},
    "cerdo": {"name": "Lomo de cerdo (cocido)", "calories": 242, "protein": 27, "carbs": 0, "fat": 14, "fiber": 0, "serving_g": 150, "source": "USDA FDC #167820"},
    "salmon": {"name": "Salmón (cocido)", "calories": 208, "protein": 20, "carbs": 0, "fat": 13, "fiber": 0, "serving_g": 150, "source": "USDA FDC #175167"},
    "salmón": {"name": "Salmón (cocido)", "calories": 208, "protein": 20, "carbs": 0, "fat": 13, "fiber": 0, "serving_g": 150, "source": "USDA FDC #175167"},
    "atún": {"name": "Atún (enlatado, agua)", "calories": 116, "protein": 26, "carbs": 0, "fat": 0.8, "fiber": 0, "serving_g": 100, "source": "USDA FDC #171986"},
    "atun": {"name": "Atún (enlatado, agua)", "calories": 116, "protein": 26, "carbs": 0, "fat": 0.8, "fiber": 0, "serving_g": 100, "source": "USDA FDC #171986"},
    "huevo": {"name": "Huevo (cocido)", "calories": 155, "protein": 13, "carbs": 1.1, "fat": 11, "fiber": 0, "serving_g": 50, "source": "USDA FDC #173424"},
    "huevos": {"name": "Huevo (cocido)", "calories": 155, "protein": 13, "carbs": 1.1, "fat": 11, "fiber": 0, "serving_g": 50, "source": "USDA FDC #173424"},
    "tofu": {"name": "Tofu firme", "calories": 76, "protein": 8, "carbs": 1.9, "fat": 4.8, "fiber": 0.3, "serving_g": 120, "source": "USDA FDC #172475"},
    "lentejas": {"name": "Lentejas (cocidas)", "calories": 116, "protein": 9, "carbs": 20, "fat": 0.4, "fiber": 7.9, "serving_g": 150, "source": "USDA FDC #172421"},
    "frijoles": {"name": "Frijoles negros (cocidos)", "calories": 132, "protein": 8.9, "carbs": 24, "fat": 0.5, "fiber": 8.7, "serving_g": 150, "source": "USDA FDC #173735"},
    "garbanzos": {"name": "Garbanzos (cocidos)", "calories": 164, "protein": 8.9, "carbs": 27, "fat": 2.6, "fiber": 7.6, "serving_g": 150, "source": "USDA FDC #173757"},

    # === CARBS ===
    "arroz": {"name": "Arroz blanco (cocido)", "calories": 130, "protein": 2.7, "carbs": 28, "fat": 0.3, "fiber": 0.4, "serving_g": 200, "source": "USDA FDC #169756"},
    "arroz integral": {"name": "Arroz integral (cocido)", "calories": 111, "protein": 2.6, "carbs": 23, "fat": 0.9, "fiber": 1.8, "serving_g": 200, "source": "USDA FDC #169704"},
    "pasta": {"name": "Pasta (cocida)", "calories": 131, "protein": 5, "carbs": 25, "fat": 1.1, "fiber": 1.8, "serving_g": 200, "source": "USDA FDC #168917"},
    "pan": {"name": "Pan blanco", "calories": 265, "protein": 9, "carbs": 49, "fat": 3.2, "fiber": 2.7, "serving_g": 60, "source": "USDA FDC #172680"},
    "pan integral": {"name": "Pan integral", "calories": 247, "protein": 13, "carbs": 41, "fat": 3.4, "fiber": 7, "serving_g": 60, "source": "USDA FDC #168011"},
    "papa": {"name": "Papa (cocida)", "calories": 87, "protein": 1.9, "carbs": 20, "fat": 0.1, "fiber": 1.8, "serving_g": 200, "source": "USDA FDC #170032"},
    "patata": {"name": "Papa (cocida)", "calories": 87, "protein": 1.9, "carbs": 20, "fat": 0.1, "fiber": 1.8, "serving_g": 200, "source": "USDA FDC #170032"},
    "avena": {"name": "Avena (cocida)", "calories": 68, "protein": 2.4, "carbs": 12, "fat": 1.4, "fiber": 1.7, "serving_g": 250, "source": "USDA FDC #173904"},
    "quinoa": {"name": "Quinoa (cocida)", "calories": 120, "protein": 4.4, "carbs": 21, "fat": 1.9, "fiber": 2.8, "serving_g": 185, "source": "USDA FDC #168874"},
    "plátano": {"name": "Plátano (banana)", "calories": 89, "protein": 1.1, "carbs": 23, "fat": 0.3, "fiber": 2.6, "serving_g": 120, "source": "USDA FDC #173944"},
    "platano": {"name": "Plátano (banana)", "calories": 89, "protein": 1.1, "carbs": 23, "fat": 0.3, "fiber": 2.6, "serving_g": 120, "source": "USDA FDC #173944"},
    "banana": {"name": "Banana", "calories": 89, "protein": 1.1, "carbs": 23, "fat": 0.3, "fiber": 2.6, "serving_g": 120, "source": "USDA FDC #173944"},

    # === VEGETABLES ===
    "ensalada": {"name": "Ensalada mixta", "calories": 20, "protein": 1.5, "carbs": 3.5, "fat": 0.2, "fiber": 2, "serving_g": 200, "source": "USDA FDC estimado"},
    "brócoli": {"name": "Brócoli (cocido)", "calories": 35, "protein": 2.4, "carbs": 7.2, "fat": 0.4, "fiber": 3.3, "serving_g": 150, "source": "USDA FDC #170379"},
    "brocoli": {"name": "Brócoli (cocido)", "calories": 35, "protein": 2.4, "carbs": 7.2, "fat": 0.4, "fiber": 3.3, "serving_g": 150, "source": "USDA FDC #170379"},
    "espinaca": {"name": "Espinaca (cocida)", "calories": 23, "protein": 2.9, "carbs": 3.6, "fat": 0.3, "fiber": 2.4, "serving_g": 150, "source": "USDA FDC #168462"},
    "tomate": {"name": "Tomate", "calories": 18, "protein": 0.9, "carbs": 3.9, "fat": 0.2, "fiber": 1.2, "serving_g": 150, "source": "USDA FDC #170457"},
    "zanahoria": {"name": "Zanahoria", "calories": 41, "protein": 0.9, "carbs": 10, "fat": 0.2, "fiber": 2.8, "serving_g": 100, "source": "USDA FDC #170393"},
    "aguacate": {"name": "Aguacate", "calories": 160, "protein": 2, "carbs": 8.5, "fat": 15, "fiber": 6.7, "serving_g": 100, "source": "USDA FDC #171705"},

    # === DAIRY ===
    "leche": {"name": "Leche entera", "calories": 61, "protein": 3.2, "carbs": 4.8, "fat": 3.3, "fiber": 0, "serving_g": 250, "source": "USDA FDC #171265"},
    "yogur": {"name": "Yogur natural", "calories": 63, "protein": 5.3, "carbs": 7, "fat": 1.6, "fiber": 0, "serving_g": 200, "source": "USDA FDC #171286"},
    "yogurt": {"name": "Yogur natural", "calories": 63, "protein": 5.3, "carbs": 7, "fat": 1.6, "fiber": 0, "serving_g": 200, "source": "USDA FDC #171286"},
    "queso": {"name": "Queso (promedio)", "calories": 350, "protein": 25, "carbs": 1.3, "fat": 27, "fiber": 0, "serving_g": 30, "source": "USDA FDC #170854"},
    "whey": {"name": "Proteína whey (scoop)", "calories": 120, "protein": 24, "carbs": 3, "fat": 1.5, "fiber": 0, "serving_g": 32, "source": "Valor promedio industria"},
    "proteina": {"name": "Proteína whey (scoop)", "calories": 120, "protein": 24, "carbs": 3, "fat": 1.5, "fiber": 0, "serving_g": 32, "source": "Valor promedio industria"},

    # === FATS & NUTS ===
    "almendras": {"name": "Almendras", "calories": 579, "protein": 21, "carbs": 22, "fat": 50, "fiber": 12.5, "serving_g": 30, "source": "USDA FDC #170567"},
    "nueces": {"name": "Nueces", "calories": 654, "protein": 15, "carbs": 14, "fat": 65, "fiber": 6.7, "serving_g": 30, "source": "USDA FDC #170187"},
    "maní": {"name": "Maní (cacahuate)", "calories": 567, "protein": 26, "carbs": 16, "fat": 49, "fiber": 8.5, "serving_g": 30, "source": "USDA FDC #172430"},
    "mani": {"name": "Maní (cacahuate)", "calories": 567, "protein": 26, "carbs": 16, "fat": 49, "fiber": 8.5, "serving_g": 30, "source": "USDA FDC #172430"},
    "aceite oliva": {"name": "Aceite de oliva", "calories": 884, "protein": 0, "carbs": 0, "fat": 100, "fiber": 0, "serving_g": 15, "source": "USDA FDC #171413"},

    # === COMMON DISHES (Latin American) ===
    "arepa": {"name": "Arepa (maíz)", "calories": 200, "protein": 4, "carbs": 30, "fat": 7, "fiber": 2, "serving_g": 120, "source": "Tabla composición alimentos colombianos ICBF"},
    "bandeja paisa": {"name": "Bandeja paisa", "calories": 800, "protein": 45, "carbs": 70, "fat": 35, "fiber": 8, "serving_g": 500, "source": "Estimación plato compuesto ICBF"},
    "sancocho": {"name": "Sancocho", "calories": 250, "protein": 18, "carbs": 25, "fat": 8, "fiber": 3, "serving_g": 400, "source": "Estimación plato compuesto ICBF"},
    "empanada": {"name": "Empanada", "calories": 280, "protein": 8, "carbs": 30, "fat": 14, "fiber": 2, "serving_g": 100, "source": "Tabla composición alimentos ICBF"},
    "tacos": {"name": "Tacos (2 unidades)", "calories": 350, "protein": 18, "carbs": 30, "fat": 16, "fiber": 3, "serving_g": 200, "source": "USDA FDC estimado"},
    "burrito": {"name": "Burrito", "calories": 450, "protein": 22, "carbs": 50, "fat": 16, "fiber": 5, "serving_g": 300, "source": "USDA FDC estimado"},
    "pizza": {"name": "Pizza (2 porciones)", "calories": 540, "protein": 22, "carbs": 60, "fat": 22, "fiber": 3, "serving_g": 200, "source": "USDA FDC #174839"},
    "hamburguesa": {"name": "Hamburguesa", "calories": 540, "protein": 28, "carbs": 40, "fat": 28, "fiber": 2, "serving_g": 220, "source": "USDA FDC estimado"},
    "sushi": {"name": "Sushi (8 piezas)", "calories": 350, "protein": 15, "carbs": 50, "fat": 8, "fiber": 2, "serving_g": 250, "source": "USDA FDC estimado"},

    # === DRINKS ===
    "café": {"name": "Café negro", "calories": 2, "protein": 0.3, "carbs": 0, "fat": 0, "fiber": 0, "serving_g": 240, "source": "USDA FDC #171890"},
    "cafe": {"name": "Café negro", "calories": 2, "protein": 0.3, "carbs": 0, "fat": 0, "fiber": 0, "serving_g": 240, "source": "USDA FDC #171890"},
    "jugo naranja": {"name": "Jugo de naranja", "calories": 45, "protein": 0.7, "carbs": 10, "fat": 0.2, "fiber": 0.2, "serving_g": 250, "source": "USDA FDC #169098"},
}


def normalize(text):
    """Normalize text for matching."""
    text = text.lower().strip()
    replacements = {"á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ñ": "n"}
    for k, v in replacements.items():
        text = text.replace(k, v)
    return text


def find_food(query):
    """Find food in database with fuzzy matching."""
    normalized = normalize(query)
    
    # Exact match
    for key, data in FOOD_DB.items():
        if normalize(key) == normalized:
            return data
    
    # Partial match
    matches = []
    for key, data in FOOD_DB.items():
        nk = normalize(key)
        if nk in normalized or normalized in nk:
            matches.append((key, data))
    
    if matches:
        # Return best match (longest key match)
        matches.sort(key=lambda x: len(x[0]), reverse=True)
        return matches[0][1]
    
    # Word-level match
    query_words = set(normalized.split())
    for key, data in FOOD_DB.items():
        key_words = set(normalize(key).split())
        if query_words & key_words:
            return data
    
    return None


def calculate_serving(food_data, quantity_hint=None):
    """Calculate nutrition for a specific serving."""
    serving_g = food_data["serving_g"]
    factor = serving_g / 100.0
    
    return {
        "name": food_data["name"],
        "serving_size": f"{serving_g}g (porción estándar)",
        "calories": round(food_data["calories"] * factor),
        "protein": round(food_data["protein"] * factor, 1),
        "carbs": round(food_data["carbs"] * factor, 1),
        "fat": round(food_data["fat"] * factor, 1),
        "fiber": round(food_data["fiber"] * factor, 1),
        "source": food_data.get("source", "USDA FoodData Central"),
        "per_100g": {
            "calories": food_data["calories"],
            "protein": food_data["protein"],
            "carbs": food_data["carbs"],
            "fat": food_data["fat"],
            "fiber": food_data["fiber"],
        }
    }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No arguments provided"}))
        sys.exit(1)
    
    try:
        args = json.loads(base64.b64decode(sys.argv[1]))
    except Exception:
        print(json.dumps({"error": "Invalid arguments"}))
        sys.exit(1)
    
    food_query = args.get("food", "")
    if not food_query:
        print(json.dumps({"error": "No food specified"}))
        sys.exit(1)
    
    food_data = find_food(food_query)
    
    if food_data:
        result = calculate_serving(food_data)
        result["found"] = True
        result["query"] = food_query
        print(json.dumps(result, ensure_ascii=False))
    else:
        print(json.dumps({
            "found": False,
            "query": food_query,
            "message": f"No se encontró '{food_query}' en la base de datos local. Consulta USDA FoodData Central (fdc.nal.usda.gov) o Open Food Facts.",
            "suggestion": "Prueba con el nombre del ingrediente principal (ej: 'pollo', 'arroz', 'pasta')"
        }, ensure_ascii=False))


if __name__ == "__main__":
    main()
