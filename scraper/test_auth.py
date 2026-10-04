import asyncio
import os
from dotenv import load_dotenv
from telethon import TelegramClient

load_dotenv('../euronova/.env.local')

async def main():
    client = TelegramClient('euronova_session', int(os.environ['TELEGRAM_API_ID']), os.environ['TELEGRAM_API_HASH'])
    await client.connect()
    auth = await client.is_user_authorized()
    print("Auth:", auth)
    await client.disconnect()

asyncio.run(main())
