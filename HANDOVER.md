# Project Handover — Smart City Citizen Assistant

## 1) What this project is

This project is a Retrieval-Augmented Generation (RAG) assistant for smart city digital services. It answers citizen questions in English and Amharic using a MongoDB Atlas Vector Search index that stores embeddings of curated service content.

Core goals:

- Provide accurate, grounded answers about city services (permits, utilities, transport, sanitation, digital ID).
- Support bilingual responses (English and Amharic).
- Use a controlled knowledge base rather than open-ended web search.

## 2) Current state (as of handover)

- **Weather-related code removed** (only citizen services remain).
- **RAG ingestion workflow exists** and builds the vector index from seed data.
- **Chat UI exists** in `public/` and connects to serverless chat endpoint on Vercel.
- **Vercel serverless chat endpoint** is implemented.
- **Mastra Studio** still runs locally for ingestion and testing.

Known constraints:

- Node.js must be `>= 22.13.0`.
- Embeddings use `openai/text-embedding-3-small` (OpenAI key required).
- Chat completions use OpenRouter (OpenRouter key required).

## 3) How it works (high-level flow)

1. Seed content lives in:
   - `src/mastra/data/citizen-services.seed.json`

2. Ingestion workflow:
   - File: `src/mastra/workflows/citizen-ingest-workflow.ts`
   - Splits each service into chunks.
   - Generates embeddings with OpenAI.
   - Writes vectors and metadata into MongoDB Atlas Vector Search.

3. Retrieval tool:
   - File: `src/mastra/tools/citizen-vector-tool.ts`
   - Queries MongoDB vector index `citizen_services`.

4. Agent:
   - File: `src/mastra/agents/citizen-assistant-agent.ts`
   - Uses the vector tool to answer questions and cite sources.

5. Server routes:
   - Local Mastra route: `/chat/:agentId`
   - Vercel serverless route: `/api/chat/[agentId]`

6. Frontend:
   - `public/index.html`, `public/styles.css`, `public/app.js`
   - Chat client tries `/api/chat/citizen-assistant-agent` then `/chat/citizen-assistant-agent`.

## 4) Key files and directories

- `src/mastra/index.ts`
  - Mastra configuration, vector store registration, chat route registration.
- `src/mastra/agents/citizen-assistant-agent.ts`
  - Agent logic and bilingual response policy.
- `src/mastra/tools/citizen-vector-tool.ts`
  - Vector query tool and embedding model configuration.
- `src/mastra/workflows/citizen-ingest-workflow.ts`
  - RAG ingestion pipeline.
- `src/mastra/data/citizen-services.seed.json`
  - Service knowledge base (English + Amharic entries).
- `api/chat/[agentId].ts`
  - Vercel serverless chat handler.
- `public/`
  - Frontend UI for chat.
- `DEPLOYMENT.md`
  - Detailed deployment guide (Vercel serverless).
- `.env.example`
  - Required environment variables template.

## 5) Required environment variables

Set these in local `.env` and in deployment:

- `OPENROUTER_API_KEY`
- `OPENAI_API_KEY`
- `MONGODB_URI`
- `MONGODB_DATABASE`

Template: `.env.example`.

## 6) Local development (step-by-step)

1. Install dependencies:
   - `npm install`

2. Add environment variables:
   - Copy `.env.example` to `.env` and fill values.

3. Start Mastra Studio:
   - `npm run dev`

4. Open Mastra Studio:
   - `http://localhost:4111`

5. Run ingestion workflow:
   - In Studio, select `citizen-ingest-workflow` and run.
   - Use `resetIndex: true` on first run.

6. Test chat UI:
   - Open `http://localhost:4111` (Mastra dev server).
   - The frontend should load and connect to `/chat/citizen-assistant-agent`.

## 7) Vercel deployment (summary)

A full guide is in `DEPLOYMENT.md`. The short version:

1. Import repo into Vercel.
2. Set Node runtime to `22.13.0` or higher.
3. Add env vars in Vercel Project Settings.
4. Deploy.
5. Run ingestion workflow locally (recommended) to populate MongoDB vector index.

Chat endpoint on Vercel:

- `https://<your-app>.vercel.app/api/chat/citizen-assistant-agent`

## 8) Operational notes

- **Index dimension** is fixed at 1536. If the embedding model changes or dimensions change, drop and recreate the index.
- **MongoDB Atlas Vector Search** must be enabled; ensure the cluster supports it.
- **Seed data** is small; expand `citizen-services.seed.json` to improve coverage.

Additional operational guidance:

- **Chat model** is set in `citizen-assistant-agent.ts`. Update the OpenRouter model string only after verifying availability.
- **Embedding model** is set in `citizen-ingest-workflow.ts`. If changed, recreate the vector index.
- **Index name** is `citizen_services`; changing it requires updating both ingestion workflow and vector tool.

## 9) Security and access

- **Secrets**: Never commit secrets to git. Use `.env` locally and Vercel Environment Variables in production.
- **API keys**: Rotate `OPENROUTER_API_KEY` and `OPENAI_API_KEY` on schedule (e.g., every 90 days).
- **MongoDB access**: Limit IP access when possible. Use least-privilege database users.
- **Vercel access**: Limit project access to authorized maintainers.

## 10) Data management and governance

- **Source of truth**: `citizen-services.seed.json` is the source of indexed content.
- **Updates**: After updating seed data, re-run the ingestion workflow.
- **Language consistency**: Ensure every English service has an Amharic entry (same `serviceId`).
- **Metadata hygiene**: Keep `serviceId`, `language`, `category`, and `title` consistent to support filtering later.

## 11) Monitoring and logging

- Mastra observability is enabled and logs to storage for Studio.
- For production monitoring, use Vercel logs for `/api/chat/*` requests.
- Consider adding structured logs around ingestion success and vector counts if needed.

## 12) Performance and cost controls

- **Embeddings cost**: Ingestion uses OpenAI embeddings; batch updates to minimize cost.
- **Chat cost**: OpenRouter model choice affects latency and cost. Smaller models reduce cost.
- **Serverless limits**: Vercel serverless has execution time limits; avoid running ingestion in serverless.

## 13) Testing checklist

- Run `citizen-ingest-workflow` and confirm vectors exist in MongoDB Atlas.
- Ask test queries in English and Amharic; verify sources are listed.
- Validate `/api/chat/citizen-assistant-agent` returns SSE and streams text.
- Confirm UI loads from `public/` on Vercel.

## 14) Troubleshooting (expanded)

- **Vector index missing**: Create or re-run ingestion with `resetIndex: true`.
- **Wrong database**: Check `MONGODB_DATABASE` matches the Atlas database used by the vector store.
- **Model errors**: Verify model names and API keys; recheck OpenRouter model availability.
- **CORS/endpoint mismatch**: Ensure frontend calls `/api/chat/<agentId>` in production.

## 15) Ownership and handoff notes

- Assign a primary owner for MongoDB Atlas credentials and billing.
- Assign a primary owner for OpenRouter/OpenAI keys and cost monitoring.
- Document who approves content changes in the seed data.

## 16) Common issues

- **Empty answers**: Run the ingestion workflow and ensure vectors exist.
- **MongoDB errors**: Check DB name, URI, and IP access list.
- **Chat endpoint fails**: Verify `OPENROUTER_API_KEY` and `OPENAI_API_KEY` are set.
- **Streaming issues**: Ensure the endpoint returns `text/event-stream` (handled by the serverless route).

## 17) Suggested next steps

- Add more services and update the seed data.
- Add metadata filters (e.g., city district, service category).
- Add a serverless endpoint to re-run ingestion on demand.
- Add authentication for the chat endpoint if needed.
