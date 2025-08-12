import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as os from "os";
import * as path from "path";
import { z } from "zod";

// Store the research directory in memory (cleared on server restart)
let currentResearchDirectory: string | null = null;

type ResearchStrategy = {
  [researchType: string]: {
    [depth: number]: {
      [step: number]: string;
    };
  };
};

const researchStrategies: ResearchStrategy = {
  market: {
    1: {
      // Shallow - Quick market insights
      1: "Define research objectives and target market. Conduct quick parallel searches for: market size estimates, key competitors list, and basic customer demographics.",
      2: "Conduct rapid competitive scan. Use parallel searches to: identify top 3-5 competitors, gather pricing information, and collect recent market news.",
      3: "Quick customer analysis. Use parallel searches for: customer reviews, common complaints, and basic demographic data.",
      4: "Market opportunity assessment. Search in parallel for: market gaps, growth trends, and entry barriers.",
      5: "Synthesize findings into executive summary with key insights and recommendations.",
    },
    2: {
      // Medium - Comprehensive market analysis
      1: "Define market research framework. Document objectives in charter, identify primary/secondary research needs, and set up basic tracking.",
      2: "Deploy 2-3 agents in parallel for competitive intelligence: One for market segments analysis, one for competitor capabilities audit, and one for business model research. Provide each agent with the research directory path for saving their findings.",
      3: "Customer journey mapping. Analyze touchpoints, pain points, switching costs, and satisfaction metrics across customer segments.",
      4: "Market dynamics assessment. Evaluate growth drivers, regulatory factors, technology trends, and disruption risks.",
      5: "Strategic positioning analysis. Create competitive matrices, identify white spaces, and develop go-to-market recommendations.",
      6: "Compile comprehensive market report with data visualizations and strategic recommendations.",
    },
    3: {
      // Deep - Full competitive intelligence workflow
      1: "Infrastructure setup: Create competitor-profiles, market-positioning, capability-gaps, strategic-moves directories in research folder. Write competitive-charter.md with landscape boundaries, KPIs, and ethical guidelines.",
      2: "Deploy 8 competitive intelligence specialists in parallel using the Task tool. Give each agent: 1) Their specific research focus (Market Mapper for size/segments, Capability Auditor for technical capabilities, Strategy Decoder for business models, Innovation Scout for R&D/patents, Customer Advocate for satisfaction/loyalty, Financial Analyst for revenue/funding, Talent Tracker for key personnel, Vulnerability Assessor for weaknesses/risks), 2) The research directory path where they should save their findings, 3) Instructions to write a detailed report in their assigned subdirectory. These agents work with fresh context and won't pollute the main context window.",
      3: "Deep competitive analysis: Create multi-dimensional positioning matrices, map customer journeys vs competitors, assess barriers to entry, document competitive responses to market changes.",
      4: "Innovation and disruption assessment: Analyze patent landscapes, track R&D investments, identify emerging technologies, model disruption scenarios.",
      5: "Game theory modeling: Develop strategic interaction models, predict competitor responses, identify Nash equilibria, plan counter-strategies.",
      6: "Vulnerability and opportunity mapping: Document competitor weaknesses, identify acquisition targets, assess partnership opportunities.",
      7: "Synthesize intelligence into strategic playbook with specific action plans, response strategies, and monitoring systems.",
    },
  },

  academia: {
    1: {
      // Shallow - Quick literature scan
      1: "Define research question and scope. Use parallel searches across: Google Scholar, arXiv, and recent publications.",
      2: "Rapid literature scan. Deploy parallel searches for: key papers, recent reviews, and major contributors.",
      3: "Identify theoretical frameworks. Quick search for: established theories, methodologies, and research gaps.",
      4: "Synthesize findings into literature summary with key citations and research opportunities.",
    },
    2: {
      // Medium - Systematic literature review
      1: "Establish research framework. Define research questions, inclusion/exclusion criteria, and quality assessment methods.",
      2: "Comprehensive database search. Deploy 2-3 agents in parallel to search: academic databases, preprint servers, and conference proceedings. Provide research directory for saving papers and notes.",
      3: "Theoretical framework analysis. Map competing theories, methodological approaches, and epistemological positions.",
      4: "Evidence synthesis. Conduct thematic analysis, identify patterns, assess evidence quality, and document contradictions.",
      5: "Research gap identification. Map unexplored areas, methodological limitations, and future research directions.",
      6: "Produce systematic review with methodology documentation, evidence tables, and research agenda.",
    },
    3: {
      // Deep - Multi-method evidence triangulation
      1: "Infrastructure setup: Create quantitative-evidence, qualitative-evidence, observational-evidence, triangulation-analysis directories in research folder. Write evidence-framework.md with quality thresholds, bias sources, and confidence calculations.",
      2: "Deploy 6 evidence specialists in parallel using the Task tool. Give each agent: 1) Their specific focus (Quantitative Analyst for surveys/experiments/meta-analyses, Ethnographer for observation/cultural analysis, Archivist for historical records/documents, Network Mapper for social networks/influence, Behaviorist for usage data/preferences, Validator for cross-checking/auditing), 2) The research directory path, 3) Instructions to gather evidence and write detailed reports in their subdirectory. Agents work independently without polluting main context.",
      3: "Multi-method data collection: Each finding requires 2+ evidence types, document methodology limitations, create confidence intervals, establish inter-rater reliability.",
      4: "Triangulation analysis: Build contradiction matrices, resolve conflicting evidence, assess convergent validity, calculate composite confidence scores.",
      5: "Meta-synthesis: Integrate quantitative and qualitative findings, develop unified theoretical model, identify boundary conditions.",
      6: "Produce comprehensive research report with full methodology, evidence audit trail, and confidence-rated conclusions.",
    },
  },

  technology: {
    1: {
      // Shallow - Quick tech assessment
      1: "Define technology scope and objectives. Use parallel searches for: GitHub repos, recent releases, and basic documentation.",
      2: "Rapid technology scan. Search for: popular implementations, key features, and common use cases.",
      3: "Quick feasibility check. Assess: technical requirements, learning curve, and community support.",
      4: "Summarize findings with implementation recommendations and risk assessment.",
    },
    2: {
      // Medium - Technology evaluation
      1: "Technology landscape mapping. Document ecosystem, standards, competing solutions, and adoption patterns.",
      2: "Technical deep-dive. Deploy 2-3 agents in parallel: one for architecture/performance analysis, one for security assessment, one for community/ecosystem research. Provide research directory path.",
      3: "Implementation analysis. Review: case studies, best practices, common pitfalls, and migration strategies.",
      4: "Community and support assessment. Evaluate: documentation quality, community activity, commercial support, and long-term viability.",
      5: "Cost-benefit analysis. Calculate: TCO, ROI, opportunity costs, and switching costs.",
      6: "Produce technology evaluation report with decision matrix and implementation roadmap.",
    },
    3: {
      // Deep - Innovation archaeology workflow
      1: "Infrastructure setup: Create innovation-history, failed-attempts, adjacent-breakthroughs, innovation-patterns directories in research folder. Write innovation-charter.md with success criteria, time periods, and prediction methodologies.",
      2: "Deploy 6 innovation archaeologists in parallel using the Task tool. Give each agent: 1) Their focus area (Patent Explorer for IP landscapes/genealogies, Academic Bridge for university research/tech transfer, Startup Mapper for venture funding/pivots, Corporate Tracker for R&D/acquisitions, Open Source Investigator for community innovations, Cross-Pollinator for adjacent industries/biomimicry), 2) Research directory path, 3) Instructions to investigate deeply and write comprehensive reports. Agents maintain separate context for deep research.",
      3: "Innovation genealogy mapping: Trace technology evolution, document failed attempts, identify success patterns, map diffusion pathways.",
      4: "Cross-domain pattern analysis: Find analogous innovations, identify transferable principles, discover convergent evolution patterns.",
      5: "Future innovation modeling: Predict breakthrough timing, assess market readiness, identify enabling technologies, model adoption curves.",
      6: "Innovation opportunity identification: Create opportunity matrices, prioritize development paths, design innovation portfolio.",
      7: "Compile innovation strategy with historical insights, pattern-based predictions, and actionable innovation roadmap.",
    },
  },

  stakeholder: {
    1: {
      // Shallow - Quick stakeholder scan
      1: "Identify primary stakeholders. Use parallel searches to find: key decision makers, direct users, and major influencers.",
      2: "Basic stakeholder mapping. Quick assessment of: interests, influence levels, and stated positions.",
      3: "Simple impact analysis. Evaluate: who benefits, who loses, and potential conflicts.",
      4: "Create stakeholder summary with engagement priorities.",
    },
    2: {
      // Medium - Stakeholder analysis
      1: "Comprehensive stakeholder identification. Map all direct and indirect stakeholders across the ecosystem.",
      2: "Power-influence matrix creation. Deploy 2-3 agents in parallel to research different stakeholder groups and their influence. Provide research directory.",
      3: "Stakeholder journey mapping. Document touchpoints, pain points, and value exchanges.",
      4: "Conflict and synergy analysis. Identify opposing interests, potential coalitions, and win-win opportunities.",
      5: "Engagement strategy development. Create targeted communication and involvement plans.",
      6: "Produce stakeholder analysis report with influence diagrams and engagement roadmap.",
    },
    3: {
      // Deep - Stakeholder impact mapping workflow
      1: "Infrastructure setup: Create stakeholder-profiles, impact-matrices, tension-maps directories in research folder. Write stakeholder-charter.md with power-influence matrices, success definitions, and resource flows.",
      2: "Deploy 6 stakeholder specialists in parallel using the Task tool. Give each agent: 1) Their stakeholder focus (Power Broker for decision makers/authorities, End User for beneficiaries/customers, Infrastructure Owner for platforms/gatekeepers, Ecosystem Participant for partners/suppliers, External Observer for media/analysts, Unintended Recipient for spillover communities), 2) Research directory path, 3) Instructions to profile stakeholders deeply and document findings. Fresh context for each agent ensures thorough research.",
      3: "Deep stakeholder profiling: Map current positions, identify hidden motivations, document historical relationships, assess resource availability.",
      4: "Multi-dimensional impact assessment: Create impact matrices across economic/social/political dimensions, model cascade effects.",
      5: "Coalition and opposition modeling: Predict alliance formations, identify veto players, design consensus strategies.",
      6: "Resource and dependency mapping: Trace resource flows, identify critical dependencies, assess leverage points.",
      7: "Synthesize into stakeholder strategy with detailed profiles, influence pathways, and engagement playbooks.",
    },
  },

  risk: {
    1: {
      // Shallow - Quick risk assessment
      1: "Identify obvious risks. Use parallel searches to find: common failure modes, recent incidents, and known vulnerabilities.",
      2: "Basic risk categorization. Quick assessment of: technical, market, operational, and regulatory risks.",
      3: "Simple mitigation planning. Identify: quick wins, critical controls, and escalation triggers.",
      4: "Create risk register with priority actions.",
    },
    2: {
      // Medium - Risk analysis
      1: "Systematic risk identification. Use multiple frameworks to identify risks across all dimensions.",
      2: "Risk probability and impact assessment. Deploy 2-3 agents in parallel to analyze different risk categories (technical, operational, strategic). Provide research directory.",
      3: "Risk interaction analysis. Identify correlations, amplification effects, and cascade potential.",
      4: "Mitigation strategy development. Design preventive and responsive controls for key risks.",
      5: "Monitoring system design. Define KRIs, thresholds, and early warning indicators.",
      6: "Produce risk assessment report with heat maps and mitigation plans.",
    },
    3: {
      // Deep - Systemic risk assessment workflow
      1: "Infrastructure setup: Create risk-inventory, failure-modes, cascade-effects, mitigation-strategies directories in research folder. Write risk-charter.md with tolerance levels, assessment criteria, and monitoring requirements.",
      2: "Deploy 7 risk specialists in parallel using the Task tool. Give each agent: 1) Their risk domain (Failure Investigator for historical failures/lessons, Complexity Theorist for emergent risks/dynamics, Black Swan Hunter for tail risks, Human Factors Analyst for behavioral risks/biases, Interdependency Mapper for system connections, Resilience Engineer for adaptation/recovery, Monitoring Specialist for early warning/alerts), 2) Research directory path, 3) Instructions to analyze risks comprehensively and document findings. Separate contexts prevent information overload.",
      3: "Multi-dimensional risk mapping: Create heat maps across probability/impact/velocity dimensions, model risk correlations.",
      4: "System dynamics modeling: Map risk propagation pathways, identify amplification mechanisms, assess domino effects.",
      5: "Scenario-based stress testing: Develop extreme scenarios, conduct war games, test breaking points.",
      6: "Antifragility design: Create adaptive responses, build redundancy, design graceful degradation.",
      7: "Compile comprehensive risk framework with real-time monitoring dashboard, response playbooks, and crisis management protocols.",
    },
  },

  temporal: {
    1: {
      // Shallow - Quick timeline analysis
      1: "Identify key time horizons. Quick search for: historical precedents, current trends, and near-term projections.",
      2: "Basic pattern recognition. Use parallel searches to find: cycles, growth rates, and recent changes.",
      3: "Simple future projection. Extrapolate current trends and identify potential inflection points.",
      4: "Create timeline summary with key milestones and trend indicators.",
    },
    2: {
      // Medium - Temporal analysis
      1: "Historical pattern analysis. Map cycles, identify recurring patterns, and document precedents.",
      2: "Change dynamics assessment. Deploy 2-3 agents in parallel to analyze: historical patterns, current momentum, and future scenarios. Provide research directory.",
      3: "Multi-horizon planning. Develop scenarios for 1, 5, and 10-year timeframes.",
      4: "Leading indicator identification. Find early signals and predictive metrics.",
      5: "Timing optimization. Identify windows of opportunity and critical timing factors.",
      6: "Produce temporal analysis with timeline visualizations and scenario projections.",
    },
    3: {
      // Deep - Temporal dynamics workflow
      1: "Infrastructure setup: Create historical-cycles, change-agents, momentum-analysis, future-scenarios directories in research folder. Write temporal-charter.md with time horizons, change indicators, and scenario parameters.",
      2: "Deploy 7 temporal investigators in parallel using the Task tool. Give each agent: 1) Their temporal focus (Cycle Hunter for patterns/seasons/generations, Momentum Tracker for adoption/growth/tipping points, Catalyst Analyst for triggers/breakthroughs, Decay Specialist for decline/obsolescence, Lag Investigator for delayed effects/downstream impacts, Scenario Architect for future pathways/probabilities, Signal Detector for early indicators/weak signals), 2) Research directory path, 3) Instructions to analyze temporal dynamics and write detailed reports. Independent contexts ensure comprehensive temporal analysis.",
      3: "Multi-scale temporal mapping: Analyze across multiple time scales simultaneously, identify phase transitions.",
      4: "Change dynamics modeling: Map S-curves, identify inflection points, calculate time constants, model diffusion rates.",
      5: "Causal lag analysis: Identify delayed effects, trace long-term consequences, map feedback loops with delays.",
      6: "Future scenario development: Create multiple pathways, assign probabilities, identify branch points, design contingencies.",
      7: "Synthesize temporal strategy with detailed timelines, early warning systems, and adaptive timing plans.",
    },
  },

  innovation: {
    1: {
      // Shallow - Quick innovation scan
      1: "Identify innovation landscape. Use parallel searches for: recent breakthroughs, emerging technologies, and startup activity.",
      2: "Basic pattern recognition. Quick search for: successful innovations, failure patterns, and adoption rates.",
      3: "Innovation opportunity spotting. Identify: unmet needs, technology gaps, and convergence opportunities.",
      4: "Create innovation summary with opportunities and quick-win recommendations.",
    },
    2: {
      // Medium - Innovation analysis
      1: "Innovation ecosystem mapping. Document: key players, funding flows, research centers, and innovation hubs.",
      2: "Technology readiness assessment. Deploy 2-3 agents in parallel to evaluate: maturity levels, adoption barriers, and enabling factors across different innovation areas. Provide research directory.",
      3: "Innovation pattern analysis. Study: successful models, failure modes, and timing factors.",
      4: "Cross-domain opportunity identification. Find: analogous solutions, transferable technologies, and convergence points.",
      5: "Innovation portfolio design. Balance: incremental vs radical, time horizons, and risk levels.",
      6: "Produce innovation report with opportunity matrix and development roadmap.",
    },
    3: {
      // Deep - Full innovation archaeology (same as technology depth 3)
      1: "Infrastructure setup: Create innovation-history, failed-attempts, adjacent-breakthroughs, innovation-patterns directories in research folder. Write innovation-charter.md with success criteria, investigation domains, and breakthrough predictions.",
      2: "Deploy 6 innovation archaeologists in parallel using the Task tool. Give each agent: 1) Their innovation research area (Patent Explorer for IP landscapes/genealogies, Academic Bridge for university research/tech transfer, Startup Mapper for venture funding/pivots, Corporate Tracker for R&D/acquisitions, Open Source Investigator for community innovations, Cross-Pollinator for adjacent industries/biomimicry), 2) Research directory path, 3) Instructions to investigate innovation patterns and document findings comprehensively. Parallel agents preserve context efficiency.",
      3: "Innovation genealogy mapping: Trace technology evolution, document failed attempts, identify success patterns, map diffusion pathways.",
      4: "Cross-domain pattern analysis: Find analogous innovations, identify transferable principles, discover convergent evolution patterns.",
      5: "Future innovation modeling: Predict breakthrough timing, assess market readiness, identify enabling technologies, model adoption curves.",
      6: "Innovation opportunity identification: Create opportunity matrices, prioritize development paths, design innovation portfolio.",
      7: "Compile innovation strategy with historical insights, pattern-based predictions, and actionable innovation roadmap.",
    },
  },

  evidence: {
    1: {
      // Shallow - Quick evidence gathering
      1: "Define evidence requirements. Use parallel searches to gather: published studies, expert opinions, and case examples.",
      2: "Rapid evidence collection. Search for: quantitative data, qualitative insights, and anecdotal evidence.",
      3: "Basic validation. Cross-check sources, identify contradictions, and assess credibility.",
      4: "Create evidence summary with key findings and confidence levels.",
    },
    2: {
      // Medium - Evidence synthesis
      1: "Systematic evidence gathering. Use multiple search strategies across diverse sources.",
      2: "Quality assessment. Deploy 2-3 agents in parallel to evaluate different evidence types: quantitative studies, qualitative research, and case studies. Provide research directory.",
      3: "Evidence triangulation. Compare findings across different methods and sources.",
      4: "Contradiction resolution. Analyze conflicting evidence and identify reasons for discrepancies.",
      5: "Confidence scoring. Assign confidence levels based on evidence quality and convergence.",
      6: "Produce evidence report with quality assessments and synthesis conclusions.",
    },
    3: {
      // Deep - Evidence triangulation workflow
      1: "Infrastructure setup: Create quantitative-evidence, qualitative-evidence, observational-evidence, triangulation-analysis directories in research folder. Write evidence-framework.md with quality thresholds, bias identification, and confidence calculations.",
      2: "Deploy 6 evidence specialists in parallel using the Task tool. Give each agent: 1) Their evidence specialty (Quantitative Analyst for surveys/experiments/meta-analyses, Ethnographer for observation/cultural analysis, Archivist for historical records/documents, Network Mapper for social networks/influence, Behaviorist for usage data/preferences, Validator for cross-checking/auditing), 2) Research directory path, 3) Instructions to gather and validate evidence, writing detailed reports. Multiple agents ensure comprehensive evidence collection without context pollution.",
      3: "Multi-method evidence collection: Require 2+ evidence types per finding, document limitations, create confidence intervals.",
      4: "Systematic triangulation: Build contradiction matrices, resolve conflicts, assess convergent validity, calculate composite confidence.",
      5: "Meta-level analysis: Identify systematic biases, assess evidence gaps, evaluate overall certainty.",
      6: "Evidence integration: Synthesize across all sources, weight by quality, produce unified conclusions.",
      7: "Compile comprehensive evidence dossier with full audit trail, confidence ratings, and methodology documentation.",
    },
  },

  persona: {
    1: {
      // Shallow - Quick perspective check
      1: "Identify key perspectives. Use parallel searches to gather views from: users, experts, and critics.",
      2: "Rapid perspective collection. Quick searches for different viewpoints and opinions.",
      3: "Basic synthesis. Identify common themes and major disagreements.",
      4: "Create perspective summary with key insights from different viewpoints.",
    },
    2: {
      // Medium - Multi-perspective analysis
      1: "Define perspective framework. Identify all relevant viewpoints and their importance.",
      2: "Systematic perspective gathering. Deploy 2-3 agents in parallel to research different stakeholder perspectives. Provide research directory.",
      3: "Perspective deep-dive. Understand motivations, constraints, and mental models.",
      4: "Cross-perspective analysis. Identify alignments, conflicts, and blind spots.",
      5: "Integrated understanding. Synthesize insights across all perspectives.",
      6: "Produce multi-perspective report with viewpoint matrix and integration insights.",
    },
    3: {
      // Deep - Multi-persona perspective workflow
      1: "Infrastructure setup: Create persona-findings and synthesis directories in research folder. Write objective.md with research questions, evidence standards, and bias guards.",
      2: "Deploy 8 research personas in parallel using the Task tool. Give each agent: 1) Their persona role (Historian for evolution/failures/alternatives, Contrarian for disconfirming evidence/critiques, Analogist for cross-domain parallels, Systems Thinker for second-order effects/stakeholders, Journalist for current state/key players, Archaeologist for past solutions worth revisiting, Futurist for patents/speculation/predictions, Negative Space Explorer for what's NOT discussed/barriers), 2) Research directory path, 3) Instructions to investigate from their perspective using 8-10 parallel searches, apply SCAMPER for query variation, and document findings with confidence ratings. Each agent maintains independent context for deep perspective analysis.",
      3: "Deep persona investigations: Each uses 8-10 parallel searches, applies SCAMPER for query variation, documents with confidence ratings.",
      4: "Cross-persona pattern analysis: Identify recurring themes, surface contradictions, find unexpected connections.",
      5: "Perspective integration: Weight insights by evidence quality, resolve conflicts, identify blind spots.",
      6: "Meta-perspective synthesis: Understand why different personas see different things, identify systematic biases.",
      7: "Compile multi-perspective intelligence report with full persona insights, integration analysis, and confidence-weighted conclusions.",
    },
  },
};

function getDefaultStep(
  researchType: string,
  depth: number,
  stepNumber: number
): string {
  const depthLabel = depth === 1 ? "shallow" : depth === 2 ? "medium" : "deep";
  return `${
    researchType.charAt(0).toUpperCase() + researchType.slice(1)
  } Research (${depthLabel}) - Step ${stepNumber}: Continue with domain-specific investigation following established patterns.`;
}

export function registerResearchStrategyTools(server: McpServer) {
  server.tool(
    "get-research-strategy",
    "Get research strategy based on type, depth, and step number. **ALWAYS USE THIS TOOL FIRST when starting a new research project, even before making a todo list.**",
    {
      researchType: z
        .enum([
          "market",
          "academia",
          "technology",
          "stakeholder",
          "risk",
          "temporal",
          "innovation",
          "evidence",
          "persona",
        ])
        .describe(
          "Type of research - market, academia, technology, stakeholder, risk, temporal, innovation, evidence, or persona"
        ),
      depth: z
        .number()
        .int()
        .min(1)
        .max(3)
        .describe(
          "Depth of research - 1 for shallow (quick parallel searches), 2 for medium (structured analysis), 3 for deep (full workflow with infrastructure setup and specialized agents)"
        ),
      stepNumber: z
        .number()
        .int()
        .positive()
        .describe("Step number in the research process"),
      researchDirectory: z
        .string()
        .describe("Directory where research files should be saved"),
    },
    async ({ researchType, depth, stepNumber, researchDirectory }) => {
      // Update the stored research directory if provided
      if (researchDirectory) {
        currentResearchDirectory = path.resolve(researchDirectory);
      }

      // Use provided directory, stored directory, or default to ~/research
      const researchDir =
        currentResearchDirectory || path.join(os.homedir(), "research");
      currentResearchDirectory = researchDir;

      let strategy =
        researchStrategies[researchType]?.[depth]?.[stepNumber] ||
        getDefaultStep(researchType, depth, stepNumber);

      // Replace references to directories with the actual research directory path
      strategy = strategy.replace(
        /Create ([\w-]+(?:, [\w-]+)*) directories in research folder/g,
        `Create these directories in ${researchDir}: $1`
      );

      // Add information about the research directory
      const directoryInfo = `Research directory: ${researchDir}\n\n`;

      return {
        content: [
          {
            type: "text" as const,
            text:
              "Make a new todo list based on these instructions:\n\n" +
              strategy +
              "\n\n" +
              "Do nothing else other than what was described in this step. Afterwards, use this tool again with the next step. Make sure to always call this tool again. This _must_ be the last step in your todo list.",
          },
        ],
      };
    }
  );
}
