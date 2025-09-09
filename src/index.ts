#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";
import { registerPerplexityTools } from "./tools/perplexity.js";
import { registerScholarTools } from "./tools/scholar.js";
import { registerMarkdownTools } from "./tools/markdown.js";
import { registerGitHubTools } from "./tools/github.js";
import { registerArxivTools } from "./tools/arxiv.js";
import { registerOpenAlexTools } from "./tools/openalex.js";
import { registerResearchStrategyTools } from "./tools/research-strategy.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const server = new McpServer({
  name: "research",
  version: "1.0.0",
});

// Parse ENABLED_TOOLS from environment
const enabledToolsEnv = process.env.ENABLED_TOOLS?.trim();
const enabledTools = enabledToolsEnv
  ? enabledToolsEnv
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
  : undefined;

// Tool registration map
const toolRegistrations = {
  perplexity: registerPerplexityTools,
  scholar: registerScholarTools,
  markdown: registerMarkdownTools,
  github: registerGitHubTools,
  arxiv: registerArxivTools,
  openalex: registerOpenAlexTools,
  "research-strategy": registerResearchStrategyTools,
};

// Register tools based on configuration
if (enabledTools && enabledTools.length > 0) {
  // Only register specified tools
  for (const toolName of enabledTools) {
    const registerFn = toolRegistrations[toolName as keyof typeof toolRegistrations];
    if (registerFn) {
      registerFn(server);
      console.error(`Registered ${toolName} tools`);
    } else {
      console.error(`Warning: Unknown tool "${toolName}" in ENABLED_TOOLS`);
    }
  }
} else {
  // Register all tools if no specific tools are configured
  for (const [toolName, registerFn] of Object.entries(toolRegistrations)) {
    registerFn(server);
  }
  console.error(`Registered all tools: ${Object.keys(toolRegistrations).join(", ")}`);
}

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
