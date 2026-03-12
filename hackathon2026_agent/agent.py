import json
import logging
from google.adk.agents import LiveRequest
from .traffic_inspector import traffic_inspector_agent
from .legal_analyst import legal_analyst_agent

logger = logging.getLogger(__name__)
from google.adk.agents import SequentialAgent
from google.adk.apps import App

traffic_analysis_workflow = SequentialAgent(
    name="traffic_analysis_workflow",
    description="A sequential workflow that analyzes visual traffic data and checks for code violations.",
    sub_agents=[traffic_inspector_agent, legal_analyst_agent]
)

app = App(name="hackathon2026_agent", root_agent=traffic_analysis_workflow)
