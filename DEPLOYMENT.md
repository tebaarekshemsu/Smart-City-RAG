# Smart City Citizen Assistant

## Project overview

This project is a Retrieval-Augmented Generation (RAG) assistant for smart city digital services. It uses Mastra to orchestrate agents, workflows, storage, and vector search. The assistant answers questions about permits, utilities, transport, sanitation, and digital ID using a MongoDB Atlas Vector Search index built from curated seed content.

### Key components

- **Agent**: `citizen-assistant-agent`
  - Responds in English or Amharic.
  - Uses a vector query tool to retrieve relevant service content.
  - Uses OpenRouter for chat completions.

- **RAG ingestion workflow**: `citizen-ingest-workflow`
  - Loads seed data from `src/mastra/data/citizen-services.seed.json`.
  - Chunks text using recursive strategy.
  - Generates embeddings using OpenAI `text-embedding-3-small`.
  - Upserts vectors to MongoDB Atlas Vector Search.

- **Vector store**: MongoDB Atlas Vector Search
  - Vector index name: `citizen_services`
  - Embedding dimension: `1536`

- **Chat API**
  - Local Mastra server route: `/chat/:agentId`
  - Vercel serverless route: `/api/chat/[agentId]`

- **Frontend**
  - Static UI served from `public/` on Vercel.
  - Chat client tries `/api/chat/citizen-assistant-agent` first, then falls back to `/chat/citizen-assistant-agent` for local dev.

## Environment variables

Set these variables in your local `.env` file and in Vercel Project Settings:

- `OPENROUTER_API_KEY`
- `OPENAI_API_KEY`
- `MONGODB_URI`
- `MONGODB_DATABASE`

Example template is in `.env.example`.

## Deployment (Vercel serverless)

### 1) Prerequisites

- Node.js version `>= 22.13.0` (Vercel runtime is set to `nodejs22.x`).
- A MongoDB Atlas cluster with Vector Search enabled.
- OpenRouter account for chat completions.
- OpenAI account for embeddings.

### 2) Configure MongoDB Atlas

1. Create a MongoDB Atlas cluster.
2. Enable Vector Search on the cluster.
3. Create a database name you will use for `MONGODB_DATABASE`.
4. Ensure your IP access list allows Vercel (use `0.0.0.0/0` for testing, restrict later).
5. Create a user and note the username and password.

### 3) Prepare environment variables in Vercel

In Vercel Project Settings > Environment Variables, add:

- `OPENROUTER_API_KEY` = your OpenRouter key
- `OPENAI_API_KEY` = your OpenAI key
- `MONGODB_URI` = `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?appName=<app>`
- `MONGODB_DATABASE` = your database name

### 4) Connect repo to Vercel

1. Push your project to GitHub/GitLab/Bitbucket.
2. In Vercel, create a new project and import the repository.
3. Set Framework Preset to `Other`.
4. Confirm Node.js version `22.13.0` (or higher).
5. Build Command: `npm run build` (optional for static + serverless; safe to keep).
6. Output Directory: leave empty (Vercel serves `public/`).

### 5) Deploy

1. Click **Deploy**.
2. After deployment, your site will be available at your Vercel URL.
3. The chat endpoint will be:
   - `https://<your-app>.vercel.app/api/chat/citizen-assistant-agent`

### 6) Index the knowledge base

The vector index must be populated before the assistant can answer correctly.

**Recommended approach (local ingestion):**

1. Run locally:
   - `npm run dev`
2. Open Mastra Studio at `http://localhost:4111`.
3. Trigger the `citizen-ingest-workflow` and confirm vectors are created.
4. Confirm the MongoDB Atlas collection `citizen_services` contains vectors.

**Why local ingestion?**

- It avoids serverless timeouts.
- You can re-run or reset the index safely during development.

### 7) Verify production

1. Open the deployed UI.
2. Ask a question such as: “How do I register for a city digital ID?”
3. Confirm the response includes sources and steps.

## Local development

1. Set environment variables in `.env`.
2. Install dependencies:
   - `npm install`
3. Start Mastra Studio:
   - `npm run dev`
4. Visit `http://localhost:4111`.

## Project structure

- `src/mastra/index.ts` — Mastra configuration, server routes, vector store.
- `src/mastra/agents/citizen-assistant-agent.ts` — Citizen assistance agent.
- `src/mastra/tools/citizen-vector-tool.ts` — Vector query tool.
- `src/mastra/workflows/citizen-ingest-workflow.ts` — RAG ingestion workflow.
- `src/mastra/data/citizen-services.seed.json` — Seed content.
- `public/` — Frontend assets for Vercel.
- `api/chat/[agentId].ts` — Vercel serverless chat endpoint.

## Operational notes

- **Embedding dimension** is fixed at 1536. If you change the embedding model or dimensions, delete and recreate the vector index.
- **RAG quality** depends on seed data. Expand `citizen-services.seed.json` for broader coverage.
- **Security**: never store secrets in the repo. Use environment variables only.

## Troubleshooting

- **Chat endpoint returns 500**: Verify env vars in Vercel and check server logs.
- **Empty or irrelevant answers**: Confirm the vector index is populated and the seed data is correct.
- **MongoDB errors**: Check database name and user permissions.
- **Streaming issues**: Ensure the endpoint is `text/event-stream` and the client is using SSE-compatible parsing.
