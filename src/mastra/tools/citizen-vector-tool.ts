import { createVectorQueryTool } from '@mastra/rag';
import { ModelRouterEmbeddingModel } from '@mastra/core/llm';

export const citizenServicesQueryTool = createVectorQueryTool({
  id: 'citizen-services-search',
  description:
    'Search the smart city services knowledge base for permits, utilities, transport, waste collection, and digital ID information.',
  vectorStoreName: 'citizenServicesVector',
  indexName: 'citizen_services',
  model: new ModelRouterEmbeddingModel('openai/text-embedding-3-small'),
  enableFilter: true,
  includeSources: true,
});
