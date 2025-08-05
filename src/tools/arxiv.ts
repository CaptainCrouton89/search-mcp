import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { mkdir, writeFile, readFile, readdir } from "fs/promises";
import { join } from "path";

// Interface for parsed arXiv entry
interface ArxivEntry {
  id: string;
  title: string;
  authors: string[];
  summary: string;
  published: string;
  updated: string;
  categories: string[];
  primaryCategory: string;
  links: {
    abstract: string;
    pdf: string;
    doi?: string;
  };
  comment?: string;
  journalRef?: string;
}

// Interface for arXiv API response
interface ArxivResponse {
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  entries: ArxivEntry[];
}

// XML parsing utility functions
function extractTextContent(xmlString: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = xmlString.match(regex);
  return match ? match[1].trim() : '';
}

function extractAllMatches(xmlString: string, tagName: string): string[] {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
  const matches = [];
  let match;
  while ((match = regex.exec(xmlString)) !== null) {
    matches.push(match[1].trim());
  }
  return matches;
}

function extractAttribute(xmlString: string, tagName: string, attributeName: string): string[] {
  const regex = new RegExp(`<${tagName}[^>]*${attributeName}="([^"]*)"[^>]*>`, 'gi');
  const matches = [];
  let match;
  while ((match = regex.exec(xmlString)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

function parseArxivXML(xmlString: string): ArxivResponse {
  // Extract feed metadata
  const totalResults = parseInt(extractTextContent(xmlString, 'opensearch:totalResults')) || 0;
  const startIndex = parseInt(extractTextContent(xmlString, 'opensearch:startIndex')) || 0;
  const itemsPerPage = parseInt(extractTextContent(xmlString, 'opensearch:itemsPerPage')) || 0;

  // Extract entries
  const entryBlocks = xmlString.match(/<entry[^>]*>[\s\S]*?<\/entry>/gi) || [];
  
  const entries: ArxivEntry[] = entryBlocks.map(entryXml => {
    // Extract basic fields
    const id = extractTextContent(entryXml, 'id').replace('http://arxiv.org/abs/', '');
    const title = extractTextContent(entryXml, 'title').replace(/\s+/g, ' ').trim();
    const summary = extractTextContent(entryXml, 'summary').replace(/\s+/g, ' ').trim();
    const published = extractTextContent(entryXml, 'published');
    const updated = extractTextContent(entryXml, 'updated');

    // Extract authors
    const authorBlocks = entryXml.match(/<author[^>]*>[\s\S]*?<\/author>/gi) || [];
    const authors = authorBlocks.map(authorXml => extractTextContent(authorXml, 'name'));

    // Extract categories
    const categories = extractAttribute(entryXml, 'category', 'term');
    const primaryCategory = extractAttribute(entryXml, 'arxiv:primary_category', 'term')[0] || categories[0] || '';

    // Extract links
    const linkBlocks = entryXml.match(/<link[^>]*\/>/gi) || [];
    let abstractLink = '';
    let pdfLink = '';
    let doiLink = '';

    linkBlocks.forEach(linkXml => {
      const href = linkXml.match(/href="([^"]*)"/)?.[1] || '';
      const rel = linkXml.match(/rel="([^"]*)"/)?.[1] || '';
      const title = linkXml.match(/title="([^"]*)"/)?.[1] || '';

      if (rel === 'alternate') {
        abstractLink = href;
      } else if (rel === 'related' && title === 'pdf') {
        pdfLink = href;
      } else if (rel === 'related' && title === 'doi') {
        doiLink = href;
      }
    });

    // Extract optional fields
    const comment = extractTextContent(entryXml, 'arxiv:comment');
    const journalRef = extractTextContent(entryXml, 'arxiv:journal_ref');

    return {
      id,
      title,
      authors,
      summary,
      published,
      updated,
      categories,
      primaryCategory,
      links: {
        abstract: abstractLink,
        pdf: pdfLink,
        ...(doiLink && { doi: doiLink })
      },
      ...(comment && { comment }),
      ...(journalRef && { journalRef })
    };
  });

  return {
    totalResults,
    startIndex,
    itemsPerPage,
    entries
  };
}

function formatArxivResults(response: ArxivResponse, query?: string, searchType?: string): string {
  let result = `# arXiv Search Results\n\n`;
  
  if (query) {
    result += `**Query:** ${query}\n`;
  }
  if (searchType) {
    result += `**Search Type:** ${searchType}\n`;
  }
  
  result += `**Total Results:** ${response.totalResults}\n`;
  result += `**Showing:** ${response.startIndex + 1}-${response.startIndex + response.itemsPerPage} of ${response.totalResults}\n\n`;

  if (response.entries.length === 0) {
    result += "No results found.\n";
    return result;
  }

  response.entries.forEach((entry, index) => {
    result += `## ${index + 1}. ${entry.title}\n\n`;
    result += `**arXiv ID:** ${entry.id}\n`;
    result += `**Authors:** ${entry.authors.join(', ')}\n`;
    result += `**Primary Category:** ${entry.primaryCategory}\n`;
    if (entry.categories.length > 1) {
      result += `**All Categories:** ${entry.categories.join(', ')}\n`;
    }
    result += `**Published:** ${new Date(entry.published).toLocaleDateString()}\n`;
    if (entry.updated !== entry.published) {
      result += `**Updated:** ${new Date(entry.updated).toLocaleDateString()}\n`;
    }
    
    result += `\n**Abstract:**\n${entry.summary}\n\n`;
    
    if (entry.comment) {
      result += `**Comment:** ${entry.comment}\n`;
    }
    if (entry.journalRef) {
      result += `**Journal Reference:** ${entry.journalRef}\n`;
    }
    
    result += `**Links:**\n`;
    result += `- [Abstract](${entry.links.abstract})\n`;
    result += `- [PDF](${entry.links.pdf})\n`;
    if (entry.links.doi) {
      result += `- [DOI](${entry.links.doi})\n`;
    }
    result += '\n---\n\n';
  });

  return result;
}

async function saveToTmpDirectory(content: string, filename: string): Promise<string> {
  try {
    const tmpDir = join(process.cwd(), "tmp");
    await mkdir(tmpDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fullFilename = `arxiv-${filename}-${timestamp}.md`;
    const filepath = join(tmpDir, fullFilename);

    await writeFile(filepath, content, "utf8");
    return filepath;
  } catch (error) {
    console.error("Failed to save response to file:", error);
    throw error;
  }
}

async function convertLatexToMarkdownWithPandoc(texFilePath: string, outputPath: string): Promise<void> {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Use pandoc to convert LaTeX to Markdown
    await execAsync(`pandoc "${texFilePath}" -f latex -t markdown -o "${outputPath}"`);
  } catch (error) {
    console.error("Failed to convert LaTeX to Markdown with pandoc:", error);
    throw error;
  }
}

async function findMainTexFile(extractDir: string): Promise<string | null> {
  try {
    const files = await readdir(extractDir);
    
    // Look for main.tex first
    if (files.includes('main.tex')) {
      return join(extractDir, 'main.tex');
    }
    
    // Look for any .tex file that might be the main file
    const texFiles = files.filter(f => f.endsWith('.tex'));
    if (texFiles.length > 0) {
      return join(extractDir, texFiles[0]);
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

async function downloadLatexSource(arxivId: string): Promise<{extractDir: string, markdownPath: string}> {
  try {
    const tmpDir = join(process.cwd(), "tmp");
    await mkdir(tmpDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const cleanId = arxivId.replace(/[\/.]/g, '-');
    const extractDir = join(tmpDir, `arxiv-${cleanId}-${timestamp}`);
    
    // Download the LaTeX source as tar.gz
    const sourceUrl = `https://arxiv.org/src/${arxivId}`;
    const response = await fetch(sourceUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download LaTeX source: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Save the tar.gz file temporarily
    const tarPath = join(tmpDir, `arxiv-${cleanId}-${timestamp}.tar.gz`);
    await writeFile(tarPath, buffer);
    
    // Create extraction directory and extract
    await mkdir(extractDir, { recursive: true });
    
    // Use node's child_process to run tar command
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    await execAsync(`tar -xzf "${tarPath}" -C "${extractDir}"`);
    
    // Clean up the tar.gz file
    const { unlink } = await import('fs/promises');
    await unlink(tarPath);
    
    // Find and convert main tex file to markdown
    const mainTexPath = await findMainTexFile(extractDir);
    let markdownPath = '';
    
    if (mainTexPath) {
      markdownPath = join(extractDir, 'paper.md');
      await convertLatexToMarkdownWithPandoc(mainTexPath, markdownPath);
    }
    
    return { extractDir, markdownPath };
  } catch (error) {
    console.error("Failed to download LaTeX source:", error);
    throw error;
  }
}

async function callArxivAPI(params: URLSearchParams): Promise<ArxivResponse> {
  const url = `http://export.arxiv.org/api/query?${params.toString()}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`arXiv API error: ${response.status} ${response.statusText}`);
    }

    const xmlData = await response.text();
    
    // Check for API errors in the response
    if (xmlData.includes('<title>Error</title>') || xmlData.includes('http://arxiv.org/api/errors')) {
      const errorMessage = extractTextContent(xmlData, 'summary') || 'Unknown error';
      throw new Error(`arXiv API error: ${errorMessage}`);
    }

    return parseArxivXML(xmlData);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to query arXiv API: ${error.message}`);
    }
    throw new Error('Failed to query arXiv API: Unknown error');
  }
}

function formatDateForSubmittedDate(dateStr: string): string {
  // Convert YYYY-MM-DD to YYYYMMDD0000 format for arXiv API
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD');
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}0000`;
}

export function registerArxivTools(server: McpServer) {
  server.tool(
    "arxiv-search",
    "Search arXiv preprints using the arXiv API with advanced query syntax",
    {
      query: z.string().describe("Search query (can use ti: for title, au: for author, cat: for category, abs: for abstract, all: for all fields, etc. Supports Boolean operators AND, OR, ANDNOT and parentheses for grouping)"),
      maxResults: z.number().optional().describe("Maximum number of results to return (default 10, max 2000)"),
      sortBy: z.enum(["relevance", "lastUpdatedDate", "submittedDate"]).optional().describe("Sort order (default: relevance)"),
      sortOrder: z.enum(["ascending", "descending"]).optional().describe("Sort direction (default: descending)"),
      start: z.number().optional().describe("Starting index for pagination (default 0)"),
    },
    async ({ query, maxResults = 10, sortBy = "relevance", sortOrder = "descending", start = 0 }) => {
      try {
        // Validate parameters
        if (maxResults > 2000) {
          throw new Error("maxResults cannot exceed 2000");
        }
        if (start < 0) {
          throw new Error("start must be >= 0");
        }

        const params = new URLSearchParams({
          search_query: query,
          start: start.toString(),
          max_results: Math.min(maxResults, 2000).toString(),
        });

        if (sortBy !== "relevance") {
          params.append("sortBy", sortBy);
          params.append("sortOrder", sortOrder);
        }

        const response = await callArxivAPI(params);
        const formattedResults = formatArxivResults(response, query, "General Search");
        const filepath = await saveToTmpDirectory(formattedResults, "search");

        return {
          content: [
            {
              type: "text",
              text: `Saved to: ${filepath}\n\n${formattedResults}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error searching arXiv: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "arxiv-get-paper",
    "Get detailed information about a specific arXiv paper by ID and download the LaTeX source",
    {
      arxivId: z.string().describe("arXiv paper ID (e.g., '1706.03762', 'cs.AI/0001001', or with version like '1706.03762v1')"),
      includeContent: z.boolean().optional().describe("Whether to include the paper's markdown content in the response (default: true)"),
    },
    async ({ arxivId, includeContent = true }) => {
      try {
        // Clean up the arxiv ID - remove any URL prefix if present
        const cleanId = arxivId.replace(/^(https?:\/\/)?arxiv\.org\/(abs\/)?/, '');

        const params = new URLSearchParams({
          id_list: cleanId,
        });

        const response = await callArxivAPI(params);
        
        if (response.entries.length === 0) {
          throw new Error(`No paper found with ID: ${cleanId}`);
        }

        const paper = response.entries[0];
        
        // Download and extract the LaTeX source
        const { extractDir, markdownPath } = await downloadLatexSource(cleanId);

        let resultText = `Successfully downloaded arXiv paper ${cleanId}\n\nLaTeX source extracted to: ${extractDir}`;
        
        if (markdownPath) {
          resultText += `\nMarkdown conversion saved to: ${markdownPath}`;
        }
        
        resultText += `\n\nPaper details:\n- Title: ${paper.title}\n- Authors: ${paper.authors.join(', ')}\n- Abstract: ${paper.summary}`;

        // Add links
        resultText += `\n\nLinks:\n- [Abstract](${paper.links.abstract})\n- [PDF](${paper.links.pdf})`;
        if (paper.links.doi) {
          resultText += `\n- [DOI](${paper.links.doi})`;
        }

        // Include paper content if requested and available
        if (includeContent && markdownPath) {
          try {
            let paperContent = await readFile(markdownPath, 'utf8');
            
            // Check if content is longer than 20,000 characters
            if (paperContent.length > 20000) {
              paperContent = paperContent.substring(0, 20000);
              resultText += `\n\n## Paper Content (Truncated)\n\n**Note: Content was truncated as it exceeded 20,000 characters. Full content is available in the saved markdown file.**\n\n${paperContent}`;
            } else {
              resultText += `\n\n## Paper Content\n\n${paperContent}`;
            }
          } catch (error) {
            resultText += `\n\n**Note: Could not read paper content from markdown file: ${error instanceof Error ? error.message : String(error)}**`;
          }
        }

        return {
          content: [
            {
              type: "text",
              text: resultText,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error retrieving arXiv paper: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "arxiv-search-by-author",
    "Search arXiv papers by author name",
    {
      authorName: z.string().describe("Author name to search for (e.g., 'John Smith' or 'Smith')"),
      maxResults: z.number().optional().describe("Maximum number of results to return (default 10, max 2000)"),
      sortBy: z.enum(["relevance", "lastUpdatedDate", "submittedDate"]).optional().describe("Sort order (default: lastUpdatedDate)"),
      sortOrder: z.enum(["ascending", "descending"]).optional().describe("Sort direction (default: descending)"),
    },
    async ({ authorName, maxResults = 10, sortBy = "lastUpdatedDate", sortOrder = "descending" }) => {
      try {
        // Validate parameters
        if (maxResults > 2000) {
          throw new Error("maxResults cannot exceed 2000");
        }

        // Format author name for search - replace spaces with underscores for better matching
        const formattedAuthor = authorName.toLowerCase().replace(/\s+/g, '_');
        const searchQuery = `au:${formattedAuthor}`;

        const params = new URLSearchParams({
          search_query: searchQuery,
          start: "0",
          max_results: Math.min(maxResults, 2000).toString(),
        });

        if (sortBy !== "relevance") {
          params.append("sortBy", sortBy);
          params.append("sortOrder", sortOrder);
        }

        const response = await callArxivAPI(params);
        const formattedResults = formatArxivResults(response, authorName, "Author Search");
        const filepath = await saveToTmpDirectory(formattedResults, `author-${authorName.replace(/\s+/g, '-').toLowerCase()}`);

        return {
          content: [
            {
              type: "text",
              text: `Saved to: ${filepath}\n\n${formattedResults}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error searching by author: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "arxiv-search-by-category",
    "Search arXiv papers by subject category with optional date filtering",
    {
      category: z.string().describe("arXiv category (e.g., 'cs.AI', 'math.CO', 'physics.gen-ph', 'hep-th', 'quant-ph')"),
      maxResults: z.number().optional().describe("Maximum number of results to return (default 10, max 2000)"),
      dateFrom: z.string().optional().describe("Start date in YYYY-MM-DD format for filtering by submission date"),
      dateTo: z.string().optional().describe("End date in YYYY-MM-DD format for filtering by submission date"),
      sortBy: z.enum(["relevance", "lastUpdatedDate", "submittedDate"]).optional().describe("Sort order (default: submittedDate)"),
      sortOrder: z.enum(["ascending", "descending"]).optional().describe("Sort direction (default: descending)"),
    },
    async ({ category, maxResults = 10, dateFrom, dateTo, sortBy = "submittedDate", sortOrder = "descending" }) => {
      try {
        // Validate parameters
        if (maxResults > 2000) {
          throw new Error("maxResults cannot exceed 2000");
        }

        let searchQuery = `cat:${category}`;

        // Add date filtering if provided
        if (dateFrom || dateTo) {
          let dateFilter = '';
          
          if (dateFrom && dateTo) {
            const fromFormatted = formatDateForSubmittedDate(dateFrom);
            const toFormatted = formatDateForSubmittedDate(dateTo);
            dateFilter = `submittedDate:[${fromFormatted}+TO+${toFormatted}]`;
          } else if (dateFrom) {
            const fromFormatted = formatDateForSubmittedDate(dateFrom);
            dateFilter = `submittedDate:[${fromFormatted}+TO+*]`;
          } else if (dateTo) {
            const toFormatted = formatDateForSubmittedDate(dateTo);
            dateFilter = `submittedDate:[*+TO+${toFormatted}]`;
          }

          if (dateFilter) {
            searchQuery += `+AND+${dateFilter}`;
          }
        }

        const params = new URLSearchParams({
          search_query: searchQuery,
          start: "0",
          max_results: Math.min(maxResults, 2000).toString(),
        });

        if (sortBy !== "relevance") {
          params.append("sortBy", sortBy);
          params.append("sortOrder", sortOrder);
        }

        const response = await callArxivAPI(params);
        
        let searchDescription = `Category: ${category}`;
        if (dateFrom || dateTo) {
          searchDescription += ` | Date range: ${dateFrom || 'any'} to ${dateTo || 'any'}`;
        }

        const formattedResults = formatArxivResults(response, searchDescription, "Category Search");
        const filepath = await saveToTmpDirectory(formattedResults, `category-${category.replace(/[\/\.]/g, '-')}`);

        return {
          content: [
            {
              type: "text",
              text: `Saved to: ${filepath}\n\n${formattedResults}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error searching by category: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
}