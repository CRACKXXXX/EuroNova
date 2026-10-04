"""
EuroNova — Motor de extracción de datos autónomo.

Extrae proyectos de movilidad europea del canal de Telegram @yeseuropa,
los procesa con Gemini 1.5 Flash y los almacena en Supabase.

Soporta dos modos de extracción:
  - Modo TELEGRAM (requiere sesión): Usa Telethon para extraer mensajes + PDFs.
  - Modo WEB (sin autenticación): Scraping de t.me/s/yeseuropa (HTML público).

Uso:
    python scraper.py              # Auto-detecta modo según sesión disponible
    python scraper.py --web        # Forzar modo web (sin Telegram)
    python scraper.py --telegram   # Forzar modo Telegram (requiere sesión)
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import sys
import tempfile
from pathlib import Path
from typing import Final

import httpx
import pdfplumber
from dotenv import load_dotenv
from google import genai
from supabase import Client, create_client

# ---------------------------------------------------------------------------
# 0. Configuración y constantes
# ---------------------------------------------------------------------------

# Cargar variables del .env.local del proyecto Next.js (un nivel arriba)
_ENV_PATH: Final = Path(__file__).resolve().parent.parent / "euronova" / ".env.local"
load_dotenv(_ENV_PATH)

GEMINI_API_KEY: Final[str] = os.environ["GEMINI_API_KEY"]
SUPABASE_URL: Final[str] = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_ANON_KEY: Final[str] = os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]

# Credenciales de Telegram (opcionales en modo web)
TELEGRAM_API_ID: int | None = None
TELEGRAM_API_HASH: str | None = None
_raw_id = os.environ.get("TELEGRAM_API_ID")
_raw_hash = os.environ.get("TELEGRAM_API_HASH")
if _raw_id and _raw_hash:
    TELEGRAM_API_ID = int(_raw_id)
    TELEGRAM_API_HASH = _raw_hash

# UUID del perfil de organización "EuroNova Auto-Scraper" en la tabla users_org.
# Creado automáticamente: scraper@euronova.com → auth.users → users_org
SYSTEM_ORG_ID: Final[str] = "0610184a-a16e-4dcc-a8f6-b9ddef963bf5"

TELEGRAM_CHANNEL: Final[str] = "yeseuropa"
MESSAGES_LIMIT: Final[int] = 10
GEMINI_MODEL: Final[str] = "gemini-1.5-flash"
WEB_CHANNEL_URL: Final[str] = f"https://t.me/s/{TELEGRAM_CHANNEL}"

GEMINI_SYSTEM_INSTRUCTION: Final[str] = (
    "Eres el procesador de datos de EuroNova. "
    "Analiza el texto del proyecto de movilidad europea. "
    "Devuelve ÚNICAMENTE un JSON válido sin Markdown que cumpla esta estructura: "
    "{ "
    '"title": string, '
    '"project_type": "ESC"|"Youth Exchange"|"Training", '
    '"dest_country": string (ISO 3166-1 alpha-2), '
    '"min_age": number, '
    '"max_age": number, '
    '"eligible_countries": string[] (ISO 3166-1 alpha-2), '
    '"covers_rup_flights": boolean, '
    '"is_last_minute": boolean, '
    '"official_url": string, '
    '"lat": float, '
    '"lng": float '
    "}. "
    "Si no puedes determinar un campo con certeza, usa null. "
    "Si el texto no corresponde a un proyecto de movilidad europea, "
    'devuelve {"skip": true}.'
)

# ---------------------------------------------------------------------------
# 1. Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("euronova.scraper")

# Silenciar loggers internos de Telethon para evitar colisiones con stdin
logging.getLogger("telethon").setLevel(logging.WARNING)

# ---------------------------------------------------------------------------
# 2. Clientes externos
# ---------------------------------------------------------------------------

supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

gemini_client = genai.Client(api_key=GEMINI_API_KEY)


# ---------------------------------------------------------------------------
# 3. Funciones auxiliares
# ---------------------------------------------------------------------------


def extract_pdf_text(pdf_path: str) -> str:
    """Extrae todo el texto de un archivo PDF usando pdfplumber."""
    pages_text: list[str] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages_text.append(text)
    return "\n".join(pages_text)


def ask_gemini(consolidated_text: str) -> dict | None:
    """Envía el texto consolidado a Gemini y devuelve el JSON parseado."""
    try:
        response = gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=consolidated_text,
            config=genai.types.GenerateContentConfig(
                system_instruction=GEMINI_SYSTEM_INSTRUCTION,
                temperature=0.1,
                response_mime_type="application/json",
            ),
        )

        raw_output = response.text.strip()
        # Limpiar posibles bloques de código Markdown residuales
        if raw_output.startswith("```"):
            raw_output = raw_output.split("\n", 1)[1]
        if raw_output.endswith("```"):
            raw_output = raw_output.rsplit("```", 1)[0]
        raw_output = raw_output.strip()

        parsed: dict = json.loads(raw_output)
        return parsed

    except json.JSONDecodeError as exc:
        log.error("Gemini devolvió JSON inválido: %s", exc)
        return None
    except Exception as exc:
        log.error("Error al consultar Gemini: %s", exc)
        return None


def project_exists(title: str, dest_country: str) -> bool:
    """Verifica si ya existe un proyecto con el mismo título y país destino."""
    result = (
        supabase_client.table("projects")
        .select("id")
        .eq("title", title)
        .eq("dest_country", dest_country)
        .limit(1)
        .execute()
    )
    return len(result.data) > 0


def insert_project(project_data: dict) -> None:
    """Inserta un nuevo proyecto en Supabase."""
    row = {
        "org_id": SYSTEM_ORG_ID,
        "project_type": project_data.get("project_type", "ESC"),
        "title": project_data["title"],
        "description": "",
        "dest_country": project_data.get("dest_country", ""),
        "min_age": project_data.get("min_age", 18),
        "max_age": project_data.get("max_age", 30),
        "eligible_countries": project_data.get("eligible_countries", []),
        "covers_rup_flights": project_data.get("covers_rup_flights", False),
        "is_last_minute": project_data.get("is_last_minute", False),
        "official_url": project_data.get("official_url", ""),
        "lat": project_data.get("lat"),
        "lng": project_data.get("lng"),
        "status": "open",
    }

    supabase_client.table("projects").insert(row).execute()
    log.info("✅ Proyecto insertado: '%s' (%s)", row["title"], row["dest_country"])


def process_text_with_gemini(text: str, source_id: str) -> tuple[str, int]:
    """
    Procesa un texto con Gemini e intenta insertarlo en Supabase.
    Devuelve (estado, conteo): 'inserted', 'duplicate', 'skipped'.
    """
    project_data = ask_gemini(text)

    if project_data is None:
        log.warning("⚠️ No se pudo procesar: %s", source_id)
        return "skipped", 0

    if project_data.get("skip"):
        log.info("⏭️ %s no es un proyecto. Omitido.", source_id)
        return "skipped", 0

    title = project_data.get("title", "")
    dest_country = project_data.get("dest_country", "")

    if not title:
        log.warning("⚠️ Proyecto sin título: %s. Omitido.", source_id)
        return "skipped", 0

    if project_exists(title, dest_country):
        log.info("🔁 Duplicado: '%s' (%s). Omitido.", title, dest_country)
        return "duplicate", 0

    try:
        insert_project(project_data)
        return "inserted", 1
    except Exception as exc:
        log.error("💥 Error al insertar en Supabase el proyecto '%s': %s", title, exc)
        return "skipped", 0


# ---------------------------------------------------------------------------
# 4. Extracción de mensajes — Modo WEB (sin autenticación)
# ---------------------------------------------------------------------------


def fetch_messages_web() -> list[str]:
    """
    Extrae textos de mensajes de la vista pública de Telegram: t.me/s/channel.
    No requiere autenticación. Devuelve una lista de textos de mensajes.
    """
    log.info("🌐 Modo WEB: Extrayendo de %s ...", WEB_CHANNEL_URL)

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/131.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    }

    try:
        response = httpx.get(WEB_CHANNEL_URL, headers=headers, timeout=30, follow_redirects=True)
        response.raise_for_status()
    except httpx.HTTPError as exc:
        log.error("❌ Error al acceder a %s: %s", WEB_CHANNEL_URL, exc)
        return []

    html = response.text

    # Extraer contenido de los bloques de mensaje de Telegram web preview
    # Los mensajes están en <div class="tgme_widget_message_text ...">
    pattern = r'<div class="tgme_widget_message_text[^"]*"[^>]*>(.*?)</div>'
    raw_blocks = re.findall(pattern, html, re.DOTALL)

    if not raw_blocks:
        log.warning("⚠️ No se encontraron mensajes en la página.")
        log.info("   Esto puede ocurrir si el canal bloquea la vista web.")
        return []

    # Limpiar HTML de cada bloque a texto plano
    messages: list[str] = []
    for block in raw_blocks:
        text = _html_to_text(block)
        if text and len(text) > 50:  # Filtrar mensajes muy cortos
            messages.append(text)

    log.info("📨 %d mensajes extraídos vía web.", len(messages))
    return messages[:MESSAGES_LIMIT]


def _html_to_text(html_fragment: str) -> str:
    """Convierte un fragmento HTML simple a texto plano."""
    # Reemplazar <br> y <br/> por saltos de línea
    text = re.sub(r"<br\s*/?>", "\n", html_fragment, flags=re.IGNORECASE)
    # Extraer href de enlaces
    text = re.sub(r'<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>', r'\2 (\1)', text)
    # Eliminar todas las demás etiquetas HTML
    text = re.sub(r"<[^>]+>", "", text)
    # Decodificar entidades HTML comunes
    text = text.replace("&amp;", "&")
    text = text.replace("&lt;", "<")
    text = text.replace("&gt;", ">")
    text = text.replace("&quot;", '"')
    text = text.replace("&#39;", "'")
    text = text.replace("&nbsp;", " ")
    return text.strip()


# ---------------------------------------------------------------------------
# 5. Extracción de mensajes — Modo TELEGRAM (con sesión)
# ---------------------------------------------------------------------------


async def fetch_messages_telegram() -> list[str]:
    """
    Extrae textos de mensajes vía Telethon (API de Telegram).
    Requiere sesión autenticada. Soporta descarga de PDFs adjuntos.
    """
    from telethon import TelegramClient

    session_path = str(Path(__file__).resolve().parent / "euronova_session")
    client = TelegramClient(session_path, TELEGRAM_API_ID, TELEGRAM_API_HASH)

    messages_texts: list[str] = []

    async with client:
        log.info("📡 Modo TELEGRAM: Conectado. Leyendo @%s...", TELEGRAM_CHANNEL)
        channel = await client.get_entity(TELEGRAM_CHANNEL)
        messages = await client.get_messages(channel, limit=MESSAGES_LIMIT)
        log.info("📨 %d mensajes obtenidos vía API.", len(messages))

        for msg in messages:
            if not msg.text and not msg.document:
                continue

            parts: list[str] = []

            if msg.text:
                parts.append(msg.text)

            # Descargar PDF adjunto (Infopack) si existe
            if msg.document and hasattr(msg.document, "mime_type"):
                if msg.document.mime_type == "application/pdf":
                    with tempfile.NamedTemporaryFile(
                        suffix=".pdf", delete=False
                    ) as tmp:
                        tmp_path = tmp.name

                    try:
                        log.info("📄 Descargando PDF adjunto...")
                        await client.download_media(msg.document, tmp_path)
                        pdf_text = extract_pdf_text(tmp_path)
                        if pdf_text:
                            parts.append(
                                f"\n--- CONTENIDO DEL INFOPACK (PDF) ---\n{pdf_text}"
                            )
                            log.info(
                                "📄 PDF procesado: %d caracteres extraídos.",
                                len(pdf_text),
                            )
                    except Exception as exc:
                        log.warning("⚠️ Error al procesar PDF: %s", exc)
                    finally:
                        try:
                            os.unlink(tmp_path)
                        except OSError:
                            pass

            if parts:
                messages_texts.append("\n".join(parts))

    return messages_texts


# ---------------------------------------------------------------------------
# 6. Pipeline principal
# ---------------------------------------------------------------------------


def detect_mode(args: list[str]) -> str:
    """Determina el modo de extracción: 'telegram' o 'web'."""
    if "--web" in args:
        return "web"
    if "--telegram" in args:
        return "telegram"

    # Auto-detección: si hay sesión, usar Telegram; si no, web
    session_file = Path(__file__).resolve().parent / "euronova_session.session"
    if session_file.exists() and TELEGRAM_API_ID and TELEGRAM_API_HASH:
        return "telegram"

    return "web"


async def run_pipeline() -> None:
    """Ejecuta el pipeline completo de extracción, procesamiento e inserción."""
    mode = detect_mode(sys.argv)
    log.info("🚀 Iniciando pipeline de EuroNova (modo: %s)...", mode.upper())

    # --- Extracción de mensajes ---------------------------------------------
    if mode == "telegram":
        session_file = Path(__file__).resolve().parent / "euronova_session.session"
        if not session_file.exists():
            log.critical("❌ Sesión de Telegram no encontrada: %s", session_file)
            log.critical("   Ejecuta primero: python auth_telegram.py")
            log.info("💡 O usa modo web: python scraper.py --web")
            sys.exit(1)
        messages_texts = await fetch_messages_telegram()
    else:
        messages_texts = fetch_messages_web()

    if not messages_texts:
        log.warning("⚠️ No se obtuvieron mensajes. Finalizando.")
        return

    # --- Procesamiento con Gemini + Supabase --------------------------------
    processed_count = 0
    skipped_count = 0
    duplicate_count = 0

    for i, text in enumerate(messages_texts, start=1):
        source_id = f"Mensaje {i}/{len(messages_texts)}"
        log.info("🔍 Procesando %s...", source_id)

        status, count = process_text_with_gemini(text, source_id)
        if status == "inserted":
            processed_count += count
        elif status == "duplicate":
            duplicate_count += 1
        else:
            skipped_count += 1

    # --- Resumen -------------------------------------------------------------
    log.info("=" * 60)
    log.info("📊 Resumen del pipeline (%s):", mode.upper())
    log.info("   Mensajes analizados : %d", len(messages_texts))
    log.info("   Proyectos insertados: %d", processed_count)
    log.info("   Duplicados omitidos : %d", duplicate_count)
    log.info("   Mensajes omitidos   : %d", skipped_count)
    log.info("=" * 60)
    log.info("✅ Pipeline finalizado.")


# ---------------------------------------------------------------------------
# 7. Punto de entrada
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    try:
        asyncio.run(run_pipeline())
    except KeyboardInterrupt:
        log.info("🛑 Pipeline interrumpido por el usuario.")
        sys.exit(0)
    except Exception as exc:
        log.critical("💥 Error fatal: %s", exc, exc_info=True)
        sys.exit(1)
