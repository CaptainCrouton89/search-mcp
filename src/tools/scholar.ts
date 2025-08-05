import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { z } from "zod";

export function registerScholarTools(server: McpServer) {
  server.tool(
    "google-scholar-search",
    "Search academic papers and citations using Google Scholar. Use this tool for finding current research on a topic.",
    {
      query: z
        .string()
        .describe(
          "Search query for academic papers. You can use helpers like 'author:' or 'source:'"
        ),
      yearStart: z
        .number()
        .optional()
        .describe("Start year for publication date range"),
      yearEnd: z
        .number()
        .optional()
        .describe("End year for publication date range"),
      numResults: z
        .number()
        .optional()
        .describe("Number of results to return (1-20, default 10)"),
      cites: z
        .string()
        .optional()
        .describe("Search for papers that cite this specific paper ID"),
    },
    async ({ query, yearStart, yearEnd, numResults = 10, cites }) => {
      const apiKey = process.env.SERP_API_KEY;

      if (!apiKey) {
        throw new Error("SERP_API_KEY not found in environment variables");
      }

      const params = new URLSearchParams({
        engine: "google_scholar",
        api_key: apiKey,
        num: Math.min(Math.max(numResults, 1), 20).toString(),
      });

      if (cites) {
        params.append("cites", cites);
      } else {
        params.append("q", query);
      }

      if (yearStart) params.append("as_ylo", yearStart.toString());
      if (yearEnd) params.append("as_yhi", yearEnd.toString());

      try {
        const response = await fetch(`https://serpapi.com/search?${params}`);

        if (!response.ok) {
          throw new Error(
            `SerpAPI error: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(`SerpAPI error: ${data.error}`);
        }

        let result = `# Google Scholar Search Results\n\nQuery: ${query}\n`;

        if (yearStart || yearEnd) {
          result += `Year range: ${yearStart || "any"} - ${yearEnd || "any"}\n`;
        }

        result += `\nFound ${
          data.search_information?.total_results || "unknown"
        } results\n\n`;

        if (data.organic_results && data.organic_results.length > 0) {
          data.organic_results.forEach((paper: any, index: number) => {
            result += `## ${index + 1}. ${paper.title}\n`;
            if (paper.link) result += `**Link:** ${paper.link}\n`;
            if (paper.snippet) result += `**Abstract:** ${paper.snippet}\n`;
            if (paper.publication_info?.summary) {
              result += `**Publication:** ${paper.publication_info.summary}\n`;
            }
            if (paper.inline_links?.cited_by?.total) {
              result += `**Cited by:** ${paper.inline_links.cited_by.total} papers\n`;
            }
            if (paper.inline_links?.versions?.total) {
              result += `**Versions:** ${paper.inline_links.versions.total}\n`;
            }
            result += "\n";
          });
        } else {
          result += "No results found.\n";
        }

        if (data.related_searches && data.related_searches.length > 0) {
          result += "\n## Related Searches\n";
          data.related_searches.forEach((search: any) => {
            result += `- ${search.query}\n`;
          });
        }

        // Save to /tmp directory
        try {
          const tmpDir = join(process.cwd(), "tmp");
          await mkdir(tmpDir, { recursive: true });

          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const filename = `scholar-${timestamp}.md`;
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
              text: `Error searching Google Scholar: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
