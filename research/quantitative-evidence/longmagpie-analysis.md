# LongMagpie Quantitative Evidence

## Performance Metrics

### Long-Context Evaluation Results
- **HELMET**: 62.10 (vs ChatQA 60.23, LongAlign 57.79)
- **RULER**: 91.17 (vs ChatQA 89.82, LongAlign 86.08)  
- **LongBench-v2**: 34.4 (vs ChatQA 30.8, LongAlign 24.5)
- **LongAVG**: 62.56 (vs ChatQA 60.28, LongAlign 56.12)

### Short-Context Performance Maintained
- **ShortAVG**: 62.37 (comparable to baselines ~63-64)

## Key Technical Parameters
- **Document Length**: Average 1.6k tokens
- **Context Extension**: 8K-token training → 128K-token capability
- **Throughput**: 10x improvement with 1/6 memory usage
- **Training**: 1B tokens on Llama-3-8B-NExtLong-512K-Base

## Multi-Document Extension
- Up to n=5 additional documents via random sampling
- Document separator tokens for concatenation
- Cross-document reasoning capability demonstrated

## p-Mix Strategy Effectiveness
- Probabilistic mixing of long and short contexts
- Prevents performance degradation on short tasks
- Maintains competitive short-context performance while achieving SOTA long-context results

## Confidence Level: HIGH
- Peer-reviewed methodology with robust experimental validation
- Clear statistical significance across multiple benchmarks
- Reproducible results with standardized evaluation protocols