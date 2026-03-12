#!/bin/bash
set -e

echo "Starting deployment of Sentinel AI to Google Cloud Run..."

PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
    echo "ERROR: Please set your GCP project using: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

REGION="us-central1"
SERVICE_NAME="sentinel-ai-hackathon"

echo "Deploying to Project: $PROJECT_ID"
echo "Service Name: $SERVICE_NAME"
echo "Region: $REGION"

# Get the project number for the default compute service account
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "Granting AI Platform and Discovery Engine permissions to $SERVICE_ACCOUNT..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/aiplatform.user" > /dev/null

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/discoveryengine.viewer" > /dev/null

echo "Granting Storage and Artifact Registry permissions for Cloud Build..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/storage.admin" > /dev/null

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/artifactregistry.writer" > /dev/null

echo "Granting Logging Writer permissions to view Cloud Build Logs..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/logging.logWriter" > /dev/null

echo "Deploying backend and frontend from source..."
gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars=DISABLE_CLOUD_LOGGING="true",GOOGLE_GENAI_USE_VERTEXAI="true",GOOGLE_CLOUD_PROJECT="$PROJECT_ID",GOOGLE_CLOUD_LOCATION="us-central1",VERTEX_DATASTORE_ID="reglamentos_1773320513686",VERTEX_DATASTORE_LOCATION="global"

echo "✅ Deployment successful! Check the URL provided above."
echo "NOTE: Be sure to set your VERTEX_DATASTORE_ID in the Cloud Run Environment Variables if not set."
