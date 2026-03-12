import asyncio
from google.genai import Client
from google.genai import types

async def main():
    client = Client()
    print("Uploading file...")
    uploaded_file = client.files.upload(file='mock_traffic_video.mp4')
    print(f"Uploaded: {uploaded_file.name}, URI: {uploaded_file.uri}")

asyncio.run(main())
