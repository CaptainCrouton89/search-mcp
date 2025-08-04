#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from "dotenv";
import { registerPerplexityTools } from "./tools/perplexity.js";
import { registerScholarTools } from "./tools/scholar.js";
import { registerMarkdownTools } from "./tools/markdown.js";
import { registerGitHubTools } from "./tools/github.js";
import { registerArxivTools } from "./tools/arxiv.js";
import { registerOpenAlexTools } from "./tools/openalex.js";

config({ path: ".env.local" });

const server = new McpServer({
  name: "research",
  version: "1.0.0",
});

// Register all tools
registerPerplexityTools(server);
registerScholarTools(server);
registerMarkdownTools(server);
registerGitHubTools(server);
registerArxivTools(server);
registerOpenAlexTools(server);

async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Perplexity Research Server running...");
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

main().catch(console.error);
