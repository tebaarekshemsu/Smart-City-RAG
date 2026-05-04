# Smart City Citizen Assistant

This project is a Retrieval-Augmented Generation (RAG) assistant that helps citizens access smart city digital services through natural language chat. It supports English and Amharic, retrieves facts from a curated knowledge base, and returns grounded answers with sources.

## What it does

- Answers questions about permits, utilities, transport, sanitation, and digital ID.
- Uses a MongoDB Atlas Vector Search index to retrieve relevant service content.
- Streams answers through a chat API for the frontend UI.
- Includes an ingestion workflow to chunk, embed, and index content.

## Architecture overview

1. **Seed data** is stored in [src/mastra/data/citizen-services.seed.json](src/mastra/data/citizen-services.seed.json).
2. **Ingestion workflow** loads seed data, chunks it, generates embeddings, and upserts vectors to MongoDB Atlas.
3. **Vector query tool** searches the index and provides relevant context to the agent.
4. **Citizen assistant agent** answers in English or Amharic and cites sources.
5. **Chat UI** calls the serverless chat endpoint for real-time responses.

## Key components

- **Agent**: [src/mastra/agents/citizen-assistant-agent.ts](src/mastra/agents/citizen-assistant-agent.ts)
  - Bilingual responses, grounded answers, and source listing.
- **Vector query tool**: [src/mastra/tools/citizen-vector-tool.ts](src/mastra/tools/citizen-vector-tool.ts)
  - Uses `citizenServicesVector` and index `citizen_services`.
- **Ingestion workflow**: [src/mastra/workflows/citizen-ingest-workflow.ts](src/mastra/workflows/citizen-ingest-workflow.ts)
  - Uses `openai/text-embedding-3-small` and 1536-dimensional vectors.
- **Mastra configuration**: [src/mastra/index.ts](src/mastra/index.ts)
  - Registers agent, workflow, vector store, and chat route.
- **Frontend**: [public/index.html](public/index.html)
  - Simple chat UI that streams responses from `/api/chat/citizen-assistant-agent`.

## Prerequisites

- Node.js >= 22.13.0
- MongoDB Atlas cluster with Vector Search enabled
- OpenRouter API key for chat completions
- OpenAI API key for embeddings

## Environment variables

Set these in `.env` for local use and in your deployment environment:

```
OPENROUTER_API_KEY=your-openrouter-key
OPENAI_API_KEY=your-openai-key
MONGODB_URI=your-mongodb-atlas-connection-string
MONGODB_DATABASE=your-database-name
```

Template: [.env.example](.env.example)

## Local development

1. Install dependencies:

```bash
npm install
```

2. Start Mastra Studio:

```bash
npm run dev
```

3. Open `http://localhost:4111`.

4. Run the `citizen-ingest-workflow` in Mastra Studio to build the vector index.

5. Open the frontend UI (served from `public/`) and ask a question.

## Deployment

Serverless deployment on Vercel is supported. A step-by-step guide is in [DEPLOYMENT.md](DEPLOYMENT.md).

## Data expansion

To add more services or languages, edit [src/mastra/data/citizen-services.seed.json](src/mastra/data/citizen-services.seed.json) and re-run the ingestion workflow.
