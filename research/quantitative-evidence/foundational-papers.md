# Foundational Papers on Instruction Following with LLMs

## High-Quality Quantitative Evidence

### 1. Training Language Models to Follow Instructions with Human Feedback (InstructGPT)
- **Authors:** Ouyang et al., NeurIPS 2022
- **Citations:** 16,888
- **Quality:** High - Peer-reviewed, large-scale evaluation, statistical significance
- **Key Metrics:** Human preference evaluation, safety benchmarks, alignment metrics
- **Context Window:** Standard (up to 4K tokens)
- **Findings:** RLHF significantly improves instruction following capabilities

### 2. Instruction-Following Evaluation for Large Language Models (IFEval)
- **Authors:** Zhou et al., arXiv 2023
- **Citations:** 477
- **Quality:** Medium - Comprehensive benchmark, objective evaluation metrics
- **Key Metrics:** 541 verifiable instructions across 25 types
- **Context Window:** Standard evaluation
- **Findings:** Systematic evaluation framework for instruction following

### 3. Self-Instruct: Aligning Language Models with Self-Generated Instructions
- **Authors:** Wang et al., arXiv 2022
- **Citations:** 2,493
- **Quality:** High - Large synthetic dataset (52K instructions), reproducible
- **Key Metrics:** ROUGE scores, human evaluation on multiple tasks
- **Findings:** Self-generated instruction data can improve instruction following

## Medium-Quality Evidence

### 4. The SIFo Benchmark: Sequential Instruction Following
- **Authors:** Chen et al., EMNLP 2024 Findings
- **Citations:** Recent paper
- **Quality:** Medium - Novel evaluation paradigm, systematic testing
- **Focus:** Multiple sequential instructions, positional bias analysis
- **Context:** Addresses coherence issues in multi-step instruction following

### 5. Evaluating Large Language Models at Evaluating Instruction Following
- **Authors:** Zeng et al., arXiv 2023
- **Citations:** 218
- **Quality:** Medium - Meta-evaluation approach, manual curation
- **Dataset:** 419 manually curated output pairs
- **Focus:** LLM-as-judge for instruction following evaluation

## Recent Developments (2024-2025)

### 6. Phased Instruction Fine-Tuning for Large Language Models
- **Authors:** Pang et al., ACL 2024 Findings
- **Quality:** Medium - Novel training methodology, multiple model sizes tested
- **Approach:** Progressive difficulty training using GPT-4 difficulty assessment
- **Models:** Tested on Llama-2 7B/13B/70B, Llama3 8B/70B, Mistral-7B

### 7. Chain-of-Instructions: Compositional Instruction Tuning
- **Authors:** Hayati et al., AAAI 2025
- **Quality:** Medium - Novel compositional approach
- **Focus:** Multi-step instruction decomposition
- **Evaluation:** Unseen composite tasks, multilingual capabilities