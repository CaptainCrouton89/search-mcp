#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from "dotenv";
import { z } from "zod";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

config({ path: ".env.local" });

const server = new McpServer({
  name: "research",
  version: "1.0.0",
});

server.tool(
  "ask-perplexity",
  "Perform deep web research on a given topic",
  {
    query: z
      .string()
      .describe(
        "The research question or query - be specific and contextual for best results (the year is 2025)"
      ),
    deepResearch: z.boolean().optional().describe("Enable deep research mode"),
  },
  async ({ query, deepResearch }) => {
    const apiKey = process.env.PERPLEXITY_API_KEY;

    if (!apiKey) {
      throw new Error("PERPLEXITY_API_KEY not found in environment variables");
    }

    const messages = [];

    const systemPrompt = deepResearch
      ? "You are an expert research assistant specializing in deep, comprehensive analysis for a senior developer with decades of experience. Dive deep into the topic with thorough investigation, exploring multiple angles, technical details, and implications. Provide extensive context, compare different approaches, and offer nuanced insights. Be exhaustive in your research while maintaining clarity and organization."
      : "You are a helpful AI assistant focused on providing precise, well-researched information for a senior developer with decades of experience. Provide comprehensive yet concise responses with relevant context and practical insights. Answers should be information-dense, concise, and include relevant links to the sources.";

    messages.push({
      role: "system",
      content: systemPrompt,
    });

    messages.push({
      role: "user",
      content: query,
    });

    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: deepResearch ? "sonar-pro" : "sonar",
        messages: messages,
      }),
    };

    try {
      const response = await fetch(
        "https://api.perplexity.ai/chat/completions",
        options
      );

      if (!response.ok) {
        throw new Error(
          `Perplexity API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      const content =
        data.choices?.[0]?.message?.content || "No response received";
      const citations = data.citations || [];

      let result = content;

      if (citations.length > 0) {
        result += "\n\n## Sources:\n";
        citations.forEach((citation: string, index: number) => {
          result += `${index + 1}. ${citation}\n`;
        });
      }

      // Save to /tmp directory
      try {
        const tmpDir = join(process.cwd(), "tmp");
        await mkdir(tmpDir, { recursive: true });
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `perplexity-${timestamp}.md`;
        const filepath = join(tmpDir, filename);
        
        await writeFile(filepath, result, "utf8");
      } catch (saveError) {
        console.error("Failed to save response to file:", saveError);
      }

      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error making request to Perplexity API: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  }
);

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
