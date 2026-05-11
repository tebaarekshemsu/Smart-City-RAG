
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { DuckDBStore } from '@mastra/duckdb';
import { MongoDBVector } from '@mastra/mongodb';
import { chatRoute } from '@mastra/ai-sdk';
import { MastraCompositeStore } from '@mastra/core/storage';
import { Observability, DefaultExporter, CloudExporter, SensitiveDataFilter } from '@mastra/observability';
import { citizenIngestWorkflow } from './workflows/citizen-ingest-workflow';
import { citizenAssistantAgent } from './agents/citizen-assistant-agent';

export const mastra = new Mastra({
  workflows: { citizenIngestWorkflow },
  agents: { citizenAssistantAgent },
  server: {
    apiRoutes: [
      chatRoute({
        path: '/chat/:agentId',
      }),
    ],
  },
  vectors: {
    citizenServicesVector: new MongoDBVector({
      id: 'mongodb-citizen-services',
      uri: process.env.MONGODB_URI ?? '',
      dbName: process.env.MONGODB_DATABASE ?? '',
    }),
  },
  storage: new MastraCompositeStore({
    id: 'composite-storage',
    default: new LibSQLStore({
      id: "mastra-storage",
      url: "file:./mastra.db",
    }),
    domains: {
      observability: await new DuckDBStore().getStore('observability'),
    }
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [
          new DefaultExporter(), // Persists traces to storage for Mastra Studio
          new CloudExporter(), // Sends observability data to hosted Mastra Studio (if MASTRA_CLOUD_ACCESS_TOKEN is set)
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
      },
    },
  }),
});

// Note: `mastra` is the application entrypoint used by Mastra Studio.
// Small, non-functional comment added for clarity during contribution.
