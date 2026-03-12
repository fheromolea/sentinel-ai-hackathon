import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    PORT = int(os.getenv("PORT", 8080))
    GOOGLE_CLOUD_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT", "your-project-id")
    DISABLE_CLOUD_LOGGING = os.getenv("DISABLE_CLOUD_LOGGING", "false").lower() == "true"
    VERTEX_DATASTORE_ID = os.getenv("VERTEX_DATASTORE_ID", "your-datastore-id")
    VERTEX_DATASTORE_LOCATION = os.getenv("VERTEX_DATASTORE_LOCATION", "global")

config = Config()
