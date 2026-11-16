---
name: dspy-skills
description: >
  This skill should be used when the user asks to "optimize a DSPy program", "build a RAG pipeline", "add reflection", "choose an optimizer", "configure an LLM", "build an agent", "set up evaluation", or mentions any DSPy development task. Routes to the correct specialized DSPy skill based on the task at hand.
version: 0.1.0
---

# DSPy Skills Umbrella

A comprehensive suite of 22 focused skills for building, optimizing, evaluating, and deploying LLM applications with DSPy. This umbrella skill helps identify which specialized skill fits a given task.

## What is DSPy?

DSPy (Demonstrate-Search-Predict) is a framework for building language model programs with structured outputs, retrieval-augmented generation (RAG), reasoning modules, and systematic optimization. The stable baseline is DSPy 3.2.1 (May 5, 2026). Install with:

```bash
pip install -U "dspy>=3.2.1,<3.3"
```

For optional advanced features:

```bash
# Bayesian search for MIPROv2
pip install -U "dspy[optuna]>=3.2.1,<3.3"

# MCP tool integration
pip install -U "dspy[mcp]>=3.2.1,<3.3"

# Large local embedding corpora
pip install faiss-cpu

# optimize_anything
pip install -U "gepa>=0.1.1,<0.2"
```

## Which Skill Should Be Used?

Follow this decision tree to find the right skill for the task.

### Starting a New Project?

Start with the "Start Here" category:

| Skill | Use it for |
|-------|-----------|
| **dspy-signature-designer** | Define typed signatures and structured outputs for prompts |
| **dspy-custom-module-design** | Build reusable `dspy.Module` components and architecture |
| **dspy-evaluation-suite** | Create metrics, establish baselines, and compare program versions |
| **dspy-optimizer-selection** | Understand optimizer families and choose the right one |

### Building Data Pipelines?

Use skills from the "Retrieval and Data" category:

| Skill | Use it for |
|-------|-----------|
| **dspy-rag-pipeline** | RAG systems and multi-hop retrieval pipelines |
| **dspy-embedding-retrieval** | Embedders, FAISS indexes, local corpora, and similarity search |
| **dspy-haystack-integration** | Integrate and optimize Haystack-backed DSPy pipelines |

### Building Agents or Reasoning?

Use skills from the "Agents and Reasoning" category:

| Skill | Use it for |
|-------|-----------|
| **dspy-react-agent-builder** | ReAct tool-using agents |
| **dspy-mcp-tool-integration** | Integrate Model Context Protocol (MCP) tools into DSPy agents |
| **dspy-reasoning-modules** | RLM, ProgramOfThought, CodeAct, and Parallel reasoning |
| **dspy-advanced-module-composition** | Ensembles and complex module composition patterns |

### Optimizing a Program?

Use skills from the "Optimizers" category:

| Skill | Use it for |
|-------|-----------|
| **dspy-bootstrap-fewshot** | Fast few-shot demo bootstrapping to seed programs |
| **dspy-miprov2-optimizer** | Instruction and demo search (Bayesian optimization) |
| **dspy-gepa-reflective** | Reflective instruction optimization and feedback loops |
| **dspy-simba-optimizer** | Mini-batch introspective (SIMBA) optimization |
| **dspy-finetune-bootstrap** | Weight optimization and knowledge distillation |
| **dspy-better-together** | Sequencing prompt and weight optimizers |
| **dspy-optimize-anything** | Apply GEPA optimization to text outside DSPy modules |

### Deploying to Production?

Use skills from the "Production and Interfaces" category:

| Skill | Use it for |
|-------|-----------|
| **dspy-output-refinement-constraints** | Refine outputs with constraints and BestOfN selection |
| **dspy-adapters-multimodal** | Adapters, native tool support, image, audio, and file inputs |
| **dspy-production-deployment** | Cache hardening, save/load, async, streaming, and usage tracking |
| **dspy-debugging-observability** | Inspect program state, callbacks, MLflow tracing, and debugging |

## Typical Workflow

Follow this order for a complete DSPy project:

1. **Define types** → Use `dspy-signature-designer` to create typed signatures and structured outputs
2. **Build foundation** → Use `dspy-custom-module-design` to architect reusable modules
3. **Add data** → Use RAG and embedding skills if the program needs retrieval
4. **Establish baseline** → Use `dspy-evaluation-suite` to measure and compare
5. **Choose optimizer** → Use `dspy-optimizer-selection` to pick the right optimization strategy
6. **Optimize** → Use one or more optimizer skills to improve performance
7. **Deploy** → Use production skills to harden, cache, and monitor

## Common Scenarios and Recommended Skills

### "I want to build a question-answering system"

1. Define a QA signature → `dspy-signature-designer`
2. Add a retrieval component → `dspy-rag-pipeline`
3. Create a metrics baseline → `dspy-evaluation-suite`
4. Optimize the program → `dspy-optimizer-selection` then an optimizer skill

See **references/deep-dive-patterns.md** for complete code examples.

### "I want to add tool use to my program"

1. Design tool signatures → `dspy-signature-designer`
2. Build a ReAct agent → `dspy-react-agent-builder` or `dspy-mcp-tool-integration`
3. Test with metrics → `dspy-evaluation-suite`
4. Deploy safely → `dspy-production-deployment`

See **references/deep-dive-patterns.md** for complete code examples.

### "My model outputs are inconsistent"

1. Measure consistency → `dspy-evaluation-suite`
2. Add constraints → `dspy-output-refinement-constraints`
3. Or optimize prompts → Use an optimizer skill (`dspy-miprov2-optimizer`, `dspy-gepa-reflective`, etc.)

See **references/deep-dive-patterns.md** for complete code examples.

### "I want to optimize an existing program"

1. Establish a metric baseline → `dspy-evaluation-suite`
2. Choose an optimizer → `dspy-optimizer-selection`
3. Apply optimization → Use the chosen optimizer skill
4. Harden for production → `dspy-production-deployment`

See **references/deep-dive-patterns.md** for complete code examples.

### "I need multimodal inputs or file handling"

1. Design signatures for multimodal data → `dspy-signature-designer`
2. Configure adapters → `dspy-adapters-multimodal`
3. Evaluate and optimize → Use evaluation and optimizer skills
4. Deploy with streaming → `dspy-production-deployment`

See **references/deep-dive-patterns.md** for complete code examples.

## When to Use Each Skill

Invoke the appropriate skill based on the current task. If unclear which skill applies:

- **Ask about types or outputs** → `dspy-signature-designer`
- **Ask about modules or architecture** → `dspy-custom-module-design`
- **Ask about retrieval or embeddings** → An RAG/embedding skill from "Retrieval and Data"
- **Ask about agents or tools** → An agent skill from "Agents and Reasoning"
- **Ask about improving performance** → `dspy-optimizer-selection` or an optimizer skill
- **Ask about production concerns** → A production skill from "Production and Interfaces"
- **Ask about metrics or evaluation** → `dspy-evaluation-suite`

## Key Concepts Across Skills

All DSPy skills assume familiarity with:

- **Modules**: Functions that execute prompt templates with structured I/O
- **Signatures**: Typed definitions of module inputs and outputs (input fields → output fields)
- **Optimizers**: Tools that improve program performance by adjusting prompts or weights
- **Retrievers**: Components that fetch relevant context for RAG pipelines
- **Metrics**: Measurable evaluation criteria for program quality

### Quick Concept Examples

**Signature (input → output contract):**
```python
class GenerateAnswer(dspy.Signature):
    """Given a question and context, generate a concise answer."""
    question: str = dspy.InputField()
    context: str = dspy.InputField()
    answer: str = dspy.OutputField()
```

**Module (reusable component):**
```python
class RAGSystem(dspy.Module):
    def __init__(self, num_passages=3):
        super().__init__()
        self.retrieve = dspy.Retrieve(k=num_passages)
        self.generate_answer = dspy.ChainOfThought(GenerateAnswer)
    
    def forward(self, question):
        context = self.retrieve(question).passages
        return self.generate_answer(question=question, context=context)
```

**Metric (evaluation criterion):**
```python
def answer_match(gold_answer, pred_answer, trace=None):
    """True if predicted answer matches gold answer exactly."""
    return pred_answer.lower() == gold_answer.lower()
```

**Optimizer (improvement strategy):**
```python
from dspy.teleprompt import BootstrapFewShot
optimizer = BootstrapFewShot(metric=answer_match, max_bootstrapped_demos=4)
optimized_program = optimizer.compile(program, trainset=train_examples)
```

## Additional Resources

- **DSPy Framework Guide**: https://github.com/stanfordnlp/dspy
- **DSPy Official Documentation**: https://dspy-docs.vercel.app/
- **DSPy Releases**: https://github.com/stanfordnlp/dspy/releases
- **GitHub repo with all 22 skills**: https://github.com/OmidZamani/dspy-skills

## Error Handling and Common Issues

### "I don't know which optimizer to use"

Invoke `dspy-optimizer-selection`. It explains each optimizer family and when to use each.

### "My RAG pipeline is slow or inaccurate"

Use `dspy-rag-pipeline` to redesign retrieval, or `dspy-embedding-retrieval` to refine embedders and indexes.

### "I need to serialize and load my program"

Invoke `dspy-production-deployment`. It covers save/load patterns and caching.

### "I want to use local models or custom endpoints"

Most DSPy skills assume language models are configured via `dspy.settings.configure`. See the specific skill for LM configuration examples.

## Next Steps

1. Identify the task from the scenarios above
2. Invoke the recommended skill
3. Follow the skill's guidance to completion
4. Move to the next skill in the typical workflow

---

**All 22 DSPy skills are specialized, self-contained guides.** This umbrella skill routes to the right one based on your current need.
