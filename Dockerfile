# Stage 1: Build the React frontend
FROM node:22 AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the Python backend and serve
FROM python:3.13-slim
# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /app

# Copy dependency files and install
COPY pyproject.toml ./
RUN uv venv
RUN uv sync

# Add virtual environment to PATH
ENV PATH="/app/.venv/bin:$PATH"

# Copy the rest of the application code
COPY . .
# Copy the built frontend into the backend directory
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# Expose the port (Cloud Run expects 8080 by default)
EXPOSE 8080

# Start the uvicorn API
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8080"]
