import asyncio
from dotenv import load_dotenv
load_dotenv()
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from hackathon2026_agent.agent import app

async def run_workflow():
    print("--- Starting Analysis for mock_traffic_video.mp4 ---")
    
    import uuid
    session_id = f"test_session_{uuid.uuid4().hex}"
    session_service = InMemorySessionService()
    await session_service.create_session(
        session_id=session_id, 
        app_name="hackathon2026_agent", 
        user_id="test_user"
    )
    
    runner = Runner(app=app, session_service=session_service)
    
    from google.genai import types
    unique_request_id = uuid.uuid4().hex
    prompt_text = f"Video filepath: mock_traffic_video.mp4\nRequest ID: {unique_request_id}\nPlease explicitly analyze this specific video. Ignore previous conversations or videos. Focus only on the facts of this new video."
    content = types.Content(role="user", parts=[types.Part.from_text(text=prompt_text)])
    
    events = runner.run_async(
        user_id="test_user",
        session_id=session_id,
        new_message=content
    )
    
    async for event in events:
        try:
            # We know event is an Event class. The property `message` or `content` 
            # might have the text. Let's look for standard GenAI `Content` objects.
            
            # Print Action based events
            if hasattr(event, "actions") and event.actions:
                if hasattr(event.actions, "requested_tool_confirmations"):
                    for tool_name, auth in event.actions.requested_tool_confirmations.items():
                        print(f"\n[Agent wants to call Tool]: {tool_name}")
                        
            # Print Text based events
            msg = getattr(event, "message", None) or getattr(event, "content", None)
            
            if msg and hasattr(msg, "parts"):
                for part in msg.parts:
                    if hasattr(part, "text") and part.text:
                        print(f"\n[Agent]:\n{part.text}")
                    elif hasattr(part, "function_call") and part.function_call:
                        print(f"\n[Tool Called]: {part.function_call.name}")
                        if part.function_call.args:
                            print(f"Args: {dict(part.function_call.args)}")
                    elif hasattr(part, "function_response") and part.function_response:
                        pass # Ignore underlying tool returns to keep console clean

        except Exception as e:
            print(f"[Error parsing event]: {e}")
            
    print("\n\n--- Analysis Complete ---")
    
if __name__ == "__main__":
    asyncio.run(run_workflow())
