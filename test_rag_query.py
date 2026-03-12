from dotenv import load_dotenv
load_dotenv()
from hackathon2026_agent.tools.vertex_search import search_transit_code

print("--- Testing Exact Workflow Query ---")
result = search_transit_code(
    location_context='Stopped within a green-painted bicycle lane.',
    action_description='The vehicle is stationary inside a designated bicycle lane, while other vehicles in adjacent lanes are in motion.',
    environmental_factors='Daylight, overcast conditions. Road surface is wet asphalt. Moderate traffic flow in adjacent lanes.'
)
print(f"RESULT: {result}")
