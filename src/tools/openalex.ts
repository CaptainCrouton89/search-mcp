import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

const OPENALEX_BASE_URL = "https://api.openalex.org";

// Helper function to make API requests with error handling
async function makeOpenAlexRequest(endpoint: string, params: Record<string, any>): Promise<any> {
  const url = new URL(endpoint, OPENALEX_BASE_URL);
  
  // Add parameters to URL
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });

  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`OpenAlex API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch from OpenAlex API: ${error.message}`);
    }
    throw new Error('Unknown error occurred while fetching from OpenAlex API');
  }
}

// Helper function to save results to /tmp directory
async function saveResultsToFile(data: any, filename: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filepath = path.join('/tmp', `openalex-${filename}-${timestamp}.json`);
  
  try {
    await fs.writeFile(filepath, JSON.stringify(data, null, 2));
    return filepath;
  } catch (error) {
    console.error('Failed to save results to file:', error);
    return '';
  }
}

// Helper function to format results as markdown
function formatWorksAsMarkdown(data: any): string {
  if (!data.results || data.results.length === 0) {
    return '# OpenAlex Works Search Results\n\nNo results found.';
  }

  let markdown = `# OpenAlex Works Search Results\n\n`;
  markdown += `**Total Results:** ${data.meta?.count || 'Unknown'}\n`;
  markdown += `**Page:** ${data.meta?.page || 1} (${data.results.length} results shown)\n\n`;

  data.results.forEach((work: any, index: number) => {
    markdown += `## ${index + 1}. ${work.title || 'Untitled'}\n\n`;
    markdown += `- **OpenAlex ID:** ${work.id}\n`;
    if (work.doi) markdown += `- **DOI:** ${work.doi}\n`;
    markdown += `- **Publication Year:** ${work.publication_year || 'Unknown'}\n`;
    markdown += `- **Type:** ${work.type || 'Unknown'}\n`;
    markdown += `- **Citations:** ${work.cited_by_count || 0}\n`;
    
    if (work.authorships && work.authorships.length > 0) {
      markdown += `- **Authors:** ${work.authorships.map((a: any) => a.author?.display_name || 'Unknown').join(', ')}\n`;
    }
    
    if (work.primary_location?.source) {
      markdown += `- **Source:** ${work.primary_location.source.display_name}\n`;
    }
    
    if (work.concepts && work.concepts.length > 0) {
      const topConcepts = work.concepts.slice(0, 3).map((c: any) => `${c.display_name} (${(c.score * 100).toFixed(1)}%)`).join(', ');
      markdown += `- **Top Concepts:** ${topConcepts}\n`;
    }
    
    if (work.abstract_inverted_index) {
      markdown += `- **Has Abstract:** Yes\n`;
    }
    
    markdown += `\n`;
  });

  return markdown;
}

function formatAuthorsAsMarkdown(data: any): string {
  if (!data.results || data.results.length === 0) {
    return '# OpenAlex Authors Search Results\n\nNo results found.';
  }

  let markdown = `# OpenAlex Authors Search Results\n\n`;
  markdown += `**Total Results:** ${data.meta?.count || 'Unknown'}\n`;
  markdown += `**Page:** ${data.meta?.page || 1} (${data.results.length} results shown)\n\n`;

  data.results.forEach((author: any, index: number) => {
    markdown += `## ${index + 1}. ${author.display_name || 'Unknown Author'}\n\n`;
    markdown += `- **OpenAlex ID:** ${author.id}\n`;
    if (author.orcid) markdown += `- **ORCID:** ${author.orcid}\n`;
    markdown += `- **Works Count:** ${author.works_count || 0}\n`;
    markdown += `- **Cited By Count:** ${author.cited_by_count || 0}\n`;
    if (author.summary_stats?.h_index) markdown += `- **H-Index:** ${author.summary_stats.h_index}\n`;
    if (author.summary_stats?.i10_index) markdown += `- **i10-Index:** ${author.summary_stats.i10_index}\n`;
    
    if (author.last_known_institutions && author.last_known_institutions.length > 0) {
      const institutions = author.last_known_institutions.map((inst: any) => inst.display_name).join(', ');
      markdown += `- **Last Known Institutions:** ${institutions}\n`;
    }
    
    if (author.concepts && author.concepts.length > 0) {
      const topConcepts = author.concepts.slice(0, 3).map((c: any) => `${c.display_name} (${(c.score * 100).toFixed(1)}%)`).join(', ');
      markdown += `- **Top Research Areas:** ${topConcepts}\n`;
    }
    
    markdown += `\n`;
  });

  return markdown;
}

function formatInstitutionsAsMarkdown(data: any): string {
  if (!data.results || data.results.length === 0) {
    return '# OpenAlex Institutions Search Results\n\nNo results found.';
  }

  let markdown = `# OpenAlex Institutions Search Results\n\n`;
  markdown += `**Total Results:** ${data.meta?.count || 'Unknown'}\n`;
  markdown += `**Page:** ${data.meta?.page || 1} (${data.results.length} results shown)\n\n`;

  data.results.forEach((institution: any, index: number) => {
    markdown += `## ${index + 1}. ${institution.display_name || 'Unknown Institution'}\n\n`;
    markdown += `- **OpenAlex ID:** ${institution.id}\n`;
    if (institution.ror) markdown += `- **ROR ID:** ${institution.ror}\n`;
    if (institution.country_code) markdown += `- **Country:** ${institution.country_code}\n`;
    markdown += `- **Type:** ${institution.type || 'Unknown'}\n`;
    markdown += `- **Works Count:** ${institution.works_count || 0}\n`;
    markdown += `- **Cited By Count:** ${institution.cited_by_count || 0}\n`;
    if (institution.homepage_url) markdown += `- **Homepage:** ${institution.homepage_url}\n`;
    
    if (institution.geo && (institution.geo.city || institution.geo.region)) {
      markdown += `- **Location:** ${[institution.geo.city, institution.geo.region, institution.geo.country].filter(Boolean).join(', ')}\n`;
    }
    
    if (institution.concepts && institution.concepts.length > 0) {
      const topConcepts = institution.concepts.slice(0, 3).map((c: any) => `${c.display_name} (${(c.score * 100).toFixed(1)}%)`).join(', ');
      markdown += `- **Top Research Areas:** ${topConcepts}\n`;
    }
    
    markdown += `\n`;
  });

  return markdown;
}

function formatConceptsAsMarkdown(data: any): string {
  if (!data.results || data.results.length === 0) {
    return '# OpenAlex Concepts Search Results\n\nNo results found.';
  }

  let markdown = `# OpenAlex Concepts Search Results\n\n`;
  markdown += `**Total Results:** ${data.meta?.count || 'Unknown'}\n`;
  markdown += `**Page:** ${data.meta?.page || 1} (${data.results.length} results shown)\n\n`;

  data.results.forEach((concept: any, index: number) => {
    markdown += `## ${index + 1}. ${concept.display_name || 'Unknown Concept'}\n\n`;
    markdown += `- **OpenAlex ID:** ${concept.id}\n`;
    markdown += `- **Level:** ${concept.level || 'Unknown'}\n`;
    markdown += `- **Works Count:** ${concept.works_count || 0}\n`;
    markdown += `- **Cited By Count:** ${concept.cited_by_count || 0}\n`;
    if (concept.description) markdown += `- **Description:** ${concept.description}\n`;
    
    if (concept.ancestors && concept.ancestors.length > 0) {
      const ancestors = concept.ancestors.map((a: any) => a.display_name).join(' > ');
      markdown += `- **Hierarchy:** ${ancestors} > ${concept.display_name}\n`;
    }
    
    if (concept.related_concepts && concept.related_concepts.length > 0) {
      const related = concept.related_concepts.slice(0, 3).map((c: any) => c.display_name).join(', ');
      markdown += `- **Related Concepts:** ${related}\n`;
    }
    
    markdown += `\n`;
  });

  return markdown;
}

export function registerOpenAlexTools(server: McpServer) {
  server.tool(
    "openalex-search-works",
    "Search academic works (papers, articles) using OpenAlex API",
    {
      query: z.string().describe("Search query for academic works"),
      filter: z.string().optional().describe("Additional filters (e.g., 'publication_year:2023')"),
      limit: z.number().optional().describe("Number of results to return (default 10, max 200)"),
      sort: z.string().optional().describe("Sort order (e.g., 'cited_by_count:desc', 'publication_date:desc')"),
    },
    async ({ query, filter, limit = 10, sort }) => {
      try {
        const params: Record<string, any> = {
          search: query,
          per_page: Math.min(limit, 200), // OpenAlex max is 200
        };
        
        if (filter) {
          params.filter = filter;
        }
        
        if (sort) {
          params.sort = sort;
        }
        
        const data = await makeOpenAlexRequest('/works', params);
        const markdown = formatWorksAsMarkdown(data);
        const savedFile = await saveResultsToFile(data, 'works-search');
        
        let resultText = markdown;
        if (savedFile) {
          resultText += `\n\n---\n*Full results saved to: ${savedFile}*`;
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
              text: `Error searching OpenAlex works: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "openalex-search-authors",
    "Search authors using OpenAlex API",
    {
      query: z.string().describe("Search query for authors"),
      filter: z.string().optional().describe("Additional filters"),
      limit: z.number().optional().describe("Number of results to return (default 10, max 200)"),
    },
    async ({ query, filter, limit = 10 }) => {
      try {
        const params: Record<string, any> = {
          search: query,
          per_page: Math.min(limit, 200),
        };
        
        if (filter) {
          params.filter = filter;
        }
        
        const data = await makeOpenAlexRequest('/authors', params);
        const markdown = formatAuthorsAsMarkdown(data);
        const savedFile = await saveResultsToFile(data, 'authors-search');
        
        let resultText = markdown;
        if (savedFile) {
          resultText += `\n\n---\n*Full results saved to: ${savedFile}*`;
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
              text: `Error searching OpenAlex authors: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "openalex-search-institutions",
    "Search institutions using OpenAlex API",
    {
      query: z.string().describe("Search query for institutions"),
      filter: z.string().optional().describe("Additional filters"),
      limit: z.number().optional().describe("Number of results to return (default 10, max 200)"),
    },
    async ({ query, filter, limit = 10 }) => {
      try {
        const params: Record<string, any> = {
          search: query,
          per_page: Math.min(limit, 200),
        };
        
        if (filter) {
          params.filter = filter;
        }
        
        const data = await makeOpenAlexRequest('/institutions', params);
        const markdown = formatInstitutionsAsMarkdown(data);
        const savedFile = await saveResultsToFile(data, 'institutions-search');
        
        let resultText = markdown;
        if (savedFile) {
          resultText += `\n\n---\n*Full results saved to: ${savedFile}*`;
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
              text: `Error searching OpenAlex institutions: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "openalex-search-concepts",
    "Search concepts/topics using OpenAlex API",
    {
      query: z.string().describe("Search query for concepts"),
      filter: z.string().optional().describe("Additional filters"),
      limit: z.number().optional().describe("Number of results to return (default 10, max 200)"),
    },
    async ({ query, filter, limit = 10 }) => {
      try {
        const params: Record<string, any> = {
          search: query,
          per_page: Math.min(limit, 200),
        };
        
        if (filter) {
          params.filter = filter;
        }
        
        const data = await makeOpenAlexRequest('/concepts', params);
        const markdown = formatConceptsAsMarkdown(data);
        const savedFile = await saveResultsToFile(data, 'concepts-search');
        
        let resultText = markdown;
        if (savedFile) {
          resultText += `\n\n---\n*Full results saved to: ${savedFile}*`;
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
              text: `Error searching OpenAlex concepts: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Additional tools for other entity types
  server.tool(
    "openalex-search-sources",
    "Search sources (journals, conferences) using OpenAlex API",
    {
      query: z.string().describe("Search query for sources"),
      filter: z.string().optional().describe("Additional filters (e.g., 'type:journal')"),
      limit: z.number().optional().describe("Number of results to return (default 10, max 200)"),
    },
    async ({ query, filter, limit = 10 }) => {
      try {
        const params: Record<string, any> = {
          search: query,
          per_page: Math.min(limit, 200),
        };
        
        if (filter) {
          params.filter = filter;
        }
        
        const data = await makeOpenAlexRequest('/sources', params);
        const savedFile = await saveResultsToFile(data, 'sources-search');
        
        let markdown = `# OpenAlex Sources Search Results\n\n`;
        markdown += `**Total Results:** ${data.meta?.count || 'Unknown'}\n`;
        markdown += `**Page:** ${data.meta?.page || 1} (${data.results?.length || 0} results shown)\n\n`;

        if (data.results && data.results.length > 0) {
          data.results.forEach((source: any, index: number) => {
            markdown += `## ${index + 1}. ${source.display_name || 'Unknown Source'}\n\n`;
            markdown += `- **OpenAlex ID:** ${source.id}\n`;
            if (source.issn_l) markdown += `- **ISSN-L:** ${source.issn_l}\n`;
            if (source.issn) markdown += `- **ISSNs:** ${source.issn.join(', ')}\n`;
            markdown += `- **Type:** ${source.type || 'Unknown'}\n`;
            markdown += `- **Works Count:** ${source.works_count || 0}\n`;
            markdown += `- **Cited By Count:** ${source.cited_by_count || 0}\n`;
            if (source.host_organization) markdown += `- **Publisher:** ${source.host_organization}\n`;
            if (source.homepage_url) markdown += `- **Homepage:** ${source.homepage_url}\n`;
            markdown += `\n`;
          });
        } else {
          markdown += 'No results found.';
        }
        
        if (savedFile) {
          markdown += `\n\n---\n*Full results saved to: ${savedFile}*`;
        }
        
        return {
          content: [
            {
              type: "text",
              text: markdown,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error searching OpenAlex sources: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "openalex-search-publishers",
    "Search publishers using OpenAlex API",
    {
      query: z.string().describe("Search query for publishers"),
      filter: z.string().optional().describe("Additional filters"),
      limit: z.number().optional().describe("Number of results to return (default 10, max 200)"),
    },
    async ({ query, filter, limit = 10 }) => {
      try {
        const params: Record<string, any> = {
          search: query,
          per_page: Math.min(limit, 200),
        };
        
        if (filter) {
          params.filter = filter;
        }
        
        const data = await makeOpenAlexRequest('/publishers', params);
        const savedFile = await saveResultsToFile(data, 'publishers-search');
        
        let markdown = `# OpenAlex Publishers Search Results\n\n`;
        markdown += `**Total Results:** ${data.meta?.count || 'Unknown'}\n`;
        markdown += `**Page:** ${data.meta?.page || 1} (${data.results?.length || 0} results shown)\n\n`;

        if (data.results && data.results.length > 0) {
          data.results.forEach((publisher: any, index: number) => {
            markdown += `## ${index + 1}. ${publisher.display_name || 'Unknown Publisher'}\n\n`;
            markdown += `- **OpenAlex ID:** ${publisher.id}\n`;
            if (publisher.alternate_titles && publisher.alternate_titles.length > 0) {
              markdown += `- **Alternate Names:** ${publisher.alternate_titles.join(', ')}\n`;
            }
            markdown += `- **Sources Count:** ${publisher.sources_count || 0}\n`;
            markdown += `- **Works Count:** ${publisher.works_count || 0}\n`;
            if (publisher.country_codes && publisher.country_codes.length > 0) {
              markdown += `- **Countries:** ${publisher.country_codes.join(', ')}\n`;
            }
            if (publisher.homepage_url) markdown += `- **Homepage:** ${publisher.homepage_url}\n`;
            markdown += `\n`;
          });
        } else {
          markdown += 'No results found.';
        }
        
        if (savedFile) {
          markdown += `\n\n---\n*Full results saved to: ${savedFile}*`;
        }
        
        return {
          content: [
            {
              type: "text",
              text: markdown,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error searching OpenAlex publishers: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "openalex-search-funders",
    "Search funders using OpenAlex API",
    {
      query: z.string().describe("Search query for funders"),
      filter: z.string().optional().describe("Additional filters"),
      limit: z.number().optional().describe("Number of results to return (default 10, max 200)"),
    },
    async ({ query, filter, limit = 10 }) => {
      try {
        const params: Record<string, any> = {
          search: query,
          per_page: Math.min(limit, 200),
        };
        
        if (filter) {
          params.filter = filter;
        }
        
        const data = await makeOpenAlexRequest('/funders', params);
        const savedFile = await saveResultsToFile(data, 'funders-search');
        
        let markdown = `# OpenAlex Funders Search Results\n\n`;
        markdown += `**Total Results:** ${data.meta?.count || 'Unknown'}\n`;
        markdown += `**Page:** ${data.meta?.page || 1} (${data.results?.length || 0} results shown)\n\n`;

        if (data.results && data.results.length > 0) {
          data.results.forEach((funder: any, index: number) => {
            markdown += `## ${index + 1}. ${funder.display_name || 'Unknown Funder'}\n\n`;
            markdown += `- **OpenAlex ID:** ${funder.id}\n`;
            if (funder.alternate_titles && funder.alternate_titles.length > 0) {
              markdown += `- **Alternate Names:** ${funder.alternate_titles.join(', ')}\n`;
            }
            if (funder.country_code) markdown += `- **Country:** ${funder.country_code}\n`;
            markdown += `- **Grants Count:** ${funder.grants_count || 0}\n`;
            markdown += `- **Works Count:** ${funder.works_count || 0}\n`;
            if (funder.description) markdown += `- **Description:** ${funder.description}\n`;
            if (funder.homepage_url) markdown += `- **Homepage:** ${funder.homepage_url}\n`;
            markdown += `\n`;
          });
        } else {
          markdown += 'No results found.';
        }
        
        if (savedFile) {
          markdown += `\n\n---\n*Full results saved to: ${savedFile}*`;
        }
        
        return {
          content: [
            {
              type: "text",
              text: markdown,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error searching OpenAlex funders: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "openalex-get-work-by-id",
    "Get a specific work by OpenAlex ID or DOI",
    {
      id: z.string().describe("OpenAlex ID (e.g., 'W1234567890') or DOI"),
    },
    async ({ id }) => {
      try {
        let endpoint: string;
        if (id.startsWith('W') || id.includes('openalex.org')) {
          // OpenAlex ID
          const workId = id.replace('https://openalex.org/', '');
          endpoint = `/works/${workId}`;
        } else {
          // Assume it's a DOI or other identifier
          endpoint = `/works`;
        }
        
        const data = id.startsWith('W') || id.includes('openalex.org') 
          ? await makeOpenAlexRequest(endpoint, {})
          : await makeOpenAlexRequest('/works', { filter: `doi:${id}` });
        
        const work = data.results ? data.results[0] : data;
        
        if (!work) {
          return {
            content: [
              {
                type: "text",
                text: `No work found with ID: ${id}`,
              },
            ],
          };
        }
        
        const savedFile = await saveResultsToFile(work, 'work-details');
        
        let markdown = `# OpenAlex Work Details\n\n`;
        markdown += `## ${work.title || 'Untitled'}\n\n`;
        markdown += `- **OpenAlex ID:** ${work.id}\n`;
        if (work.doi) markdown += `- **DOI:** ${work.doi}\n`;
        markdown += `- **Publication Year:** ${work.publication_year || 'Unknown'}\n`;
        markdown += `- **Type:** ${work.type || 'Unknown'}\n`;
        markdown += `- **Citations:** ${work.cited_by_count || 0}\n`;
        
        if (work.authorships && work.authorships.length > 0) {
          markdown += `\n### Authors\n`;
          work.authorships.forEach((authorship: any, index: number) => {
            markdown += `${index + 1}. **${authorship.author?.display_name || 'Unknown'}**`;
            if (authorship.institutions && authorship.institutions.length > 0) {
              const institutions = authorship.institutions.map((inst: any) => inst.display_name).join(', ');
              markdown += ` (${institutions})`;
            }
            markdown += `\n`;
          });
        }
        
        if (work.primary_location?.source) {
          markdown += `\n### Publication Venue\n`;
          markdown += `- **Source:** ${work.primary_location.source.display_name}\n`;
          if (work.primary_location.source.host_organization) {
            markdown += `- **Publisher:** ${work.primary_location.source.host_organization}\n`;
          }
        }
        
        if (work.concepts && work.concepts.length > 0) {
          markdown += `\n### Concepts/Topics\n`;
          work.concepts.slice(0, 10).forEach((concept: any) => {
            markdown += `- ${concept.display_name} (${(concept.score * 100).toFixed(1)}%)\n`;
          });
        }
        
        if (work.mesh && work.mesh.length > 0) {
          markdown += `\n### MeSH Terms\n`;
          work.mesh.slice(0, 10).forEach((mesh: any) => {
            markdown += `- ${mesh.descriptor_name}\n`;
          });
        }
        
        if (work.grants && work.grants.length > 0) {
          markdown += `\n### Funding\n`;
          work.grants.forEach((grant: any) => {
            markdown += `- **${grant.funder_display_name}**`;
            if (grant.award_id) markdown += ` (Award: ${grant.award_id})`;
            markdown += `\n`;
          });
        }
        
        if (work.abstract_inverted_index) {
          markdown += `\n### Abstract Available\nYes (inverted index format)\n`;
        }
        
        if (savedFile) {
          markdown += `\n\n---\n*Full details saved to: ${savedFile}*`;
        }
        
        return {
          content: [
            {
              type: "text",
              text: markdown,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error retrieving work details: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "openalex-autocomplete",
    "Get autocomplete suggestions for any OpenAlex entity type",
    {
      entity_type: z.enum(["works", "authors", "institutions", "sources", "concepts", "publishers", "funders"]).describe("Type of entity to search"),
      query: z.string().describe("Query string for autocomplete"),
      limit: z.number().optional().describe("Number of suggestions to return (default 10)"),
    },
    async ({ entity_type, query, limit = 10 }) => {
      try {
        const params = {
          q: query,
          per_page: Math.min(limit, 50), // Autocomplete typically has lower limits
        };
        
        // Try using regular search with small limit for autocomplete-like behavior
        const data = await makeOpenAlexRequest(`/${entity_type}`, {
          search: query,
          per_page: Math.min(limit, 25),
          select: 'id,display_name,cited_by_count,works_count'
        });
        const savedFile = await saveResultsToFile(data, `autocomplete-${entity_type}`);
        
        let markdown = `# OpenAlex Autocomplete - ${entity_type.charAt(0).toUpperCase() + entity_type.slice(1)}\n\n`;
        markdown += `**Query:** "${query}"\n`;
        markdown += `**Results:** ${data.results?.length || 0}\n\n`;

        if (data.results && data.results.length > 0) {
          data.results.forEach((item: any, index: number) => {
            markdown += `${index + 1}. **${item.display_name}**\n`;
            markdown += `   - ID: ${item.id}\n`;
            if (item.cited_by_count !== undefined) markdown += `   - Citations: ${item.cited_by_count}\n`;
            if (item.works_count !== undefined) markdown += `   - Works: ${item.works_count}\n`;
            markdown += `\n`;
          });
        } else {
          markdown += 'No suggestions found.';
        }
        
        if (savedFile) {
          markdown += `\n---\n*Full results saved to: ${savedFile}*`;
        }
        
        return {
          content: [
            {
              type: "text",
              text: markdown,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting autocomplete suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );
}