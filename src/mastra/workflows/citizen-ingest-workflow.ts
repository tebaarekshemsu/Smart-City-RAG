import { createStep, createWorkflow } from '@mastra/core/workflows';
import { MDocument } from '@mastra/rag';
import { ModelRouterEmbeddingModel } from '@mastra/core/llm';
import { embedMany } from 'ai';
import { z } from 'zod';
import { readFile } from 'node:fs/promises';

const EMBEDDING_MODEL = 'openai/text-embedding-3-small';
const EMBEDDING_DIMENSION = 1536;
const DEFAULT_INDEX_NAME = 'citizen_services';

const ingestInputSchema = z.object({
  indexName: z.string().default(DEFAULT_INDEX_NAME),
  resetIndex: z.boolean().default(false),
});

type SeedEntry = {
  serviceId: string;
  language: 'en' | 'am';
  title: string;
  category: string;
  summary: string;
  eligibility: string;
  steps: string[];
  requiredDocs: string[];
  fees: string;
  channels: { online: string; inPerson: string };
  hours: string;
  contact: string;
  notes: string;
  updatedAt: string;
};

const loadSeedData = async (): Promise<SeedEntry[]> => {
  const seedUrl = new URL('../data/citizen-services.seed.json', import.meta.url);
  const raw = await readFile(seedUrl, 'utf-8');
  return JSON.parse(raw) as SeedEntry[];
};

const buildDocumentText = (entry: SeedEntry): string => {
  return [
    `Service: ${entry.title}`,
    `Category: ${entry.category}`,
    `Summary: ${entry.summary}`,
    `Eligibility: ${entry.eligibility}`,
    `Steps: ${entry.steps.join(' | ')}`,
    `Required documents: ${entry.requiredDocs.join(' | ')}`,
    `Fees: ${entry.fees}`,
    `Channels: Online ${entry.channels.online}; In-person ${entry.channels.inPerson}`,
    `Hours: ${entry.hours}`,
    `Contact: ${entry.contact}`,
    `Notes: ${entry.notes}`,
    `Last updated: ${entry.updatedAt}`,
  ].join('\n');
};

const ingestCitizenServices = createStep({
  id: 'ingest-citizen-services',
  description: 'Indexes seed smart city service content into MongoDB Atlas Vector Search.',
  inputSchema: ingestInputSchema,
  outputSchema: z.object({
    indexName: z.string(),
    indexed: z.number(),
  }),
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error('Input data not found.');
    }

    const vectorStore = mastra?.getVector('citizenServicesVector');
    if (!vectorStore) {
      throw new Error('Vector store citizenServicesVector not found.');
    }

    const indexName = inputData.indexName ?? DEFAULT_INDEX_NAME;
    const existingIndexes = await vectorStore.listIndexes();

    if (inputData.resetIndex && existingIndexes.includes(indexName)) {
      await vectorStore.deleteIndex({ indexName });
    }

    if (!existingIndexes.includes(indexName) || inputData.resetIndex) {
      await vectorStore.createIndex({
        indexName,
        dimension: EMBEDDING_DIMENSION,
      });
    }

    const seedEntries = await loadSeedData();
    const embeddingModel = new ModelRouterEmbeddingModel(EMBEDDING_MODEL);

    let indexedCount = 0;

    for (const entry of seedEntries) {
      const baseMetadata = {
        serviceId: entry.serviceId,
        language: entry.language,
        category: entry.category,
        title: entry.title,
        source: 'seed',
        city: 'Smart City',
        updatedAt: entry.updatedAt,
        docId: `${entry.serviceId}:${entry.language}`,
      };

      const doc = MDocument.fromText(buildDocumentText(entry), baseMetadata);
      const chunks = await doc.chunk({
        strategy: 'recursive',
        maxSize: 600,
        overlap: 80,
        separators: ['\n\n', '\n', ' '],
      });

      if (!chunks.length) {
        continue;
      }

      const { embeddings } = await embedMany({
        model: embeddingModel,
        values: chunks.map(chunk => chunk.text),
      });

      await vectorStore.upsert({
        indexName,
        vectors: embeddings,
        metadata: chunks.map((chunk, index) => ({
          ...baseMetadata,
          chunkIndex: index,
          text: chunk.text,
        })),
      });

      indexedCount += chunks.length;
    }

    return { indexName, indexed: indexedCount };
  },
});

const citizenIngestWorkflow = createWorkflow({
  id: 'citizen-ingest-workflow',
  inputSchema: ingestInputSchema,
  outputSchema: z.object({
    indexName: z.string(),
    indexed: z.number(),
  }),
})
  .then(ingestCitizenServices);

citizenIngestWorkflow.commit();

export { citizenIngestWorkflow };
