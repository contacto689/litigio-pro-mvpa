from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os
import json
from dotenv import load_dotenv

# Carga de variables de entorno (API KEY)
load_dotenv()

app = Flask(__name__)
# Habilitar CORS para permitir comunicación con el Frontend
CORS(app)

# Configuración de Google Gemini con tu modelo específico
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('models/gemini-3.1-flash-lite-preview')

@app.route('/generar-casos', methods=['POST'])
def generar_casos():
    """Genera 5 expedientes jurídicos de alta complejidad técnica."""
    prompt = (
        "Genera una lista de 5 casos jurídicos ficticios de alta complejidad. "
        "Enfocados en Derecho Civil, Penal o Tecnológico. "
        "Responde EXCLUSIVAMENTE con un array JSON puro: "
        "[{\"id\":1, \"titulo\": \"Nombre\", \"descripcion\": \"Hechos detallados\"}]"
    )
    try:
        response = model.generate_content(prompt)
        # Limpieza de markdown para asegurar JSON válido
        texto_limpio = response.text.replace('```json', '').replace('```', '').strip()
        return texto_limpio, 200, {'Content-Type': 'application/json'}
    except Exception as e:
        print(f"Error en generación: {e}")
        return jsonify([{"id": 0, "titulo": "Error", "descripcion": "No se pudieron cargar expedientes."}]), 200

@app.route('/debatir', methods=['POST'])
def debatir():
    """Maneja el debate extenso (8 turnos) con calificación implacable."""
    data = request.json
    argumento = data.get('argumento', '')
    caso = data.get('caso', '')
    rol_usuario = data.get('rol', '')
    turnos = data.get('turnos', 0)

    # CONFIGURACIÓN DE RIGOR: 8 turnos de debate
    limite_turnos = 8 
    finalizar = turnos >= limite_turnos
    contraparte = "Fiscalía" if rol_usuario == "Abogado Defensor" else "Abogado Defensor"

    prompt = f"""
    Eres un litigante de élite ({contraparte}) con un estilo agresivo, técnico y sumamente crítico.
    Estamos en la audiencia del caso: {caso}.
    El {rol_usuario} argumenta: "{argumento}".
    Turno actual: {turnos} de {limite_turnos}.

    OBJETIVO:
    - Encuentra debilidades procesales, falta de fundamentación legal o vacíos lógicos.
    - No aceptes argumentos emocionales; exige base normativa.

    SISTEMA DE CALIFICACIÓN (HIPER-EXIGENTE):
    - 0-30: Inadmisible. Falta de técnica total.
    - 31-50: Deficiente. Argumentos genéricos sin sustento.
    - 51-70: Competente. Nivel de abogado promedio.
    - 71-90: Excelente. Gran manejo de jurisprudencia y retórica.
    - 91-100: Magistral. Solo para argumentos que cambiarían el curso de un juicio real.

    RESPONDE ÚNICAMENTE EN FORMATO JSON:
    {{
      "respuesta_ia": "refutación punzante y técnica (máx 90 palabras)",
      "analisis": {{
        "fundamentacion_legal": 0,
        "coherencia_logica": 0,
        "persuasion_retorica": 0,
        "tecnica_procesal": 0,
        "uso_terminologia": 0,
        "feedback_sutil": "Crítica constructiva severa de una línea"
      }},
      "finalizar": {str(finalizar).lower()},
      "sentencia": "Si finalizar es true, dicta una SENTENCIA MAGISTRAL de 200 palabras analizando el rigor jurídico de las partes."
    }}
    """
    try:
        response = model.generate_content(prompt)
        texto_limpio = response.text.replace('```json', '').replace('```', '').strip()
        return texto_limpio, 200, {'Content-Type': 'application/json'}
    except Exception as e:
        print(f"Error en debate: {e}")
        return jsonify({"error": "Error de conexión con el estrado."}), 200

if __name__ == '__main__':
    # Esto es OBLIGATORIO para Render
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)