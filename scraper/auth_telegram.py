"""
EuroNova — Autenticación de Telegram (ejecutar solo una vez).

Crea el archivo de sesión de Telethon con opciones de código tradicional o QR.

Uso:
    python auth_telegram.py
"""

import os
import sys
import asyncio
from pathlib import Path

from dotenv import load_dotenv
from telethon import TelegramClient, errors

try:
    import qrcode
except ImportError:
    qrcode = None

# Cargar variables de entorno
_ENV_PATH = Path(__file__).resolve().parent.parent / "euronova" / ".env.local"
load_dotenv(_ENV_PATH)

API_ID = int(os.environ["TELEGRAM_API_ID"])
API_HASH = os.environ["TELEGRAM_API_HASH"]
SESSION_PATH = str(Path(__file__).resolve().parent / "euronova_session")


async def main() -> None:
    print("=" * 55)
    print("  EuroNova — Autenticación de Telegram")
    print("=" * 55)
    print()

    client = TelegramClient(SESSION_PATH, API_ID, API_HASH)
    await client.connect()

    # Si ya está autorizado, salir
    if await client.is_user_authorized():
        me = await client.get_me()
        print(f"✅ Ya estás autenticado como: {me.first_name} ({me.phone})")
        print(f"📁 Sesión: {SESSION_PATH}.session")
        await client.disconnect()
        return

    print("¿Cómo prefieres iniciar sesión?")
    print("1. Código QR (Recomendado, muy rápido y no falla)")
    print("2. Número de teléfono (Puede fallar si Telegram no envía SMS)")
    print()
    opcion = input("Elige una opción (1 o 2): ").strip()

    if opcion == "1":
        if not qrcode:
            print("❌ No se encontró la librería 'qrcode'. Ejecuta: pip install qrcode")
            await client.disconnect()
            sys.exit(1)
            
        print()
        print("Generando Código QR...")
        print("Instrucciones: Abre Telegram en tu móvil -> Ajustes -> Dispositivos -> Vincular un dispositivo")
        print()
        
        try:
            qr_login = await client.qr_login()
            
            # WORKAROUND: Bug en Telethon donde el QR inicial devuelve LoginTokenMigrateTo
            if type(qr_login._resp).__name__ == "LoginTokenMigrateTo":
                print(f"🔄 Redirigiendo al Data Center {qr_login._resp.dc_id}...")
                await client._switch_dc(qr_login._resp.dc_id)
                await qr_login.recreate()

            while True:
                qr = qrcode.QRCode(version=1, box_size=2, border=1)
                qr.add_data(qr_login.url)
                qr.make(fit=True)
                qr.print_ascii(invert=True)
                
                print("Escanea el QR de arriba para iniciar sesión.")
                print("El QR se actualizará automáticamente si caduca...")
                
                try:
                    user = await qr_login.wait()
                    if user:
                        # Si devuelve un usuario, inicio de sesión exitoso
                        break
                except errors.SessionPasswordNeededError:
                    print()
                    print("🔐 Tu cuenta tiene verificación en dos pasos (2FA).")
                    password = input("Introduce tu contraseña de 2FA: ").strip()
                    await client.sign_in(password=password)
                    break
                except asyncio.TimeoutError:
                    # Expiró el QR y necesita refrescar
                    print("🔄 Actualizando QR...")
                    await qr_login.recreate()
                    continue
                except Exception as e:
                    print(f"⚠️ Error inesperado, reintentando: {e}")
                    await asyncio.sleep(2)
                    await qr_login.recreate()
                    continue
                
        except Exception as e:
            print(f"❌ Error durante el inicio de sesión por QR: {e}")
            await client.disconnect()
            sys.exit(1)
            
    else:
        # Pedir teléfono
        print()
        print("Introduce tu número de teléfono con código de país.")
        print("Ejemplo: +34612345678")
        print()
        phone = input("Teléfono: ").strip()

        if not phone:
            print("❌ No se introdujo un número. Saliendo.")
            await client.disconnect()
            sys.exit(1)

        # Enviar solicitud de código
        try:
            sent_code = await client.send_code_request(phone)
            code_type = type(sent_code.type).__name__
            print()
            print(f"📨 Código enviado. Tipo de entrega: {code_type}")
            print()
            print("DÓNDE BUSCAR EL CÓDIGO:")
            print("  1. Abre Telegram en tu MÓVIL o ESCRITORIO.")
            print("  2. Busca el chat oficial 'Telegram' (con insignia azul).")
            print("  3. El código es un número de 5 dígitos.")
            print("  4. Si no lo ves, espera 30 segundos.")
            print()

        except errors.FloodWaitError as e:
            print(f"⏳ Telegram te ha bloqueado temporalmente.")
            print(f"   Espera {e.seconds} segundos ({e.seconds // 60} min) e intenta de nuevo.")
            await client.disconnect()
            sys.exit(1)
        except Exception as e:
            print(f"❌ Error al enviar código: {e}")
            await client.disconnect()
            sys.exit(1)

        # Bucle de intentos para introducir el código
        max_attempts = 3
        for attempt in range(1, max_attempts + 1):
            user_input = input(f"Código (intento {attempt}/{max_attempts}, o 'sms' para forzar SMS): ").strip()

            # Opción de reenviar por SMS
            if user_input.lower() == "sms":
                try:
                    print("📱 Reenviando código por SMS...")
                    await client.send_code_request(phone, force_sms=True)
                    print("✅ Código reenviado por SMS. Revisa tus mensajes de texto.")
                    print()
                    user_input = input("Código recibido por SMS: ").strip()
                except errors.FloodWaitError as e:
                    print(f"⏳ Rate limit: espera {e.seconds}s e intenta de nuevo.")
                    await client.disconnect()
                    sys.exit(1)
                except Exception as e:
                    print(f"⚠️ Error al reenviar: {e}")
                    continue

            if not user_input or not user_input.isdigit():
                print("⚠️ Código inválido. Debe ser numérico.")
                continue

            try:
                await client.sign_in(phone, user_input, phone_code_hash=sent_code.phone_code_hash)
                break  # Éxito
            except errors.PhoneCodeInvalidError:
                print("❌ Código incorrecto. Inténtalo de nuevo.")
            except errors.PhoneCodeExpiredError:
                print("❌ Código expirado. Ejecuta el script de nuevo.")
                await client.disconnect()
                sys.exit(1)
            except errors.SessionPasswordNeededError:
                # Tiene 2FA activado
                print()
                print("🔐 Tu cuenta tiene verificación en dos pasos (2FA).")
                password = input("Introduce tu contraseña de 2FA: ").strip()
                try:
                    await client.sign_in(password=password)
                    break
                except Exception as e:
                    print(f"❌ Contraseña incorrecta: {e}")
                    await client.disconnect()
                    sys.exit(1)
            except Exception as e:
                print(f"❌ Error inesperado: {e}")
        else:
            print("❌ Se agotaron los intentos. Ejecuta el script de nuevo.")
            await client.disconnect()
            sys.exit(1)

    # Verificar resultado
    if await client.is_user_authorized():
        me = await client.get_me()
        print()
        print("=" * 55)
        print(f"✅ Sesión creada para: {me.first_name} ({me.phone})")
        print(f"📁 Archivo: {SESSION_PATH}.session")
        print()
        print("Ya puedes ejecutar: python scraper.py")
        print("=" * 55)
    else:
        print("❌ No se pudo autorizar. Intenta de nuevo.")

    await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
