import logging
import json
from typing import Dict, Any
from ..config import config

logger = logging.getLogger(__name__)

def search_transit_code(search_query: str) -> str:
    """
    Simulates querying a Vertex AI Datastore (RAG) for the local transit code, civil code, and penal code 
    based on the provided concise search query.

    Args:
        search_query: A concise, keyword-focused search query translated to Spanish 
                      (e.g., 'vehículo estacionado vía ciclista', 'exceso velocidad lluvia').

    Returns:
        A JSON string containing relevant code excerpts or a message if none found.
    """
    try:
        from google.cloud import discoveryengine_v1 as discoveryengine
        from google.api_core.client_options import ClientOptions
    except ImportError:
        logger.error("google-cloud-discoveryengine is not installed.")
        return {"message": "Google Cloud Discovery Engine client is not installed. Please test the setup."}

    logger.info(f"RAG Search Query: {search_query}")
    
    project_id = config.GOOGLE_CLOUD_PROJECT
    data_store_id = config.VERTEX_DATASTORE_ID
    location = config.VERTEX_DATASTORE_LOCATION
    
    if data_store_id == "your-datastore-id" or not data_store_id:
        logger.warning("RAG Datastore ID is not configured.")
        return {"message": "Datastore ID is missing. The system admin needs to configure VERTEX_DATASTORE_ID."}

    # Set endpoint if not global
    kwargs = {}
    if location != "global":
        kwargs["client_options"] = ClientOptions(api_endpoint=f"{location}-discoveryengine.googleapis.com")

    client = discoveryengine.SearchServiceClient(**kwargs)

    serving_config = (
        f"projects/{project_id}/locations/{location}/collections/default_collection"
        f"/dataStores/{data_store_id}/servingConfigs/default_config"
    )

    content_search_spec = discoveryengine.SearchRequest.ContentSearchSpec(
        snippet_spec=discoveryengine.SearchRequest.ContentSearchSpec.SnippetSpec(
            return_snippet=True
        ),
        extractive_content_spec=discoveryengine.SearchRequest.ContentSearchSpec.ExtractiveContentSpec(
            max_extractive_segment_count=3,
        ),
    )

    request = discoveryengine.SearchRequest(
        serving_config=serving_config,
        query=search_query,
        page_size=5,
        content_search_spec=content_search_spec,
    )

    try:
        response = client.search(request)
        combined_text = ""
        for i, result in enumerate(response.results):
            document = result.document
            
            doc_data = document.derived_struct_data
            snippets = doc_data.get("snippets", [])
            extractive_answers = doc_data.get("extractive_answers", [])
            extractive_segments = doc_data.get("extractive_segments", [])
            
            text_extract = ""
            if extractive_answers:
                text_extract = extractive_answers[0].get("content", "")
            elif extractive_segments:
                text_extract = extractive_segments[0].get("content", "")
            elif snippets:
                text_extract = snippets[0].get("snippet", "")
            
            if text_extract:
                combined_text += f"-- Document {i+1} --\nSource: {document.name}\nContext:\n{text_extract}\n\n"
            
        if combined_text.strip():
            return json.dumps({
                "message": "Found relevant legal provisions.",
                "context": combined_text.strip()
            })
            
        return json.dumps({"message": "No relevant articles found for the given description in the code."})

    except Exception as e:
        logger.error(f"Search failed: {e}")
        return json.dumps({"message": f"Search failed with an exception: {e}"})
