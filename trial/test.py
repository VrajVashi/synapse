import requests
import json

def fetch_user(user_id):
    user = db.query(user_id)
    return user.name          # ← Synapse should warn here (None handling)

def load_config():
    data = open("config.json").read()   # ← No try/except
    return json.loads(data)             # ← No try/except

async def get_data():
    result = fetch_user(1)

def broken_async():
    data = await get_data()   # ← await outside async def

items = [1, 2, 3]
print(items[5])               # ← Index without bounds check
