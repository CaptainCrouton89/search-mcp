# Multi-Agent Collaboration Quantitative Evidence

## Theory of Mind Collaboration Results

### Performance Metrics (Li et al., 2023)
- **GPT-4 Team Score**: 90±0.0 (perfect mission completion)
- **GPT-4 Completion Time**: 28.3±2.6 rounds
- **GPT-4 + Belief State**: 12.3±2.0 rounds (57% improvement)
- **Valid Action Rate**: 86.1% (vs 71.8% without belief state)

### Baseline Comparisons
- **MAPPO (MARL)**: 90±0.0 score, 11.0±0.0 rounds
- **CBS Planner**: 90±0.0 score, 6.0±0.0 rounds (optimal)
- **ChatGPT**: 43±4.7 score, 30.0±0.0 rounds (timeout)

## Scaling Multi-Agent Collaboration (Qian et al., 2024)

### MacNet Performance Across Topologies
- **Chain topology**: Consistent improvements over single agents
- **Irregular topologies**: Outperform regular topologies
- **Scaling capability**: Supports 1000+ agents effectively

### Collaborative Scaling Law
- **Growth Pattern**: Logistic growth with agent scaling
- **Emergence Point**: Earlier than traditional neural emergence
- **Performance Gains**: Sustained improvements with network size

### Memory Control Efficiency
- **Context Complexity**: O(n) vs O(n²) without memory control
- **Token Reduction**: Linear vs quadratic growth in context length
- **Scalability**: Enables much larger agent networks

## Group Decision Making (Alsobay et al., 2025)

### LLM Facilitation Results
- **Information Sharing**: Significant increase with LLM facilitation
- **Engagement**: Minimum engagement levels raised across groups
- **Sample Size**: 1,475 participants, 281 groups
- **Effect Size**: Limited cost in user attitudes toward facilitator

## Confidence Level: HIGH
- Multiple independent studies with large sample sizes
- Consistent methodology across different agent architectures
- Clear performance improvements with statistical significance