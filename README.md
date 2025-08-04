# Research MCP Server

A comprehensive MCP (Model Context Protocol) server that provides powerful research capabilities through multiple academic and web sources.

## Features

- **Perplexity Integration**: Web search and deep research capabilities
- **Google Scholar**: Academic paper search and citation analysis  
- **ArXiv**: Scientific paper search and retrieval
- **OpenAlex**: Academic database search with rich metadata
- **GitHub Integration**: Repository search and code analysis
- **Markdown Conversion**: Extract and convert web content to markdown

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
```

## Configuration

Create a `.env.local` file with your API keys:

```env
PERPLEXITY_API_KEY=your_perplexity_key
GITHUB_TOKEN=your_github_token
# Other API keys as needed
```

## Available Tools

### Search & Research
- `ask-perplexity` - Web search with AI-powered answers
- `google-scholar-search` - Academic paper search
- `arxiv-search` - Scientific paper search
- `openalex-search` - Comprehensive academic database search

### Content Processing  
- `get-markdown` - Convert web pages to clean markdown
- `github-search` - Search GitHub repositories and code

### Advanced Features
- Deep research mode for comprehensive analysis
- Citation tracking and paper relationships
- Metadata extraction from academic sources
- Content summarization and extraction

## Development

Start the server directly:
```bash
pnpm start
```

Build and watch for changes:
```bash
pnpm run build
pnpm start
```

## Architecture

Built on the Model Context Protocol (MCP) with:
- TypeScript for type safety
- Zod for parameter validation  
- Modular tool architecture
- Support for multiple MCP clients

## License

MIT