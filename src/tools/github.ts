import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

// GraphQL API endpoint
const GITHUB_GRAPHQL_ENDPOINT = "https://api.github.com/graphql";

// Rate limiting constants
const RATE_LIMIT_DELAY = 1000; // 1 second between requests
let lastRequestTime = 0;

// Helper function to handle rate limiting
async function rateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();
}

// Helper function to make GraphQL requests
async function makeGraphQLRequest(query: string, variables: any = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN not found in environment variables");
  }

  await rateLimit();

  const response = await fetch(GITHUB_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "MCP-Search-Tool/1.0.0",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  return data.data;
}

// Helper function to save results to /tmp directory
async function saveResults(filename: string, content: string) {
  try {
    const tmpDir = join(process.cwd(), "tmp");
    await mkdir(tmpDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filepath = join(tmpDir, `github-${filename}-${timestamp}.md`);

    await writeFile(filepath, content, "utf8");
    return filepath;
  } catch (error) {
    console.error("Failed to save results to file:", error);
    return null;
  }
}

// Helper function to build search query string
function buildSearchQuery(baseQuery: string, filters: Record<string, string | undefined>): string {
  let searchQuery = baseQuery;
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      searchQuery += ` ${key}:${value}`;
    }
  });
  
  return searchQuery;
}

export function registerGitHubTools(server: McpServer) {
  server.tool(
    "github-search-repositories",
    "Search GitHub repositories using GraphQL API. Use simple, focused search terms - avoid combining too many keywords as GitHub uses AND logic. Use filters instead of including language names in the query text.",
    {
      query: z.string().describe("Simple search query for repositories. Use 2-3 core keywords max (e.g., 'latex converter' not 'latex markdown converter javascript typescript'). GitHub uses AND logic - too many terms will return zero results."),
      language: z.string().optional().describe("Filter by programming language (use this instead of including language names in query text)"),
      stars: z.string().optional().describe("Filter by star count (e.g., '>100', '10..50')"),
      created: z.string().optional().describe("Filter by creation date (e.g., '>2020-01-01')"),
      pushed: z.string().optional().describe("Filter by last push date"),
      license: z.string().optional().describe("Filter by license (e.g., 'mit', 'apache-2.0')"),
      first: z.number().optional().describe("Number of results to return (default 10, max 100)"),
    },
    async ({ query, language, stars, created, pushed, license, first = 10 }) => {
      try {
        first = Math.min(Math.max(first, 1), 100);

        const searchQuery = buildSearchQuery(query, {
          language,
          stars,
          created,
          pushed,
          license,
        });

        const graphqlQuery = `
          query SearchRepositories($searchQuery: String!, $first: Int!) {
            search(query: $searchQuery, type: REPOSITORY, first: $first) {
              repositoryCount
              pageInfo {
                endCursor
                hasNextPage
              }
              nodes {
                ... on Repository {
                  name
                  nameWithOwner
                  description
                  url
                  stargazerCount
                  forkCount
                  createdAt
                  updatedAt
                  pushedAt
                  primaryLanguage {
                    name
                    color
                  }
                  licenseInfo {
                    key
                    name
                    spdxId
                  }
                  repositoryTopics(first: 10) {
                    nodes {
                      topic {
                        name
                      }
                    }
                  }
                  owner {
                    login
                    avatarUrl
                  }
                  isArchived
                  isFork
                  isPrivate
                }
              }
            }
          }
        `;

        const data = await makeGraphQLRequest(graphqlQuery, { searchQuery, first });

        let result = `# GitHub Repository Search Results\n\n`;
        result += `**Query:** ${searchQuery}\n`;
        result += `**Total repositories found:** ${data.search.repositoryCount}\n`;
        result += `**Results shown:** ${data.search.nodes.length}\n\n`;

        if (data.search.nodes.length === 0) {
          result += "No repositories found matching your search criteria.\n";
        } else {
          data.search.nodes.forEach((repo: any, index: number) => {
            result += `## ${index + 1}. ${repo.nameWithOwner}\n`;
            result += `**URL:** ${repo.url}\n`;
            if (repo.description) result += `**Description:** ${repo.description}\n`;
            result += `**Stars:** ${repo.stargazerCount} | **Forks:** ${repo.forkCount}\n`;
            if (repo.primaryLanguage) {
              result += `**Primary Language:** ${repo.primaryLanguage.name}\n`;
            }
            if (repo.licenseInfo) {
              result += `**License:** ${repo.licenseInfo.name} (${repo.licenseInfo.key})\n`;
            }
            result += `**Last Updated:** ${new Date(repo.updatedAt).toLocaleDateString()}\n`;
            
            const flags = [];
            if (repo.isArchived) flags.push("Archived");
            if (repo.isFork) flags.push("Fork");
            if (repo.isPrivate) flags.push("Private");
            if (flags.length > 0) {
              result += `**Flags:** ${flags.join(", ")}\n`;
            }

            if (repo.repositoryTopics.nodes.length > 0) {
              const topics = repo.repositoryTopics.nodes.map((t: any) => t.topic.name);
              result += `**Topics:** ${topics.join(", ")}\n`;
            }
            result += "\n";
          });
        }

        const filepath = await saveResults("repository-search", result);
        if (filepath) {
          result += `\n---\n*Results saved to: ${filepath}*`;
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
              text: `Error searching GitHub repositories: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "github-search-code",
    "Search code across GitHub repositories using GraphQL API. Use simple, focused search terms - avoid combining too many keywords as GitHub uses AND logic. Use filters instead of including language names in the query text.",
    {
      query: z.string().describe("Simple code search query. Use 2-3 core keywords max. GitHub uses AND logic - too many terms will return zero results."),
      language: z.string().optional().describe("Filter by programming language (use this instead of including language names in query text)"),
      repo: z.string().optional().describe("Filter by specific repository (owner/name)"),
      path: z.string().optional().describe("Filter by file path"),
      extension: z.string().optional().describe("Filter by file extension"),
      first: z.number().optional().describe("Number of results to return (default 10, max 100)"),
    },
    async ({ query, language, repo, path, extension, first = 10 }) => {
      try {
        first = Math.min(Math.max(first, 1), 100);

        const searchQuery = buildSearchQuery(query, {
          language,
          repo,
          path,
          extension: extension ? `.${extension.replace(/^\./, "")}` : undefined,
        });

        // GitHub code search requires REST API, not GraphQL
        const token = process.env.GITHUB_TOKEN;
        if (!token) {
          throw new Error("GITHUB_TOKEN not found in environment variables");
        }

        await rateLimit();

        const searchParams = new URLSearchParams({
          q: searchQuery,
          per_page: first.toString(),
        });

        const response = await fetch(`https://api.github.com/search/code?${searchParams}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "MCP-Search-Tool/1.0.0",
          },
        });

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        let result = `# GitHub Code Search Results\n\n`;
        result += `**Query:** ${searchQuery}\n`;
        result += `**Total code matches found:** ${data.total_count}\n`;
        result += `**Results shown:** ${data.items?.length || 0}\n\n`;

        if (!data.items || data.items.length === 0) {
          result += "No code matches found for your search criteria.\n";
        } else {
          data.items.forEach((match: any, index: number) => {
            result += `## ${index + 1}. ${match.repository.full_name}\n`;
            result += `**File:** ${match.path}\n`;
            result += `**Repository URL:** ${match.repository.html_url}\n`;
            result += `**File URL:** ${match.html_url}\n\n`;

            if (match.text_matches && match.text_matches.length > 0) {
              result += "**Code Snippets:**\n";
              match.text_matches.forEach((textMatch: any, matchIndex: number) => {
                result += `\n### Match ${matchIndex + 1}\n`;
                result += "```\n";
                result += textMatch.fragment;
                result += "\n```\n";
              });
            }
            result += "\n---\n\n";
          });
        }

        const filepath = await saveResults("code-search", result);
        if (filepath) {
          result += `\n---\n*Results saved to: ${filepath}*`;
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
              text: `Error searching GitHub code: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "github-search-issues",
    "Search GitHub issues and pull requests using GraphQL API. Use simple, focused search terms - avoid combining too many keywords as GitHub uses AND logic.",
    {
      query: z.string().describe("Simple search query for issues/PRs. Use 2-3 core keywords max. GitHub uses AND logic - too many terms will return zero results."),
      type: z.enum(["issue", "pr", "both"]).optional().describe("Filter by type (default: both)"),
      state: z.enum(["open", "closed", "merged", "all"]).optional().describe("Filter by state (default: all)"),
      repo: z.string().optional().describe("Filter by specific repository (owner/name)"),
      author: z.string().optional().describe("Filter by author username"),
      assignee: z.string().optional().describe("Filter by assignee username"),
      first: z.number().optional().describe("Number of results to return (default 10, max 100)"),
    },
    async ({ query, type = "both", state = "all", repo, author, assignee, first = 10 }) => {
      try {
        first = Math.min(Math.max(first, 1), 100);

        const filters: Record<string, string | undefined> = {
          repo,
          author,
          assignee,
        };

        // Add type filters
        if (type === "issue") {
          filters["is"] = "issue";
        } else if (type === "pr") {
          filters["is"] = "pull-request";
        }

        // Add state filters
        if (state !== "all") {
          if (state === "merged") {
            filters["is"] = filters["is"] ? `${filters["is"]} merged` : "merged";
          } else {
            filters["state"] = state;
          }
        }

        const searchQuery = buildSearchQuery(query, filters);

        const graphqlQuery = `
          query SearchIssues($searchQuery: String!, $first: Int!) {
            search(query: $searchQuery, type: ISSUE, first: $first) {
              issueCount
              pageInfo {
                endCursor
                hasNextPage
              }
              nodes {
                ... on Issue {
                  title
                  number
                  url
                  state
                  createdAt
                  updatedAt
                  closedAt
                  body
                  author {
                    login
                  }
                  assignees(first: 5) {
                    nodes {
                      login
                    }
                  }
                  labels(first: 10) {
                    nodes {
                      name
                      color
                    }
                  }
                  repository {
                    nameWithOwner
                    url
                  }
                  comments {
                    totalCount
                  }
                }
                ... on PullRequest {
                  title
                  number
                  url
                  state
                  createdAt
                  updatedAt
                  closedAt
                  mergedAt
                  merged
                  mergeable
                  body
                  author {
                    login
                  }
                  assignees(first: 5) {
                    nodes {
                      login
                    }
                  }
                  labels(first: 10) {
                    nodes {
                      name
                      color
                    }
                  }
                  repository {
                    nameWithOwner
                    url
                  }
                  comments {
                    totalCount
                  }
                  additions
                  deletions
                  changedFiles
                }
              }
            }
          }
        `;

        const data = await makeGraphQLRequest(graphqlQuery, { searchQuery, first });

        let result = `# GitHub Issues/PRs Search Results\n\n`;
        result += `**Query:** ${searchQuery}\n`;
        result += `**Total issues/PRs found:** ${data.search.issueCount}\n`;
        result += `**Results shown:** ${data.search.nodes.length}\n\n`;

        if (data.search.nodes.length === 0) {
          result += "No issues or pull requests found matching your search criteria.\n";
        } else {
          data.search.nodes.forEach((item: any, index: number) => {
            const isPR = item.hasOwnProperty("merged");
            const itemType = isPR ? "Pull Request" : "Issue";
            
            result += `## ${index + 1}. ${itemType} #${item.number}: ${item.title}\n`;
            result += `**Repository:** ${item.repository.nameWithOwner}\n`;
            result += `**URL:** ${item.url}\n`;
            result += `**State:** ${item.state}`;
            if (isPR && item.merged) {
              result += ` (Merged)`;
            }
            result += `\n`;
            result += `**Author:** ${item.author?.login || "Unknown"}\n`;
            
            if (item.assignees.nodes.length > 0) {
              const assignees = item.assignees.nodes.map((a: any) => a.login);
              result += `**Assignees:** ${assignees.join(", ")}\n`;
            }
            
            result += `**Updated:** ${new Date(item.updatedAt).toLocaleDateString()}\n`;
            
            if (item.closedAt) {
              result += `**Closed:** ${new Date(item.closedAt).toLocaleDateString()}\n`;
            }
            if (isPR && item.mergedAt) {
              result += `**Merged:** ${new Date(item.mergedAt).toLocaleDateString()}\n`;
            }
            
            result += `**Comments:** ${item.comments.totalCount}\n`;
            
            if (isPR) {
              result += `**Changes:** +${item.additions}/-${item.deletions} (${item.changedFiles} files)\n`;
              result += `**Mergeable:** ${item.mergeable === null ? "Unknown" : item.mergeable ? "Yes" : "No"}\n`;
            }

            if (item.labels.nodes.length > 0) {
              const labels = item.labels.nodes.map((l: any) => l.name);
              result += `**Labels:** ${labels.join(", ")}\n`;
            }

            if (item.body && item.body.length > 0) {
              const bodyPreview = item.body.length > 200 
                ? item.body.substring(0, 200) + "..." 
                : item.body;
              result += `**Description:** ${bodyPreview}\n`;
            }
            
            result += "\n---\n\n";
          });
        }

        const filepath = await saveResults("issues-search", result);
        if (filepath) {
          result += `\n---\n*Results saved to: ${filepath}*`;
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
              text: `Error searching GitHub issues: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "github-search-users",
    "Search GitHub users using GraphQL API. Use simple, focused search terms - avoid combining too many keywords as GitHub uses AND logic.",
    {
      query: z.string().describe("Simple search query for users. Use 2-3 core keywords max. GitHub uses AND logic - too many terms will return zero results."),
      location: z.string().optional().describe("Filter by location"),
      language: z.string().optional().describe("Filter by primary language (use this instead of including language names in query text)"),
      followers: z.string().optional().describe("Filter by follower count (e.g., '>100')"),
      repos: z.string().optional().describe("Filter by repository count (e.g., '>10')"),
      first: z.number().optional().describe("Number of results to return (default 10, max 100)"),
    },
    async ({ query, location, language, followers, repos, first = 10 }) => {
      try {
        first = Math.min(Math.max(first, 1), 100);

        const searchQuery = buildSearchQuery(query, {
          location,
          language,
          followers,
          repos,
        });

        const graphqlQuery = `
          query SearchUsers($searchQuery: String!, $first: Int!) {
            search(query: $searchQuery, type: USER, first: $first) {
              userCount
              pageInfo {
                endCursor
                hasNextPage
              }
              nodes {
                ... on User {
                  login
                  name
                  bio
                  location
                  email
                  url
                  avatarUrl
                  websiteUrl
                  twitterUsername
                  company
                  createdAt
                  updatedAt
                  followers {
                    totalCount
                  }
                  following {
                    totalCount
                  }
                  repositories(ownerAffiliations: OWNER) {
                    totalCount
                  }
                  starredRepositories {
                    totalCount
                  }
                  gists {
                    totalCount
                  }
                  organizations(first: 5) {
                    nodes {
                      login
                      name
                    }
                  }
                  topRepositories(first: 5, orderBy: {field: STARGAZERS, direction: DESC}) {
                    nodes {
                      name
                      stargazerCount
                      primaryLanguage {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        `;

        const data = await makeGraphQLRequest(graphqlQuery, { searchQuery, first });

        let result = `# GitHub Users Search Results\n\n`;
        result += `**Query:** ${searchQuery}\n`;
        result += `**Total users found:** ${data.search.userCount}\n`;
        result += `**Results shown:** ${data.search.nodes.length}\n\n`;

        if (data.search.nodes.length === 0) {
          result += "No users found matching your search criteria.\n";
        } else {
          data.search.nodes.forEach((user: any, index: number) => {
            result += `## ${index + 1}. ${user.login}`;
            if (user.name) result += ` (${user.name})`;
            result += `\n`;
            
            result += `**Profile URL:** ${user.url}\n`;
            result += `**Avatar:** ${user.avatarUrl}\n`;
            
            if (user.bio) result += `**Bio:** ${user.bio}\n`;
            if (user.location) result += `**Location:** ${user.location}\n`;
            if (user.company) result += `**Company:** ${user.company}\n`;
            if (user.email) result += `**Email:** ${user.email}\n`;
            if (user.websiteUrl) result += `**Website:** ${user.websiteUrl}\n`;
            if (user.twitterUsername) result += `**Twitter:** @${user.twitterUsername}\n`;
            
            result += `**Stats:**\n`;
            result += `- Followers: ${user.followers.totalCount}\n`;
            result += `- Following: ${user.following.totalCount}\n`;
            result += `- Public Repos: ${user.repositories.totalCount}\n`;
            result += `- Starred Repos: ${user.starredRepositories.totalCount}\n`;
            result += `- Gists: ${user.gists.totalCount}\n`;
            
            result += `**Last Updated:** ${new Date(user.updatedAt).toLocaleDateString()}\n`;

            if (user.organizations.nodes.length > 0) {
              result += `**Organizations:**\n`;
              user.organizations.nodes.forEach((org: any) => {
                result += `- ${org.name || org.login} (@${org.login})\n`;
              });
            }

            if (user.topRepositories.nodes.length > 0) {
              result += `**Top Repositories:**\n`;
              user.topRepositories.nodes.forEach((repo: any) => {
                result += `- ${repo.name} (⭐ ${repo.stargazerCount})`;
                if (repo.primaryLanguage) {
                  result += ` - ${repo.primaryLanguage.name}`;
                }
                result += `\n`;
              });
            }
            
            result += "\n---\n\n";
          });
        }

        const filepath = await saveResults("users-search", result);
        if (filepath) {
          result += `\n---\n*Results saved to: ${filepath}*`;
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
              text: `Error searching GitHub users: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "github-get-repository",
    "Get detailed information about a specific GitHub repository",
    {
      owner: z.string().describe("Repository owner username"),
      name: z.string().describe("Repository name"),
      includeReadme: z.boolean().optional().describe("Include README content (default: false)"),
      includeLanguages: z.boolean().optional().describe("Include language statistics (default: true)"),
      includeTopics: z.boolean().optional().describe("Include repository topics (default: true)"),
    },
    async ({ owner, name, includeReadme = false, includeLanguages = true, includeTopics = true }) => {
      try {
        let graphqlQuery = `
          query GetRepository($owner: String!, $name: String!) {
            repository(owner: $owner, name: $name) {
              name
              nameWithOwner
              description
              url
              homepageUrl
              stargazerCount
              forkCount
              watchers {
                totalCount
              }
              issues(states: OPEN) {
                totalCount
              }
              pullRequests(states: OPEN) {
                totalCount
              }
              releases {
                totalCount
              }
              createdAt
              updatedAt
              pushedAt
              primaryLanguage {
                name
                color
              }
              licenseInfo {
                key
                name
                spdxId
                url
              }
              owner {
                login
                avatarUrl
                url
              }
              defaultBranchRef {
                name
              }
              isArchived
              isFork
              isPrivate
              isMirror
              isTemplate
              hasIssuesEnabled
              hasProjectsEnabled
              hasWikiEnabled
              hasDiscussionsEnabled
              hasPackagesEnabled
              diskUsage
              ${includeTopics ? `
              repositoryTopics(first: 20) {
                nodes {
                  topic {
                    name
                  }
                }
              }
              ` : ''}
              ${includeLanguages ? `
              languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
                totalSize
                nodes {
                  name
                  color
                }
                edges {
                  size
                  node {
                    name
                  }
                }
              }
              ` : ''}
              ${includeReadme ? `
              object(expression: "HEAD:README.md") {
                ... on Blob {
                  text
                }
              }
              readmeObject: object(expression: "HEAD:README") {
                ... on Blob {
                  text
                }
              }
              ` : ''}
              collaborators(first: 10) {
                totalCount
                nodes {
                  login
                  name
                }
              }
              mentionableUsers(first: 10) {
                totalCount
              }
              vulnerability: vulnerabilityAlerts(first: 1) {
                totalCount
              }
            }
          }
        `;

        const data = await makeGraphQLRequest(graphqlQuery, { owner, name });
        const repo = data.repository;

        if (!repo) {
          return {
            content: [
              {
                type: "text",
                text: `Repository ${owner}/${name} not found or not accessible.`,
              },
            ],
          };
        }

        let result = `# ${repo.nameWithOwner}\n\n`;
        
        if (repo.description) {
          result += `**Description:** ${repo.description}\n\n`;
        }

        result += `**Repository Details:**\n`;
        result += `- **URL:** ${repo.url}\n`;
        if (repo.homepageUrl) {
          result += `- **Homepage:** ${repo.homepageUrl}\n`;
        }
        result += `- **Default Branch:** ${repo.defaultBranchRef?.name || "main"}\n`;
        
        if (repo.primaryLanguage) {
          result += `- **Primary Language:** ${repo.primaryLanguage.name}\n`;
        }
        
        if (repo.licenseInfo) {
          result += `- **License:** ${repo.licenseInfo.name} (${repo.licenseInfo.key})\n`;
        }

        result += `\n**Statistics:**\n`;
        result += `- **Stars:** ${repo.stargazerCount}\n`;
        result += `- **Forks:** ${repo.forkCount}\n`;
        result += `- **Watchers:** ${repo.watchers.totalCount}\n`;
        result += `- **Open Issues:** ${repo.issues.totalCount}\n`;
        result += `- **Open PRs:** ${repo.pullRequests.totalCount}\n`;
        result += `- **Releases:** ${repo.releases.totalCount}\n`;
        result += `- **Collaborators:** ${repo.collaborators.totalCount}\n`;
        if (repo.diskUsage) {
          result += `- **Size:** ${(repo.diskUsage / 1024).toFixed(2)} MB\n`;
        }
        if (repo.vulnerability.totalCount > 0) {
          result += `- **Security Alerts:** ${repo.vulnerability.totalCount}\n`;
        }

        result += `\n**Last Updated:** ${new Date(repo.updatedAt).toLocaleDateString()}\n`;

        const features = [];
        if (repo.hasIssuesEnabled) features.push("Issues");
        if (repo.hasProjectsEnabled) features.push("Projects");
        if (repo.hasWikiEnabled) features.push("Wiki");
        if (repo.hasDiscussionsEnabled) features.push("Discussions");
        if (repo.hasPackagesEnabled) features.push("Packages");
        if (features.length > 0) {
          result += `\n**Features Enabled:** ${features.join(", ")}\n`;
        }

        const flags = [];
        if (repo.isArchived) flags.push("Archived");
        if (repo.isFork) flags.push("Fork");
        if (repo.isPrivate) flags.push("Private");
        if (repo.isMirror) flags.push("Mirror");
        if (repo.isTemplate) flags.push("Template");
        if (flags.length > 0) {
          result += `**Repository Flags:** ${flags.join(", ")}\n`;
        }

        if (includeTopics && repo.repositoryTopics.nodes.length > 0) {
          const topics = repo.repositoryTopics.nodes.map((t: any) => t.topic.name);
          result += `\n**Topics:** ${topics.join(", ")}\n`;
        }

        if (includeLanguages && repo.languages) {
          result += `\n**Languages:**\n`;
          const totalBytes = repo.languages.totalSize;
          repo.languages.edges.forEach((edge: any) => {
            const percentage = ((edge.size / totalBytes) * 100).toFixed(1);
            result += `- ${edge.node.name}: ${percentage}%\n`;
          });
        }

        if (repo.collaborators.nodes.length > 0) {
          result += `\n**Recent Collaborators:**\n`;
          repo.collaborators.nodes.forEach((collab: any) => {
            result += `- ${collab.name || collab.login} (@${collab.login})\n`;
          });
        }

        if (includeReadme) {
          const readmeContent = repo.object?.text || repo.readmeObject?.text;
          if (readmeContent) {
            result += `\n## README\n\n`;
            // Limit README content to prevent extremely long responses
            const maxReadmeLength = 2000;
            if (readmeContent.length > maxReadmeLength) {
              result += readmeContent.substring(0, maxReadmeLength) + "\n\n... (truncated)";
            } else {
              result += readmeContent;
            }
          }
        }

        const filepath = await saveResults("repository-details", result);
        if (filepath) {
          result += `\n\n---\n*Results saved to: ${filepath}*`;
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
              text: `Error getting GitHub repository details: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}