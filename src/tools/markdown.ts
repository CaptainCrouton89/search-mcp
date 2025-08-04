import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";

function generatePageName(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/^www\./, "");
    const pathname = urlObj.pathname.replace(/\/$/, "").replace(/\//g, "-");
    const pageName = pathname ? `${hostname}${pathname}` : hostname;
    return pageName.replace(/[^a-zA-Z0-9-._]/g, "_");
  } catch {
    return url.replace(/[^a-zA-Z0-9-._]/g, "_");
  }
}

export function registerMarkdownTools(server: McpServer) {
  server.tool(
    "get-markdown",
    "Get markdown content from a URL. Use this tool for URLs containing documentation and code examples where precise information is needed.",
    {
      url: z.string().describe("The URL to scrape and convert to markdown"),
    },
    async ({ url }) => {
      try {
        const pureUrl = `https://pure.md/${url}`;
        const response = await fetch(pureUrl);

        if (!response.ok) {
          throw new Error(
            `Failed to fetch: ${response.status} ${response.statusText}`
          );
        }

        const markdown = await response.text();

        const pageName = generatePageName(url);
        const filePath = join(process.cwd(), "tmp", `${pageName}.md`);

        try {
          mkdirSync(dirname(filePath), { recursive: true });
          writeFileSync(filePath, markdown);
        } catch (error) {
          console.error(`Failed to save markdown to ${filePath}:`, error);
        }

        return {
          content: [
            {
              type: "text",
              text: `Saved to: ${filePath}\n\n${markdown}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error scraping URL: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}