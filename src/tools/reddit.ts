import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

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

// Helper function to save results to /tmp directory
async function saveResults(filename: string, content: string) {
  try {
    const tmpDir = join(process.cwd(), "tmp");
    await mkdir(tmpDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filepath = join(tmpDir, `reddit-${filename}-${timestamp}.md`);

    await writeFile(filepath, content, "utf8");
    return filepath;
  } catch (error) {
    console.error("Failed to save results to file:", error);
    return null;
  }
}

// Helper function to extract post ID from Reddit URL
function extractPostId(url: string): string | null {
  const patterns = [
    /reddit\.com\/r\/[^\/]+\/comments\/([a-zA-Z0-9]+)/,
    /redd\.it\/([a-zA-Z0-9]+)/,
    /^([a-zA-Z0-9]+)$/ // Direct post ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

// Types for Reddit API responses
interface RedditPost {
  title: string;
  selftext: string;
  url: string;
  subreddit: string;
  author: string;
  score: number;
  upvote_ratio: number;
  num_comments: number;
  created_utc: number;
  permalink: string;
}

interface RedditComment {
  body: string;
  author: string;
  score: number;
  created_utc: number;
}

interface RedditApiChild {
  kind: string;
  data: RedditPost | RedditComment;
}

interface RedditApiResponse {
  data: {
    children: RedditApiChild[];
  };
}

// Helper function to decode HTML entities
function decodeHtml(html: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#39;': "'",
    '&nbsp;': ' '
  };
  
  return html.replace(/&[#\w]+;/g, (entity) => entities[entity] ?? entity);
}

// Helper function to format Reddit post content
function formatPostContent(post: RedditPost, comments: RedditComment[]): string {
  const title = decodeHtml(post.title);
  
  let result = `<post>\n<title>${title}</title>\n`;
  
  if (post.selftext) {
    const content = decodeHtml(post.selftext);
    result += `<content>${content}</content>\n`;
  } else if (post.url && !post.url.includes('reddit.com')) {
    result += `<content>Link: ${post.url}</content>\n`;
  }
  
  if (comments.length > 0) {
    result += `<comments>\n`;
    
    comments.forEach(comment => {
      if (comment.body && comment.body !== '[deleted]' && comment.body !== '[removed]') {
        const commentText = decodeHtml(comment.body);
        result += `<comment>${commentText}</comment>\n`;
      }
    });
    
    result += `</comments>\n`;
  }
  
  result += `</post>`;
  
  return result;
}

export function registerRedditTools(server: McpServer) {
  server.tool(
    "reddit-get-post",
    "Get a Reddit post with top-level comments formatted in XML/markdown structure. Returns post content and comments in <post><title>title</title><content>content</content><comments><comment>text</comment></comments></post> format.",
    {
      url: z.string().describe("Reddit post URL (reddit.com/r/subreddit/comments/postid/...) or just the post ID"),
      maxComments: z.number().optional().describe("Maximum number of top-level comments to fetch (default: 25, max: 100)"),
    },
    async ({ url, maxComments = 25 }) => {
      try {
        const postId = extractPostId(url);
        if (!postId) {
          throw new Error("Invalid Reddit URL or post ID format");
        }

        maxComments = Math.min(Math.max(maxComments, 1), 100);

        await rateLimit();

        // Use Reddit's JSON API
        const redditUrl = `https://www.reddit.com/comments/${postId}.json?limit=${maxComments}`;
        
        const response = await fetch(redditUrl, {
          headers: {
            "User-Agent": "MCP-Search-Tool/1.0.0",
            "Accept": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as RedditApiResponse[];

        if (!Array.isArray(data) || data.length < 2) {
          throw new Error("Invalid response format from Reddit API");
        }

        const postChild = data[0].data.children[0];
        if (!postChild || postChild.kind !== "t3") {
          throw new Error("Post not found or not accessible");
        }
        
        const postData = postChild.data as RedditPost;
        const commentsData = data[1].data.children;

        // Extract top-level comments only
        const topLevelComments = commentsData
          .filter((comment) => comment.kind === "t1" && (comment.data as RedditComment).body)
          .map((comment) => comment.data as RedditComment)
          .slice(0, maxComments);

        // Format the post and comments
        const formattedContent = formatPostContent(postData, topLevelComments);

        const filepath = await saveResults("post", formattedContent);
        
        let result = formattedContent;
        if (filepath) {
          result += `\n\n<!-- Results saved to: ${filepath} -->`;
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
              text: `Error fetching Reddit post: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "reddit-search-posts",
    "Search Reddit posts using Reddit's search API and return results with basic post information.",
    {
      query: z.string().describe("Search query for Reddit posts"),
      subreddit: z.string().optional().describe("Limit search to specific subreddit (without r/ prefix)"),
      sort: z.enum(["relevance", "hot", "top", "new", "comments"]).optional().describe("Sort order (default: relevance)"),
      time: z.enum(["all", "year", "month", "week", "day", "hour"]).optional().describe("Time filter for 'top' sort (default: all)"),
      limit: z.number().optional().describe("Number of results to return (default: 10, max: 25)"),
    },
    async ({ query, subreddit, sort = "relevance", time = "all", limit = 10 }) => {
      try {
        limit = Math.min(Math.max(limit, 1), 25);

        await rateLimit();

        let searchUrl = "https://www.reddit.com/search.json";
        const params = new URLSearchParams({
          q: query,
          sort: sort,
          limit: limit.toString(),
          type: "link",
        });

        if (subreddit) {
          params.set("q", `${query} subreddit:${subreddit}`);
        }

        if (sort === "top" && time) {
          params.set("t", time);
        }

        const response = await fetch(`${searchUrl}?${params}`, {
          headers: {
            "User-Agent": "MCP-Search-Tool/1.0.0",
            "Accept": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as RedditApiResponse;
        const posts = data.data.children;

        let result = `<search_results>\n<query>${query}</query>\n`;
        if (subreddit) {
          result += `<subreddit>r/${subreddit}</subreddit>\n`;
        }
        result += `<sort>${sort}</sort>\n`;
        if (sort === "top") {
          result += `<time>${time}</time>\n`;
        }
        result += `<count>${posts.length}</count>\n<posts>\n`;

        if (posts.length > 0) {
          posts.forEach((post) => {
            const postData = post.data as RedditPost;
            result += `<post>\n`;
            result += `<title>${decodeHtml(postData.title)}</title>\n`;
            result += `<subreddit>r/${postData.subreddit}</subreddit>\n`;
            result += `<author>u/${postData.author}</author>\n`;
            result += `<score>${postData.score}</score>\n`;
            result += `<comments>${postData.num_comments}</comments>\n`;
            result += `<url>https://reddit.com${postData.permalink}</url>\n`;
            
            if (postData.selftext && postData.selftext.length > 0) {
              const preview = postData.selftext.length > 200 
                ? decodeHtml(postData.selftext.substring(0, 200)) + "..." 
                : decodeHtml(postData.selftext);
              result += `<content>${preview}</content>\n`;
            } else if (postData.url && !postData.url.includes('reddit.com')) {
              result += `<link>${postData.url}</link>\n`;
            }
            
            result += `</post>\n`;
          });
        }
        
        result += `</posts>\n</search_results>`;

        const filepath = await saveResults("search", result);
        if (filepath) {
          result += `\n\n<!-- Results saved to: ${filepath} -->`;
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
              text: `Error searching Reddit: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}