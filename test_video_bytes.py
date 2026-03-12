import asyncio
from google.genai import Client, types
import os

client = Client()

with open("mock_traffic_video.mp4", "rb") as f:
    video_bytes = f.read()

part1 = types.Part.from_bytes(data=video_bytes, mime_type="video/mp4")
part2 = types.Part.from_text(text="What is in this video?")

response = client.models.generate_content(
    model='gemini-2.5-pro',
    contents=[types.Content(role="user", parts=[part1, part2])]
)
print(response.text)
