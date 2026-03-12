from dotenv import load_dotenv
load_dotenv()
from hackathon2026_agent.tools.vertex_search import search_transit_code

print("--- Testing RAG ---")
result = search_transit_code(
    location_context="car parked in a bicycle lane",
    action_description="vehicle is stationary, blocking the bike lane completely",
    environmental_factors="clear day"
)
print(f"RESULT: {result}")
