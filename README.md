# Research MCP Server

A comprehensive MCP (Model Context Protocol) server that provides powerful research capabilities through multiple academic and web sources. This server integrates with various research platforms to enable deep academic research, web search, and content analysis.

## Features

### Research & Academic Search

- **Perplexity Integration**: AI-powered web search with deep research mode
- **Google Scholar**: Academic paper search and citation analysis
- **ArXiv**: Scientific paper search, retrieval, and LaTeX source conversion
- **OpenAlex**: Comprehensive academic database with rich metadata

### Developer & Code Search

- **GitHub Integration**: Repository, code, issues, and user search
- **Markdown Conversion**: Extract and convert web content to clean markdown

### Advanced Capabilities

- **LaTeX to Markdown**: Automatic conversion of arXiv papers to readable markdown
- **Timestamped Results**: All searches saved to `/tmp` directory with timestamps
- **Deep Research Mode**: Comprehensive analysis for complex topics
- **Multi-format Export**: Results saved in organized, searchable formats

## Installation

```bash
pnpm install
pnpm run build
```

## Quick Start

Install to all MCP clients:

```bash
pnpm run install-server
```

Or install to specific clients:

```bash
pnpm run install-desktop    # Claude Desktop
pnpm run install-cursor     # Cursor IDE
pnpm run install-code       # Claude Code
pnpm run install-mcp        # .mcp.json only
```

## Configuration

Create a `.env.local` file with your API keys:

```env
PERPLEXITY_API_KEY=your_perplexity_key
GITHUB_TOKEN=your_github_token
SERP_API_KEY=your_serp_api_key
```

## Available Tools

### Perplexity Search

- `ask-perplexity` - Web search with AI-powered answers and deep research mode

### Google Scholar

- `google-scholar-search` - Academic paper search with citation analysis

### ArXiv Research

- `arxiv-search` - Search scientific papers with advanced query syntax
- `arxiv-get-paper` - Download paper details and LaTeX source with markdown conversion
- `arxiv-search-by-author` - Find papers by specific authors
- `arxiv-search-by-category` - Browse papers by subject category with date filtering

### OpenAlex Academic Database

- `openalex-search-works` - Search academic works with rich metadata
- `openalex-search-authors` - Find academic authors and their work
- `openalex-search-institutions` - Research academic institutions
- `openalex-search-concepts` - Explore academic concepts and topics
- `openalex-search-sources` - Find journals and conferences
- `openalex-search-publishers` - Research academic publishers
- `openalex-search-funders` - Find research funding sources
- `openalex-get-work-by-id` - Get detailed work information by ID or DOI
- `openalex-autocomplete` - Get suggestions for any entity type

### GitHub Development

- `github-search-repositories` - Find repositories with advanced filtering
- `github-search-code` - Search code across repositories
- `github-search-issues` - Find issues and pull requests
- `github-search-users` - Discover developers and maintainers
- `github-get-repository` - Get detailed repository information

### Content Processing

- `get-markdown` - Convert web pages to clean, structured markdown

## Advanced Features

### ArXiv LaTeX Processing

- Automatic download and extraction of LaTeX source files
- Conversion to markdown using Pandoc
- Preservation of figures, tables, and bibliography
- Organized file structure in timestamped directories

### Result Management

- All searches automatically saved to `/tmp` directory
- Timestamped filenames for easy organization
- Structured markdown output for readability
- Comprehensive metadata preservation

### Query Optimization

- Advanced search syntax support for arXiv
- Boolean operators (AND, OR, ANDNOT) with parentheses
- Field-specific searches (title, author, abstract, category)
- Date range filtering and sorting options

## Development

Start the server directly:

```bash
pnpm start
```

Build and test:

```bash
pnpm run build
pnpm start
```

## Architecture

Built on the Model Context Protocol (MCP) with:

- **Core Framework**: @modelcontextprotocol/sdk
- **Runtime**: Node.js with ES modules
- **Language**: TypeScript with ES2022 target
- **Validation**: Zod for parameter validation
- **Transport**: StdioServerTransport for client communication
- **Modular Design**: Separate tool files for each service

### Project Structure

```
src/
├── index.ts           # Main MCP server entry point
└── tools/             # Individual tool implementations
    ├── perplexity.ts  # Perplexity AI integration
    ├── scholar.ts     # Google Scholar search
    ├── arxiv.ts       # ArXiv paper search & processing
    ├── openalex.ts    # OpenAlex academic database
    ├── github.ts      # GitHub API integration
    └── markdown.ts    # Web content extraction
```

## Dependencies

- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `zod` - Runtime type validation
- `axios` - HTTP client for API calls
- `dotenv` - Environment variable management

## License

MIT
