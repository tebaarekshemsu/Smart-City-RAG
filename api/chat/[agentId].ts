import { Readable } from "node:stream";
import { handleChatStream } from "@mastra/ai-sdk";
import { mastra } from "../../src/mastra/index.js";

const readJson = async (req: any) => {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
  }
  return body ? JSON.parse(body) : {};
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const agentId = Array.isArray(req.query?.agentId)
    ? req.query.agentId[0]
    : req.query?.agentId;

  if (!agentId) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Missing agentId" }));
    return;
  }

  try {
    const params = await readJson(req);
    const stream = await handleChatStream({
      mastra,
      agentId,
      params,
    });

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    const nodeStream = Readable.fromWeb(stream as unknown as ReadableStream);
    nodeStream.pipe(res);
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Failed to stream chat" }));
  }
}
