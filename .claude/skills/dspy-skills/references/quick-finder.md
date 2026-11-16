# Quick Skill Finder

Use this guide to instantly identify which DSPy skill to invoke.

## Minimal Working Examples by Task

### "I need to define what my module should do"

```python
class MyTask(dspy.Signature):
    """One-line description of the task."""
    input: str = dspy.InputField()
    output: str = dspy.OutputField()
```
→ **Use `dspy-signature-designer`**

### "I need to build the actual module"

```python
class MyModule(dspy.Module):
    def __init__(self):
        super().__init__()
        self.task = dspy.ChainOfThought(MyTask)
    
    def forward(self, input):
        return self.task(input=input)
```
→ **Use `dspy-custom-module-design`**

### "I need to measure if it's working"

```python
def accuracy_metric(gold, pred):
    return gold["output"] == pred.output

score = dspy.evaluate.Evaluate(
    devset=test_data, 
    metric=accuracy_metric
)(module)
```
→ **Use `dspy-evaluation-suite`**

### "I need to make it better"

```python
from dspy.teleprompt import BootstrapFewShot

optimizer = BootstrapFewShot(metric=accuracy_metric)
optimized = optimizer.compile(module, trainset=train_data)
```
→ **Use `dspy-optimizer-selection` then an optimizer skill**

### "I need documents/context"

```python
class QA(dspy.Signature):
    question: str
    context: str
    answer: str

class RAG(dspy.Module):
    def __init__(self):
        self.retrieve = dspy.Retrieve(k=3)
        self.qa = dspy.ChainOfThought(QA)
    
    def forward(self, question):
        context = self.retrieve(question).passages
        return self.qa(question=question, context=context)
```
→ **Use `dspy-rag-pipeline` or `dspy-embedding-retrieval`**

### "I need tools or actions"

```python
class ReAct(dspy.Signature):
    thought: str
    action: str  # tool name
    action_input: str

agent = ReActAgent(tools={"search": search, "calc": calc})
```
→ **Use `dspy-react-agent-builder` or `dspy-mcp-tool-integration`**

## One-Minute Decision Tree

Start here and follow the branches:

### Is this about defining inputs/outputs or types?
→ **YES** → `dspy-signature-designer`
→ **NO** → Go to next question

### Is this about the overall architecture or module design?
→ **YES** → `dspy-custom-module-design`
→ **NO** → Go to next question

### Is this about measuring quality or establishing baselines?
→ **YES** → `dspy-evaluation-suite`
→ **NO** → Go to next question

### Is this about retrieval, embeddings, or search?
→ **YES** → Choose from:
  - General RAG pipelines → `dspy-rag-pipeline`
  - Embedders or FAISS → `dspy-embedding-retrieval`
  - Haystack integration → `dspy-haystack-integration`
→ **NO** → Go to next question

### Is this about agents, tools, or reasoning?
→ **YES** → Choose from:
  - Tool-using agents → `dspy-react-agent-builder`
  - MCP tools → `dspy-mcp-tool-integration`
  - Reasoning modules (RLM, CodeAct) → `dspy-reasoning-modules`
  - Ensembles or complex composition → `dspy-advanced-module-composition`
→ **NO** → Go to next question

### Is this about improving performance or optimization?
→ **YES** → Choose from:
  - Which optimizer to use → `dspy-optimizer-selection`
  - Fast bootstrapping → `dspy-bootstrap-fewshot`
  - Instruction + demo search → `dspy-miprov2-optimizer`
  - Reflective optimization → `dspy-gepa-reflective`
  - Mini-batch introspection → `dspy-simba-optimizer`
  - Weight optimization → `dspy-finetune-bootstrap`
  - Combined approach → `dspy-better-together`
  - Text optimization outside DSPy → `dspy-optimize-anything`
→ **NO** → Go to next question

### Is this about production, deployment, or monitoring?
→ **YES** → Choose from:
  - Output constraints or refinement → `dspy-output-refinement-constraints`
  - Multimodal, adapters, or native tools → `dspy-adapters-multimodal`
  - Deployment, caching, async, streaming → `dspy-production-deployment`
  - Debugging, callbacks, tracing → `dspy-debugging-observability`

## Phrase-Based Lookup

Find the skill by your question:

### I want to...

| Phrase | Skill |
|--------|-------|
| define what my module inputs/outputs are | `dspy-signature-designer` |
| design the module's logic and structure | `dspy-custom-module-design` |
| measure program quality or success | `dspy-evaluation-suite` |
| understand which optimizer to use | `dspy-optimizer-selection` |
| fetch documents or search a corpus | `dspy-rag-pipeline` |
| use embeddings or FAISS indexes | `dspy-embedding-retrieval` |
| connect to Haystack | `dspy-haystack-integration` |
| build an agent with tools | `dspy-react-agent-builder` |
| integrate MCP tools | `dspy-mcp-tool-integration` |
| use reasoning modules | `dspy-reasoning-modules` |
| combine multiple modules or models | `dspy-advanced-module-composition` |
| quickly bootstrap examples | `dspy-bootstrap-fewshot` |
| search instructions and demos | `dspy-miprov2-optimizer` |
| use model reflection to improve | `dspy-gepa-reflective` |
| run mini-batch optimization | `dspy-simba-optimizer` |
| finetune a model or distill | `dspy-finetune-bootstrap` |
| combine prompts and weights | `dspy-better-together` |
| optimize text outside DSPy | `dspy-optimize-anything` |
| add output constraints | `dspy-output-refinement-constraints` |
| handle images, audio, or files | `dspy-adapters-multimodal` |
| deploy, cache, or stream | `dspy-production-deployment` |
| inspect or debug my program | `dspy-debugging-observability` |

## Skill Lookup by Problem

### I have a performance problem...

**Problem: My model outputs are inconsistent**
→ `dspy-output-refinement-constraints` (add structure)
→ Or use an optimizer skill (improve prompt stability)

**Problem: My retrieval quality is poor**
→ `dspy-embedding-retrieval` (improve embeddings/index)
→ Or `dspy-rag-pipeline` (redesign retrieval)

**Problem: My agent doesn't use tools**
→ `dspy-react-agent-builder` (review agent design)
→ Or `dspy-reasoning-modules` (add reasoning)

**Problem: My program is slow**
→ `dspy-production-deployment` (add caching)
→ Or `dspy-adapters-multimodal` (check for inefficiency)

**Problem: My program quality hasn't improved after optimization**
→ `dspy-optimizer-selection` (try different optimizer)
→ Or `dspy-custom-module-design` (consider redesign)

### I'm building a new feature...

**Feature: Question answering system**
1. `dspy-signature-designer` - Q&A signature
2. `dspy-rag-pipeline` - Add retrieval
3. `dspy-evaluation-suite` - Measure quality
4. An optimizer skill - Improve

**Feature: Classification model**
1. `dspy-signature-designer` - Classification signature
2. `dspy-custom-module-design` - Simple classifier module
3. `dspy-evaluation-suite` - Measure accuracy
4. An optimizer skill - Improve

**Feature: Agentic reasoning task**
1. `dspy-signature-designer` - Thought/action signatures
2. `dspy-react-agent-builder` - Build agent
3. `dspy-evaluation-suite` - Measure task completion
4. An optimizer skill - Improve

**Feature: Multi-hop knowledge search**
1. `dspy-signature-designer` - Query and reasoning signatures
2. `dspy-rag-pipeline` - Multi-hop retrieval
3. `dspy-reasoning-modules` - Add RLM
4. `dspy-evaluation-suite` - Measure accuracy
5. An optimizer skill - Improve each hop

**Feature: Multimodal system**
1. `dspy-signature-designer` - Multimodal input/output
2. `dspy-adapters-multimodal` - Configure adapters
3. `dspy-evaluation-suite` - Measure quality
4. An optimizer skill - Improve

## Skill Dependency Graph

Some skills build on others. If unsure, follow these chains:

### RAG Pipeline Chain
`dspy-signature-designer` → `dspy-rag-pipeline` → `dspy-embedding-retrieval` → `dspy-evaluation-suite` → `dspy-optimizer-selection`

### Agent Chain
`dspy-signature-designer` → `dspy-react-agent-builder` → `dspy-evaluation-suite` → `dspy-optimizer-selection`

### Optimization Chain
`dspy-evaluation-suite` → `dspy-optimizer-selection` → (pick optimizer) → `dspy-production-deployment`

### Multimodal Chain
`dspy-signature-designer` → `dspy-adapters-multimodal` → `dspy-custom-module-design` → `dspy-evaluation-suite` → `dspy-optimizer-selection`

## Skill Categories at a Glance

### Start Here (5 skills)
- `dspy-signature-designer`
- `dspy-custom-module-design`
- `dspy-evaluation-suite`
- `dspy-optimizer-selection`
- (implied foundation for all others)

### Retrieval and Data (3 skills)
- `dspy-rag-pipeline`
- `dspy-embedding-retrieval`
- `dspy-haystack-integration`

### Agents and Reasoning (4 skills)
- `dspy-react-agent-builder`
- `dspy-mcp-tool-integration`
- `dspy-reasoning-modules`
- `dspy-advanced-module-composition`

### Optimizers (7 skills)
- `dspy-bootstrap-fewshot`
- `dspy-miprov2-optimizer`
- `dspy-gepa-reflective`
- `dspy-simba-optimizer`
- `dspy-finetune-bootstrap`
- `dspy-better-together`
- `dspy-optimize-anything`

### Production and Interfaces (3 skills)
- `dspy-output-refinement-constraints`
- `dspy-adapters-multimodal`
- `dspy-production-deployment`
- `dspy-debugging-observability`

## Typical Project Timeline

| Stage | Skills to Invoke |
|-------|-----------------|
| **Exploration** | `dspy-signature-designer` → `dspy-custom-module-design` |
| **Baseline** | `dspy-evaluation-suite` |
| **Enhancement** | Domain skills (RAG, agents, reasoning) |
| **Optimization** | `dspy-optimizer-selection` → Optimizer skills |
| **Production** | `dspy-production-deployment` + `dspy-debugging-observability` |

## Conflict Resolution

**What if two skills seem relevant?**

Use the "specificity rule": Pick the more specific skill.

- Optimization question? → Use optimizer skill, not generic `dspy-optimizer-selection`
- Retrieval question? → Use specific skill (`dspy-rag-pipeline` or `dspy-embedding-retrieval`), not generic
- Agent question? → Use specific skill (`dspy-react-agent-builder` or `dspy-mcp-tool-integration`), not generic

## When to Loop Back

After invoking a skill, you may need to return to an earlier skill:

- Invoke skill, realize the signature is wrong → Loop back to `dspy-signature-designer`
- Invoke optimizer, realize the metric is wrong → Loop back to `dspy-evaluation-suite`
- Invoke production skill, realize the program structure is wrong → Loop back to `dspy-custom-module-design`

This is normal and expected. DSPy development is iterative.

## Emergency Contacts

**"I don't know what I'm doing"**
→ Start with `dspy-signature-designer` and follow the typical workflow

Start here:
```python
# Every DSPy program begins with a signature
class MyTask(dspy.Signature):
    """What do you want the model to do?"""
    input_field: str = dspy.InputField()
    output_field: str = dspy.OutputField()
```

**"I'm overwhelmed by choices"**
→ Use `dspy-optimizer-selection` to understand the tradeoffs

Quick decision: How much training data?
- < 50 examples: `BootstrapFewShot`
- 50-500 examples: `SIMBA`
- > 500 examples: `MIPROv2`

**"I want best practices"**
→ Check the deep-dive patterns in `references/deep-dive-patterns.md`

**"Something's broken and I don't know why"**
→ Start with `dspy-evaluation-suite` to measure, then `dspy-debugging-observability` to diagnose

Debug workflow:
```python
# 1. Check baseline
score = dspy.evaluate.Evaluate(devset=test_set, metric=accuracy)(program)
print(f"Current accuracy: {score}")

# 2. Inspect internals
dspy.inspect.show_trace()  # See prompts and outputs

# 3. Try optimizer
from dspy.teleprompt import BootstrapFewShot
optimizer = BootstrapFewShot(metric=accuracy)
optimized = optimizer.compile(program, trainset=train_set)
```

## Quick Navigation Summary

1. **What am I building?** → Go to "Skill Lookup by Problem"
2. **What's my error or question?** → Go to "Phrase-Based Lookup"
3. **How should I sequence skills?** → Go to "Skill Dependency Graph"
4. **What's the right optimizer?** → Go to `dspy-optimizer-selection`
5. **How do I put this in production?** → Go to `dspy-production-deployment`

---

**Remember:** Each DSPy skill is detailed and standalone. This quick finder just helps route you to the right one.
