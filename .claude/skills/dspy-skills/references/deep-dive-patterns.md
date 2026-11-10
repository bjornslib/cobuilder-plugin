# Deep Dive: DSPy Patterns and Advanced Scenarios

## Understanding the DSPy Ecosystem

DSPy separates concerns into five layers:

1. **Signatures** (I/O contracts)
2. **Modules** (reusable components)
3. **Programs** (composed modules)
4. **Optimizers** (improve performance)
5. **Evaluation** (measure quality)

Most skills focus on one or more of these layers.

## Design Patterns by Architecture

### Pattern 1: Simple Pipeline

A single module that takes input and produces output. No branching or retrieval.

**Best for:** Simple transformations, single-step reasoning

**Skills involved:**
1. `dspy-signature-designer` - define input/output
2. `dspy-custom-module-design` - wrap in a module
3. `dspy-evaluation-suite` - measure performance
4. An optimizer skill - improve

**Example:** Sentiment classifier, text summarizer, intent detector

**Code example:**
```python
import dspy

# Step 1: Define signature
class Sentiment(dspy.Signature):
    """Classify text sentiment as positive, negative, or neutral."""
    text: str = dspy.InputField()
    sentiment: str = dspy.OutputField(desc="positive, negative, or neutral")

# Step 2: Build module
class SentimentAnalyzer(dspy.Module):
    def __init__(self):
        super().__init__()
        self.analyze = dspy.ChainOfThought(Sentiment)
    
    def forward(self, text):
        return self.analyze(text=text)

# Step 3: Evaluate
analyzer = SentimentAnalyzer()
dev_data = [
    {"text": "I love this!", "sentiment": "positive"},
    {"text": "This is terrible", "sentiment": "negative"},
]

def sentiment_metric(gold, pred):
    return gold["sentiment"] == pred.sentiment

score = dspy.evaluate.Evaluate(devset=dev_data, metric=sentiment_metric)(analyzer)
# Output: {'exact_match': 0.5, ...}

# Step 4: Optimize
from dspy.teleprompt import BootstrapFewShot
optimizer = BootstrapFewShot(metric=sentiment_metric, max_bootstrapped_demos=3)
optimized_analyzer = optimizer.compile(analyzer, trainset=dev_data)
```

### Pattern 2: RAG Pipeline

Retrieval-augmented generation: fetch context, then generate.

**Best for:** Knowledge-intensive tasks, document Q&A, FAQ systems

**Skills involved:**
1. `dspy-signature-designer` - retrieval query and generation signatures
2. `dspy-rag-pipeline` - architecture and retrieval flow
3. `dspy-embedding-retrieval` - embedder selection and index tuning
4. `dspy-evaluation-suite` - metrics for retrieval quality and generation
5. An optimizer skill - optimize prompts or retrieval

**Considerations:**
- Retrieval quality directly impacts generation quality
- Start with sparse retrieval (BM25), then dense (embeddings)
- Measure both retrieval recall and end-to-end generation quality
- May need separate optimization for retrieval vs. generation

**Code example:**
```python
import dspy
from dspy.teleprompt import BootstrapFewShot

# Step 1 & 2: Define signatures and build RAG
class GenerateAnswer(dspy.Signature):
    """Given a question and context, answer concisely."""
    question: str = dspy.InputField()
    context: str = dspy.InputField(desc="May contain relevant facts")
    answer: str = dspy.OutputField()

class RAG(dspy.Module):
    def __init__(self, num_passages=3):
        super().__init__()
        self.retrieve = dspy.Retrieve(k=num_passages)
        self.answer = dspy.ChainOfThought(GenerateAnswer)
    
    def forward(self, question):
        context = self.retrieve(question).passages
        return self.answer(question=question, context=context)

# Step 3: Configure retriever with embeddings
dspy.settings.configure(
    rm=dspy.ColBERTv2(url="http://localhost:8893/api/search")
)

# Step 4: Evaluate retrieval and generation separately
rag = RAG()
dev_data = [
    {"question": "Who is the author of 1984?", "answer": "George Orwell"},
]

def retrieval_metric(gold, pred, trace=None):
    """Check if retrieved passages contain the answer."""
    if trace is None:
        return False
    context = trace[0]["context"]  # First module's context
    return gold["answer"].lower() in context.lower()

def answer_metric(gold, pred, trace=None):
    """Check if predicted answer matches gold."""
    return gold["answer"].lower() in pred.answer.lower()

# Evaluate
retrieval_score = dspy.evaluate.Evaluate(
    devset=dev_data, 
    metric=retrieval_metric
)(rag)

# Step 5: Optimize with MIPROv2 for joint optimization
from dspy.teleprompt import MIPROv2
optimizer = MIPROv2(metric=answer_metric, num_workers=1)
optimized_rag = optimizer.compile(rag, trainset=dev_data, valset=dev_data)
```

### Pattern 3: Agent with Tools

Tool-using agents that select and call external functions.

**Best for:** Complex tasks requiring multi-step reasoning and external APIs

**Skills involved:**
1. `dspy-signature-designer` - thought/action/observation signatures
2. `dspy-react-agent-builder` or `dspy-mcp-tool-integration` - agent architecture
3. `dspy-evaluation-suite` - metrics for tool selection and reasoning quality
4. An optimizer skill - improve decision-making

**Considerations:**
- Tool definitions must be clear and unambiguous
- Consider tool hallucination (selecting non-existent tools)
- Measure success by task completion, not just reasoning steps
- MCP tools can be integrated natively with DSPy agents

**Code example:**
```python
import dspy
import json

# Step 1: Define agent signature
class ThinkAndAct(dspy.Signature):
    """Think step-by-step, then take an action."""
    task: str = dspy.InputField()
    thought: str = dspy.OutputField(desc="What should be done next?")
    action: str = dspy.OutputField(desc="Tool to call: search|calculate|lookup")
    action_input: str = dspy.OutputField(desc="Input for the tool")

# Step 2: Define tools
class MathCalculator:
    def calculate(self, expression: str) -> str:
        return str(eval(expression))

class WebSearch:
    def search(self, query: str) -> str:
        return f"[Search results for: {query}]"

class FactLookup:
    def lookup(self, fact: str) -> str:
        facts = {"paris": "Capital of France", "1984": "George Orwell"}
        return facts.get(fact.lower(), "Not found")

# Step 3: Build ReAct agent
class ReActAgent(dspy.Module):
    def __init__(self, max_steps=5):
        super().__init__()
        self.thinker = dspy.ChainOfThought(ThinkAndAct)
        self.tools = {
            "search": WebSearch().search,
            "calculate": MathCalculator().calculate,
            "lookup": FactLookup().lookup
        }
        self.max_steps = max_steps
    
    def forward(self, task):
        observations = []
        for step in range(self.max_steps):
            thought = self.thinker(task=task + " Observations so far: " + str(observations))
            action = thought.action.strip().lower()
            action_input = thought.action_input
            
            if action not in self.tools:
                observations.append(f"Invalid tool: {action}")
                continue
            
            result = self.tools[action](action_input)
            observations.append(f"{action}({action_input}) -> {result}")
            
            if "final answer" in str(thought).lower():
                break
        
        return {"observations": observations, "final": observations[-1] if observations else ""}

# Step 4: Evaluate task completion
agent = ReActAgent()

def task_success(gold, pred, trace=None):
    """Did the agent reach a final answer?"""
    return len(pred["observations"]) > 0

dev_data = [
    {"task": "What is the capital of France?", "answer": "Paris"},
    {"task": "Calculate 25 * 4", "answer": "100"},
]

score = dspy.evaluate.Evaluate(devset=dev_data, metric=task_success)(agent)
```

### Pattern 4: Multi-Hop Reasoning

Sequential retrieval and reasoning across multiple documents.

**Best for:** Complex question answering, research synthesis, logical deduction

**Skills involved:**
1. `dspy-signature-designer` - signatures for each reasoning step
2. `dspy-rag-pipeline` - multi-hop retrieval coordination
3. `dspy-reasoning-modules` - use RLM or ProgramOfThought
4. `dspy-evaluation-suite` - metrics for each hop and end-to-end accuracy
5. An optimizer skill - optimize retrieval query generation or reasoning

**Considerations:**
- Each hop is a retrieval attempt; errors compound
- May need separate optimizers for each hop
- Intermediate reasoning quality matters as much as final answer
- Consider using CodeAct for symbolic reasoning between hops

**Code example:**
```python
import dspy

# Step 1: Define signatures for each hop
class GenerateQuery(dspy.Signature):
    """Generate a search query to find relevant context."""
    question: str = dspy.InputField()
    prior_context: str = dspy.InputField(desc="What we know so far")
    query: str = dspy.OutputField()

class ReasonAboutHop(dspy.Signature):
    """Reason about retrieved information."""
    question: str = dspy.InputField()
    context: str = dspy.InputField(desc="Retrieved passage")
    reasoning: str = dspy.OutputField(desc="What does this tell us?")

class FinalAnswer(dspy.Signature):
    """Given reasoning from multiple hops, provide final answer."""
    question: str = dspy.InputField()
    reasoning: str = dspy.InputField(desc="Reasoning from all hops")
    answer: str = dspy.OutputField()

# Step 2 & 3: Build multi-hop reasoner
class MultiHopQA(dspy.Module):
    def __init__(self, num_hops=2):
        super().__init__()
        self.retrieve = dspy.Retrieve(k=3)
        self.generate_query = dspy.ChainOfThought(GenerateQuery)
        self.reason = dspy.ChainOfThought(ReasonAboutHop)
        self.finalize = dspy.ChainOfThought(FinalAnswer)
        self.num_hops = num_hops
    
    def forward(self, question):
        all_reasoning = []
        context_so_far = ""
        
        for hop in range(self.num_hops):
            # Generate query for this hop
            query_result = self.generate_query(
                question=question,
                prior_context=context_so_far
            )
            query = query_result.query
            
            # Retrieve
            passages = self.retrieve(query).passages
            
            # Reason
            for passage in passages[:1]:  # Use top passage
                reasoning = self.reason(
                    question=question,
                    context=passage
                )
                all_reasoning.append(reasoning.reasoning)
                context_so_far += "\n" + reasoning.reasoning
        
        # Final answer
        final = self.finalize(
            question=question,
            reasoning="\n".join(all_reasoning)
        )
        
        return final

# Step 4: Evaluate
qa = MultiHopQA(num_hops=2)

def multi_hop_metric(gold, pred):
    return gold["answer"].lower() in pred.answer.lower()

dev_data = [
    {"question": "Who wrote the book that won the 2020 award?", 
     "answer": "Author Name"},
]

score = dspy.evaluate.Evaluate(devset=dev_data, metric=multi_hop_metric)(qa)
```

### Pattern 5: Ensemble Programs

Multiple models or strategies voting or combining outputs.

**Best for:** High-stakes decisions, consensus building, robustness

**Skills involved:**
1. `dspy-custom-module-design` - architecture for ensemble composition
2. `dspy-advanced-module-composition` - ensemble orchestration patterns
3. `dspy-evaluation-suite` - metrics for diversity and correlation
4. An optimizer skill - optimize voting or weighting strategy

**Considerations:**
- Ensemble members should be diverse (different models, prompts, paths)
- Voting/merging strategy matters more than individual quality
- Measure correlation to avoid redundant ensemble members
- Weight optimization (distillation) can compress ensemble to single model

**Code example:**
```python
import dspy
from collections import Counter

# Step 1: Define same signature for all ensemble members
class Classify(dspy.Signature):
    """Classify text into one of three categories."""
    text: str = dspy.InputField()
    category: str = dspy.OutputField(desc="A, B, or C")

# Step 2: Build diverse ensemble (different models/configs)
class ConservativeClassifier(dspy.Module):
    """Uses detailed reasoning (higher confidence)."""
    def __init__(self):
        super().__init__()
        self.classify = dspy.ChainOfThought(Classify)
    
    def forward(self, text):
        return self.classify(text=text)

class FastClassifier(dspy.Module):
    """Uses direct prediction (faster)."""
    def __init__(self):
        super().__init__()
        self.classify = dspy.Predict(Classify)
    
    def forward(self, text):
        return self.classify(text=text)

# Step 3: Build ensemble with voting
class EnsembleClassifier(dspy.Module):
    def __init__(self):
        super().__init__()
        self.conservative = ConservativeClassifier()
        self.fast = FastClassifier()
    
    def forward(self, text):
        predictions = []
        predictions.append(self.conservative(text=text).category)
        predictions.append(self.fast(text=text).category)
        
        # Majority voting
        vote_counts = Counter(predictions)
        final_category = vote_counts.most_common(1)[0][0]
        
        return dspy.Prediction(
            category=final_category,
            votes=predictions,
            confidence=vote_counts[final_category] / len(predictions)
        )

# Step 4: Evaluate ensemble quality
ensemble = EnsembleClassifier()

def ensemble_metric(gold, pred):
    """Correct if ensemble agrees and matches gold."""
    return pred.category == gold["category"]

def diversity_metric(gold, pred):
    """Measure if ensemble members disagree (diversity)."""
    return len(set(pred.votes)) > 1

dev_data = [
    {"text": "Great product!", "category": "A"},
    {"text": "This is terrible", "category": "B"},
    {"text": "Just okay", "category": "C"},
]

score = dspy.evaluate.Evaluate(devset=dev_data, metric=ensemble_metric)(ensemble)
diversity = sum(diversity_metric(None, ensemble(d["text"])) for d in dev_data) / len(dev_data)
print(f"Accuracy: {score}, Diversity: {diversity}")
```

## Optimizer Selection Deep Dive

Different optimizers work best for different scenarios:

### Bootstrap (dspy-bootstrap-fewshot)

**When to use:** Need quick initial few-shot examples without labeling

**Characteristics:**
- Fast and lightweight
- Produces deterministic demos
- No learning, just in-context examples
- Good starting point

**Best for:** Rapid prototyping, bootstrap before more complex optimization

**Code example:**
```python
from dspy.teleprompt import BootstrapFewShot

def accuracy_metric(gold, pred):
    return gold["answer"] == pred.answer

optimizer = BootstrapFewShot(
    metric=accuracy_metric,
    max_bootstrapped_demos=4
)

# Compiles quickly by selecting good examples from trainset
optimized_program = optimizer.compile(
    program, 
    trainset=train_data  # Will select 4 best examples as demos
)
```

### MIPROv2 (dspy-miprov2-optimizer)

**When to use:** Want both instruction and demo optimization with Bayesian search

**Characteristics:**
- Searches instruction space and demo space jointly
- Requires `optuna` (Bayesian optimization)
- Requires labeled train set
- Slower but comprehensive

**Best for:** Mature programs needing deep optimization, when data quality matters

**Code example:**
```python
from dspy.teleprompt import MIPROv2

optimizer = MIPROv2(
    metric=accuracy_metric,
    num_workers=4,  # Parallel optimization
    num_candidates=50  # Search breadth
)

# Jointly optimizes prompts and in-context examples
# Takes more time but often achieves highest accuracy
optimized_program = optimizer.compile(
    program,
    trainset=train_data,
    valset=val_data,  # For early stopping
    num_trials=30  # Max Bayesian search iterations
)
```

### GEPA (dspy-gepa-reflective)

**When to use:** Want iterative instruction improvement via reflection

**Characteristics:**
- Uses model reflection to improve instructions
- Requires validation set for early stopping
- Iterative feedback loop
- Smaller search space than MIPROv2

**Best for:** When reflection is natural to the task, iterative improvement

**Code example:**
```python
from dspy.teleprompt import GEPA

optimizer = GEPA(
    metric=accuracy_metric,
    num_iterations=3,  # How many rounds of reflection
    max_examples=10  # Analyze top N failures each iteration
)

# Uses the model's own reflection to improve instructions
optimized_program = optimizer.compile(
    program,
    trainset=train_data,
    valset=val_data
)
```

### SIMBA (dspy-simba-optimizer)

**When to use:** Want introspective optimization with mini-batches

**Characteristics:**
- Mini-batch introspective optimization
- Analyzes failed examples in batches
- Iterative improvement with early stopping
- Good for moderate-sized datasets

**Best for:** Programs where failure analysis is informative, bounded training

**Code example:**
```python
from dspy.teleprompt import SIMBA

optimizer = SIMBA(
    metric=accuracy_metric,
    num_workers=1,
    max_bootstrapped_demos=2,
    max_labeler_calls=20
)

# Batches failures for analysis and optimization
optimized_program = optimizer.compile(
    program,
    trainset=train_data
)
```

### Finetune (dspy-finetune-bootstrap)

**When to use:** Want to distill into a smaller model or finetune weights

**Characteristics:**
- Trains model weights, not just prompts
- Requires substantial labeled data
- Produces deployable model weights
- Slower but permanent improvement

**Best for:** Production deployment with custom models, long-term quality investment

**Code example:**
```python
from dspy.teleprompt import BootstrapFewShot, DistillationOptimizer

# First step: Bootstrap few-shot examples
bootstrap_optimizer = BootstrapFewShot(metric=accuracy_metric)
bootstrapped = bootstrap_optimizer.compile(program, trainset=train_data)

# Second step: Distill into smaller model
from dspy.teleprompt import Distill
distiller = Distill(
    teacher=bootstrapped,
    metric=accuracy_metric,
    target_model="gpt-3.5-turbo"  # Smaller model
)

student_program = distiller.compile(
    student=program,
    trainset=train_data
)
# student_program now has same quality but runs on cheaper model
```

### Better Together (dspy-better-together)

**When to use:** Want sequential prompt then weight optimization

**Characteristics:**
- Runs prompt optimizer first, then weight optimizer
- Combines benefits of both approaches
- Requires labeled data
- Takes significant time

**Best for:** Comprehensive optimization for maximum quality

**Code example:**
```python
from dspy.teleprompt import BetterTogether, BootstrapFewShot, MIPRO

# Combines two optimizers in sequence
optimizer = BetterTogether(
    first_optimizer=BootstrapFewShot(metric=accuracy_metric),
    second_optimizer=MIPRO(metric=accuracy_metric),
    metric=accuracy_metric
)

# First improves prompts via bootstrapping,
# then improves weights/parameters
optimized_program = optimizer.compile(
    program,
    trainset=train_data,
    valset=val_data
)
```

## Evaluation Patterns

### Baseline Establishment (dspy-evaluation-suite)

Before optimizing, establish a baseline:

```
1. Define metric(s) - What constitutes success?
2. Collect examples - At least 50-200 labeled examples
3. Run evaluation - Establish baseline performance
4. Document - Record baseline as reference point
```

**Code example:**
```python
import dspy

# Define metric
def exact_match(gold, pred):
    return gold["answer"].lower() == pred.answer.lower()

# Create program
program = SomeProgram()

# Establish baseline
baseline_score = dspy.evaluate.Evaluate(
    devset=test_set,
    metric=exact_match,
    num_threads=4
)(program)

print(f"Baseline accuracy: {baseline_score['exact_match']:.1%}")

# Save for later comparison
with open("baseline.txt", "w") as f:
    f.write(f"Baseline: {baseline_score}")
```

### Multi-Metric Evaluation

Different programs need different metrics:

- **Q&A**: Exact match (EM), F1 score, semantic similarity
- **Classification**: Precision, recall, F1, confusion matrix
- **Generation**: BLEU, ROUGE, semantic similarity, human judgment
- **RAG**: Retrieval recall, generation quality, end-to-end accuracy
- **Agents**: Task completion rate, reasoning quality, tool selection accuracy

**Code example:**
```python
from sklearn.metrics import precision_recall_fscore_support

# Multi-metric evaluation for classification
def classification_metrics(gold, pred):
    return {
        "exact_match": gold["label"] == pred.label,
        "precision": 1.0 if gold["label"] == pred.label else 0.0,
        "recall": 1.0 if gold["label"] == pred.label else 0.0,
    }

score = dspy.evaluate.Evaluate(
    devset=test_set,
    metric=classification_metrics
)(classifier)

# Returns: {'exact_match': 0.85, 'precision': 0.83, 'recall': 0.87}
```

### Continuous Evaluation

In production, track:

- **Performance**: Is the optimized program still working?
- **Drift**: Are inputs/outputs changing in unexpected ways?
- **Failures**: Which examples consistently fail?

Use `dspy-production-deployment` to set up monitoring and MLflow tracing.

## Integration Patterns

### Integrating with Haystack (dspy-haystack-integration)

DSPy can use Haystack components:

- Haystack retrievers in DSPy pipelines
- DSPy modules as Haystack components
- Hybrid retrieval (sparse + dense)
- Integrated evaluation

### Integrating MCP Tools (dspy-mcp-tool-integration)

Connect DSPy agents to external tools:

- Native MCP tool support
- Tool discovery and selection
- Error handling and fallback
- Integrated with ReAct agents

### Multimodal Inputs (dspy-adapters-multimodal)

Handle images, audio, files:

- Image understanding via vision models
- Audio transcription and understanding
- File parsing and content extraction
- Structured output with multimodal data

## Production Deployment Patterns

### Caching Strategy (dspy-production-deployment)

Cache at multiple levels:

1. **LM calls** - Cache model outputs (same prompt → same result)
2. **Retrieval** - Cache retriever results
3. **Program** - Cache entire program runs for identical inputs

Helps reduce latency and cost in production.

**Code example:**
```python
import dspy
from dspy.clients import RedisClient

# Enable caching at LM call level
dspy.settings.configure(
    cache_type="redis",
    cache_client=RedisClient(host="localhost", port=6379)
)

# Now identical prompts are cached
result1 = program("What is the capital of France?")  # LM call
result2 = program("What is the capital of France?")  # Cached result (instant)

# Cache hits significantly reduce costs and latency
```

### Serialization Pattern

Save and load programs:

```
1. Save trained weights (if using finetune)
2. Save optimized prompts (if using prompt optimizer)
3. Save configuration (LM settings, tool definitions)
4. Save evaluation metrics (baseline for comparison)
```

**Code example:**
```python
import pickle

# Save program (stores optimized prompts and configuration)
with open("my_program.pkl", "wb") as f:
    pickle.dump(optimized_program, f)

# Load program
with open("my_program.pkl", "rb") as f:
    loaded_program = pickle.load(f)

# Save program state for versioning
import json
program_state = {
    "type": "RAG",
    "prompts": optimized_program.retrieve.instructions,
    "demos": optimized_program.qa.demos,
    "config": {"retriever": "ColBERTv2", "k": 3}
}
with open("program_state.json", "w") as f:
    json.dump(program_state, f, indent=2)
```

### Async and Streaming (dspy-production-deployment)

For high-volume production:

- Async execution for parallel requests
- Streaming outputs for long-form generation
- Batch processing for multiple examples
- Load balancing across LM endpoints

**Code example:**
```python
import asyncio
import dspy

class AsyncProgram(dspy.Module):
    def __init__(self):
        super().__init__()
        self.qa = dspy.ChainOfThought(QASignature)
    
    async def forward_async(self, question):
        # Async LM call
        return await self.qa.forward_async(question=question)

# Process batch asynchronously
async def batch_process(program, questions):
    tasks = [program.forward_async(q) for q in questions]
    results = await asyncio.gather(*tasks)
    return results

# Stream responses
def stream_responses(program, large_input):
    response = program.qa(question=large_input)
    # Stream output token by token
    for token in response.answer.split():
        yield token + " "
        time.sleep(0.01)  # Simulate streaming
```

### Observability (dspy-debugging-observability)

Monitor program behavior:

- Inspection tools to examine module state
- Callbacks for custom logging
- MLflow integration for experiment tracking
- Trace entire reasoning process

**Code example:**
```python
import mlflow
import dspy

# Set up MLflow tracking
mlflow.set_experiment("dspy_qa_optimization")

# Custom callback to track each prediction
def log_prediction_callback(step, pred):
    mlflow.log_metric("prediction_step", step)
    mlflow.log_text(str(pred), f"prediction_{step}.txt")

# Run with callback
mlflow.start_run()
program = SomeProgram()

# Inspect program state
def inspect_program(program, example):
    with dspy.inspect.InspectBlock(program):
        result = program(question=example)
    # Prints all intermediate steps and their prompts
    print(dspy.inspect.get_trace())
    return result

mlflow.end_run()
```

## When to Optimize vs. When to Redesign

### Optimize If:
- Basic architecture is correct but performance is suboptimal
- Metrics show consistent, solvable problems
- Small adjustments could improve significantly
- Data quality is high

**Skills:** Use optimizer skills

### Redesign If:
- Architecture fundamentally mismatches the problem
- Metrics show the program can't solve the problem
- Data quality is poor or insufficient
- Requirements have changed

**Skills:** Return to `dspy-signature-designer` and `dspy-custom-module-design`

## Common Failure Points and Recovery

### Failure: Retriever Returns Poor Context

**Diagnosis:** Retrieval recall is low, generation quality suffers

**Recovery:**
1. Check retrieval metrics independently
2. Try denser embeddings (smaller index, higher quality)
3. Use `dspy-rag-pipeline` to redesign retrieval strategy
4. Consider multi-hop or re-ranking
5. Optimize retrieval prompts separately from generation

### Failure: Agent Refuses to Use Tools

**Diagnosis:** Agent hallucinates or doesn't call available tools

**Recovery:**
1. Check tool definitions (clarity, relevance)
2. Use `dspy-react-agent-builder` to adjust agent reasoning
3. Add tool-use examples to signatures
4. Optimize tool selection via evaluation metrics

### Failure: Output Consistency is Low

**Diagnosis:** Same input produces different outputs

**Recovery:**
1. Use `dspy-output-refinement-constraints` to add guardrails
2. Add BestOfN selection (multiple outputs, pick best)
3. Use optimizer to improve prompt stability
4. Consider temperature settings (lower = more consistent)

### Failure: Optimization Doesn't Improve Quality

**Diagnosis:** After optimization, metrics don't improve or worsen

**Recovery:**
1. Check evaluation metrics (are they measuring the right thing?)
2. Use `dspy-optimizer-selection` to try a different optimizer
3. Increase training data size
4. Consider that the program may need redesign, not optimization

## Recommended Reading Order

1. Start with `dspy-signature-designer` - understand types and contracts
2. Then `dspy-custom-module-design` - build architecture
3. Then `dspy-evaluation-suite` - measure performance
4. Then `dspy-optimizer-selection` - choose optimization strategy
5. Then dive into specific domains (RAG, agents, reasoning)
6. Finally `dspy-production-deployment` - prepare for production

This order ensures a solid foundation before specializing.
