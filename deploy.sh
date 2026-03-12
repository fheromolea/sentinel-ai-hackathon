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

# Deploy backend and frontend from source
gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars=DISABLE_CLOUD_LOGGING="false"

echo "✅ Deployment successful! Check the URL provided above."
echo "NOTE: Be sure to set your VERTEX_DATASTORE_ID in the Cloud Run Environment Variables if not set."
