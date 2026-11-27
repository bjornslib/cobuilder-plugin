# Programmatic Algorithms for Codebase Cohesion, Coupling, and Architectural Quality

Modern software systems maintained by autonomous or semi-autonomous artificial intelligence coding agents experience structural decay through a distinct operational signature. As demonstrated by recent empirical software engineering research, coding agents optimize aggressively for immediate patch completion within narrow context windows. This localized optimization creates an asymmetry between feature velocity and architectural health, manifesting in code duplication, bloated procedural methods, and topological entropy such as flat-packed directories and leaky encapsulation boundaries.

To mitigate this structural decay while maintaining engineering oversight, quality assessment cannot rely solely on either rigid linters or ungrounded generative models. Deterministic static analysis algorithms must provide rigorous, directional guidance across codebase graphs. These algorithmic signals then serve as targeted inputs for language model agents to perform qualitative, domain-driven investigations alongside human system architects.

This technical specification details the mathematical formulations, graph-theoretic models, and algorithmic pipelines required to programmatically evaluate codebase cohesion, coupling, topological modularity, and maintainability debt.

---

## 1. Multi-Scale Semantic Graph Representation

Traditional static analyzers frequently evaluate source files in isolation or restrict analysis to abstract syntax tree token sequences. To accurately diagnose architectural decay, a codebase must be modeled as a hierarchical, multi-scale directed graph that captures structural dependencies, data flows, and physical filesystem topology simultaneously.

The Program Analysis Module constructs a global multi-attributed directed graph denoted as:

$$G = (V, E, \tau_V, \tau_E)$$

where $V$ represents the set of syntactic and structural entities across the codebase, $E \subseteq V \times V$ represents the directed dependencies between entities, $\tau_V: V \rightarrow \mathcal{T}_V$ assigns a structural type to each vertex, and $\tau_E: E \rightarrow \mathcal{T}_E$ defines the relationship semantics of each edge.

The vertex classification domain $\mathcal{T}_V$ is partitioned into five discrete hierarchical tiers:

*   **Directory Vertices ($V_{\text{dir}}$)**: Physical directory boundaries within the repository filesystem tree.
*   **File Vertices ($V_{\text{file}}$)**: Individual source files, modules, or translation units.
*   **Class Vertices ($V_{\text{cls}}$)**: Object-oriented classes, traits, structs, and interface declarations.
*   **Function and Method Vertices ($V_{\text{fn}}$)**: Executable functions, procedures, methods, and closures.
*   **Field Vertices ($V_{\text{fld}}$)**: Class-level member variables, module variables, and exported constants.

The edge classification domain $\mathcal{T}_E$ captures both physical containment and logical runtime interaction:

*   **Containment Edges ($E_{\text{contains}}$)**: Directed hierarchical edges reflecting physical filesystem and lexical scoping nesting ($V_{\text{dir}} \rightarrow V_{\text{file}} \rightarrow V_{\text{cls}} \rightarrow V_{\text{fn}}$).
*   **Import Edges ($E_{\text{import}}$)**: Directed dependency links representing module-level import or include declarations ($V_{\text{file}} \rightarrow V_{\text{file}}$).
*   **Invocation Edges ($E_{\text{call}}$)**: Static call graph edges tracking function and method invocations ($V_{\text{fn}} \rightarrow V_{\text{fn}}$).
*   **Data Flow and Access Edges ($E_{\text{access}}$)**: Read and write dependencies linking functions to accessed fields ($V_{\text{fn}} \rightarrow V_{\text{fld}}$).
*   **Inheritance and Implementation Edges ($E_{\text{inherit}}$)**: Polymorphic relationships between class and interface vertices ($V_{\text{cls}} \rightarrow V_{\text{cls}}$).

By populating $G$ using incremental parsers such as Tree-sitter alongside control-flow and data-flow analysis, the system achieves the multi-scale visibility necessary to analyze code-level, class-level, and directory-level properties within a unified data structure.

---

## 2. Mathematical Formulations of Cohesion, Coupling, and Control Flow

Measuring whether a codebase is well-structured requires moving beyond raw lines of code to quantify the degree of functional relatedness within software units and the degree of interdependence between them.

### Modularization Quality and the Cluster Factor

Following the foundational work on automated software modularization established by Mitchell and Mancoridis, and recently expanded in module recovery frameworks such as ClassLAR, system modularity is formulated as the cumulative optimization of intra-module cohesion relative to inter-module coupling.

Let the system be partitioned into $k$ modules or directories denoted by $\mathcal{C} = \{C_1, C_2, \dots, C_k\}$. For any module $C_i$, let $\mu_i$ denote the internal edge weight representing intra-module dependencies where both the source and target vertices reside strictly within $C_i$:

$$\mu_i = \sum_{u, v \in C_i} w(u, v)$$

Let $\varepsilon_{i, j}$ denote the external edge weight representing directed coupling from module $C_i$ to an external module $C_j$:

$$\varepsilon_{i, j} = \sum_{u \in C_i, \, v \in C_j} w(u, v) \quad \text{for } i \neq j$$

The Cluster Factor ($CF_i$) of module $C_i$ normalizes internal cohesion against the total external dependency exposure:

$$CF_i = \begin{cases} 0 & \text{if } 2\mu_i + \sum_{j \neq i}^k (\varepsilon_{i, j} + \varepsilon_{j, i}) = 0 \\ \frac{2\mu_i}{2\mu_i + \sum_{j \neq i}^k (\varepsilon_{i, j} + \varepsilon_{j, i})} & \text{otherwise} \end{cases}$$

The global Modularization Quality ($MQ$) of the codebase partition is the aggregate sum of cluster factors across all modules:

$$MQ = \sum_{i=1}^k CF_i$$

A higher $MQ$ value indicates an architecture characterized by strong internal cohesion and minimal cross-module coupling. When evaluating directories, a low individual $CF_i$ alerts maintainers that a directory functions as a loose collection of disparate files rather than an encapsulated subsystem.

### Directed Modularity and the Stable Dependencies Principle

While symmetric clustering metrics capture overall connectivity, software systems are fundamentally directional. As demonstrated by Raji and Montazeri in formal analyses of software package stability, directed modularity directly supports Robert C. Martin's Stable Dependencies Principle (SDP), which dictates that module dependencies must run in the direction of stability.

The directed modularity $Q$ of a software dependency network with $m$ total edges is defined according to Newman and Girvan's formulation:

$$Q = \frac{1}{m} \sum_{i, j} \left[ A_{ij} - \frac{k_i^{\text{out}} \, k_j^{\text{in}}}{m} \right] \delta(C_i, C_j)$$

where $A_{ij}$ is the adjacency matrix weight connecting entity $i$ to entity $j$, $k_i^{\text{out}}$ is the out-degree of entity $i$, $k_j^{\text{in}}$ is the in-degree of entity $j$, and $\delta(C_i, C_j)$ is the Kronecker delta function evaluating to $1$ if entities $i$ and j reside in the same package and $0$ otherwise.

In software architecture, hiding unstable dependencies inside cohesive packages increases the directed modularity value $Q$. Mathematical proofs demonstrate that refactoring operations that eliminate SDP violations concurrently maximize $Q$, confirming that graph-theoretic community detection metrics intrinsically penalize unstable, backwards dependencies.

### Control-Flow Uniformity: UIOD and DIOE

Traditional coupling and cohesion metrics evaluate edge quantities but fail to detect architectural "spaghetti" structures where control flow enters or exits a module through dozens of arbitrary files. In comprehensive evaluations of commercial software systems published by Pourasghar, Izadkhah, and Akhtari in the ACM Transactions on Software Engineering and Methodology (2025), expert human decompositions were found to consistently adhere to two control-flow principles that mirror the Façade design pattern.

To quantify this structural property, two complementary metrics are computed across directory clusters:

1.  **Uniformity of Input and Output Directions ($UIOD$)**: Measures the degree to which control flow between two modules operates unidirectionally rather than exhibiting reciprocal, ping-pong call patterns. Reciprocal communication between directories introduces circular cognitive overhead similar to arbitrary jumps in control flow.
2.  **Distribution of Input and Output Edges ($DIOE$)**: Measures whether incoming and outgoing dependencies are concentrated through a minimal set of gateway artifacts (such as module entry barrels or façades) or dispersed across internal helper components.

For a module cluster $C_i$ containing $p$ constituent artifacts, let $In_r$ and $Out_r$ represent the number of external input and output dependencies terminating or originating at artifact $r \in C_i$:

$$DIOE(C_i) = \frac{\sum_{r=1}^p \left[ \frac{In_r (In_r + 1)}{2} + \frac{Out_r (Out_r + 1)}{2} \right]}{\sum_{r=1}^p (In_r + Out_r)}$$

When external dependencies enter a module exclusively through a single gateway artifact, $DIOE$ achieves its theoretical maximum. Conversely, when external calls bypass module interfaces to bind directly to internal helper classes, $DIOE$ drops toward its minimum. Empirical benchmarks demonstrate that incorporating $DIOE$ into structural objective functions improves modularization accuracy against human expert decompositions by up to 26 percentage points compared to classical cohesion and coupling alone.

---

## 3. Directional Smell Detection Algorithms

The programmatic analysis engine applies threshold-based and graph-based heuristics to the multi-scale semantic graph $G$ to identify structural anti-patterns. These findings are treated as directional signals rather than absolute blockers, highlighting candidate debt areas for agent-driven investigation.

### Topological and Directory Entropies

Empirical studies on repository maintenance reveal that AI coding agents suffer from issue localization blindness, frequently defaulting to flat-packing files into pre-existing directories or creating superficial splits.

```python
def audit_directory_topology(graph, directory_tree):
    """
    Evaluates directory structures for Modular Mirages, Flat-Packing,
    and Leaky Façade anti-patterns.
    """
    findings = []
    
    for dir_path, files in directory_tree.items():
        if dir_path in {".", "src", "lib"}:
            continue
            
        file_count = len(files)
        
        # 1. Directory Flat-Packing (The Rule of Seven)
        if file_count > 10:
            findings.append({
                "smell_id": "SMELL_DIRECTORY_FLAT_PACKING",
                "target": dir_path,
                "severity": "MAJOR",
                "metrics": {"file_count": file_count, "threshold": 10},
                "rationale": (
                    f"Directory contains {file_count} files without subfolder "
                    "partitioning, exceeding cognitive load and maintainability thresholds."
                )
            })
            
        if file_count < 3:
            continue
            
        # 2. Modular Mirage Detection
        file_set = set(files)
        internal_edges = 0
        external_edges = 0
        
        for f in files:
            for target in graph.successors(f):
                if target in file_set:
                    internal_edges += 1
                else:
                    external_edges += 1
                    
        total_edges = internal_edges + external_edges
        if total_edges > 0:
            cluster_factor = (2 * internal_edges) / (2 * internal_edges + external_edges)
            if cluster_factor < 0.25:
                findings.append({
                    "smell_id": "SMELL_MODULAR_MIRAGE",
                    "target": dir_path,
                    "severity": "CRITICAL",
                    "metrics": {
                        "cluster_factor": round(cluster_factor, 3),
                        "internal_edges": internal_edges,
                        "external_edges": external_edges
                    },
                    "rationale": (
                        "Superficial file separation detected: external coupling "
                        f"vastly exceeds internal cohesion (CF = {cluster_factor:.3f})."
                    )
                })

        # 3. Leaky Façade / UIOD Violation
        external_callers = set()
        targeted_internal_files = set()
        
        for f in files:
            for caller in graph.predecessors(f):
                if caller not in file_set:
                    external_callers.add(caller)
                    targeted_internal_files.add(f)
                    
        has_facade = any(
            f.endswith(("index.ts", "index.js", "__init__.py", "facade.py"))
            for f in files
        )
        
        if len(targeted_internal_files) > 2 and not has_facade:
            findings.append({
                "smell_id": "SMELL_LEAKY_FACADE",
                "target": dir_path,
                "severity": "MAJOR",
                "metrics": {
                    "unprotected_entrypoints": len(targeted_internal_files),
                    "external_callers": len(external_callers)
                },
                "rationale": (
                    "Module lacks a public barrel export or façade; external "
                    f"callers bind directly to {len(targeted_internal_files)} internal files."
                )
            })
            
    return findings
```

### Intra-Module Object and Procedural Smells

As systems scale, coding agents frequently introduce intra-module bloat by centralizing behavior into monolithic controllers or inlining complex conditional logic.

```python
def audit_object_and_procedural_smells(graph, threshold_config):
    """
    Evaluates classes and routines for God Class syndrome, procedural bloat,
    and redundant inline external API invocations.
    """
    findings = []
    
    for node, data in graph.nodes(data=True):
        node_type = data.get("type")
        
        # 1. God Class / Brain Class Analysis
        if node_type == "Class":
            methods = [
                v for _, v, edge_data in graph.out_edges(node, data=True)
                if edge_data.get("kind") == "CONTAINS" and graph.nodes[v].get("type") == "Method"
            ]
            
            # Response for a Class (RFC): methods in class + external methods invoked
            invoked_external = set()
            for m in methods:
                for _, target, edge_data in graph.out_edges(m, data=True):
                    if edge_data.get("kind") == "CALLS" and target not in methods:
                        invoked_external.add(target)
            rfc = len(methods) + len(invoked_external)
            
            # Weighted Methods per Class (WMC): sum of cyclomatic complexity
            wmc = sum(graph.nodes[m].get("cyclomatic_complexity", 1) for m in methods)
            
            if rfc > threshold_config["RFC_LIMIT"] and wmc > threshold_config["WMC_LIMIT"]:
                findings.append({
                    "smell_id": "SMELL_GOD_CLASS",
                    "target": node,
                    "severity": "CRITICAL",
                    "metrics": {"RFC": rfc, "WMC": wmc, "method_count": len(methods)},
                    "rationale": (
                        f"Class centralizes system logic with excessive response set "
                        f"(RFC={rfc}) and high cyclomatic weight (WMC={wmc})."
                    )
                })
                
        # 2. Procedural Bloat (Monolithic Method)
        elif node_type in {"Method", "Function"}:
            loc = data.get("loc", 0)
            complexity = data.get("cyclomatic_complexity", 1)
            nesting_depth = data.get("max_nesting_depth", 0)
            
            if loc > threshold_config["METHOD_LOC_LIMIT"] or complexity > threshold_config["COMPLEXITY_LIMIT"]:
                findings.append({
                    "smell_id": "SMELL_PROCEDURAL_BLOAT",
                    "target": node,
                    "severity": "MAJOR",
                    "metrics": {"LOC": loc, "cyclomatic_complexity": complexity, "nesting_depth": nesting_depth},
                    "rationale": (
                        f"Routine exceeds maintainability thresholds with {loc} LOC, "
                        f"cyclomatic complexity of {complexity}, and nesting depth of {nesting_depth}."
                    )
                })

        # 3. Redundant External API Implementation (PAU)
        elif node_type == "File":
            external_api_calls = [
                target for _, target, edge_data in graph.out_edges(node, data=True)
                if edge_data.get("kind") == "EXTERNAL_API_CALL"
            ]
            call_counts = defaultdict(int)
            for call in external_api_calls:
                call_counts[call] += 1
                
            duplicated_apis = {api: count for api, count in call_counts.items() if count > 3}
            if duplicated_apis:
                findings.append({
                    "smell_id": "SMELL_REDUNDANT_API_INLINE",
                    "target": node,
                    "severity": "MINOR",
                    "metrics": {"duplicated_api_sequences": duplicated_apis},
                    "rationale": (
                        "Repetitive, unencapsulated external library invocations "
                        "detected inline without adapter abstraction."
                    )
                })

    return findings
```

---

## 4. Behavioral Churn Weighting and Hotspot Prioritisation

Static analysis warnings often overwhelm engineering teams. Empirical investigations into static analysis usage indicate that maintainers ignore roughly one-third of raw warnings because the flagged files are stable and represent negligible operational risk.

To convert raw smells into an actionable backlog, the analysis engine implements behavioral hotspot analysis. Inspired by CodeScene's behavioral code metrics and Adam Tornhill's work on software forensics, static code findings are intersected with historical version control metrics.

The Hotspot Priority Score ($HPS$) for a given structural finding is formulated as:

$$HPS(\text{Finding}) = \omega(\text{Severity}) \times \ln(1 + \mathcal{C}_{90\text{d}}) \times \sqrt{1 + \mathcal{B}_{\text{downstream}}}$$

The components of the prioritization model are defined as follows:

*   **Severity Weight ($\omega$)**: Reflects structural impact on system architecture ($\omega(\text{CRITICAL}) = 3.0$, $\omega(\text{MAJOR}) = 2.0$, $\omega(\text{MINOR}) = 1.0$).
*   **Behavioral Churn ($\mathcal{C}_{90\text{d}}$)**: The number of distinct commits touching the target artifact over the preceding 90 days. Taking the natural logarithm $\ln(1 + \mathcal{C}_{90\text{d}})$ models diminishing cognitive returns: a file modified 50 times represents active maintenance friction, whereas changing 150 times does not triple that friction.
*   **Downstream Blast Radius ($\mathcal{B}_{\text{downstream}}$)**: The count of transitive downstream dependents in the semantic graph $G$:
    $$\mathcal{B}_{\text{downstream}}(u) = |\text{Descendants}(G, u)|$$
    Applying the square root $\sqrt{1 + \mathcal{B}_{\text{downstream}}}$ prevents core shared libraries from permanently starving local feature refactorings while accurately reflecting systemic regression risk.

```python
import math
import subprocess
from pathlib import Path
import networkx as nx

def calculate_hotspot_priority(findings, graph, repo_root):
    """
    Combines static smell severity with 90-day Git commit activity
    and downstream dependency blast radius.
    """
    severity_weights = {
        "CRITICAL": 3.0,
        "MAJOR": 2.0,
        "MINOR": 1.0
    }
    
    prioritized_findings = []
    
    for finding in findings:
        target = finding["target"]
        
        # 1. Extract 90-day Git commit churn
        churn = extract_git_commit_count(repo_root, target, days=90)
        
        # 2. Compute downstream blast radius
        if target in graph:
            blast_radius = len(nx.descendants(graph, target))
        else:
            # Directory target: collect union of descendants of constituent files
            dir_nodes = [n for n in graph.nodes if n.startswith(target)]
            descendants = set()
            for dn in dir_nodes:
                descendants.update(nx.descendants(graph, dn))
            blast_radius = len(descendants)
            
        weight = severity_weights.get(finding.get("severity", "MINOR"), 1.0)
        
        # Compute Hotspot Priority Score
        hps = weight * math.log(1 + churn) * math.sqrt(1 + blast_radius)
        
        prioritized_findings.append({
            **finding,
            "churn_commits_90d": churn,
            "blast_radius_descendants": blast_radius,
            "hotspot_priority_score": round(hps, 2)
        })
        
    return sorted(
        prioritized_findings,
        key=lambda x: x["hotspot_priority_score"],
        reverse=True
    )

def extract_git_commit_count(repo_root, target_path, days=90):
    """Queries Git revision history for commit frequency within a time window."""
    try:
        cmd = [
            "git", "rev-list", "--count",
            f"--since={days}.days", "HEAD", "--", target_path
        ]
        result = subprocess.run(
            cmd, cwd=repo_root, capture_output=True, text=True, check=True
        )
        return int(result.stdout.strip() or 0)
    except Exception:
        return 0
```

---

## 5. The Hybrid Neuro-Symbolic Investigation Protocol

Deterministic algorithms provide objective metrics, but software design is fundamentally bound to business domain semantics. A directory containing fifteen files might trigger a mechanical flat-packing warning while representing a perfectly cohesive Domain-Driven Design (DDD) Aggregate.

The hybrid neuro-symbolic protocol bridges programmatic measurements with language model qualitative reasoning. Algorithmic outputs are structured into a standardized context payload and passed to an agent instructed to investigate the finding across three qualitative axes:

1.  **Ubiquitous Language Audit (`DDD-VOCABULARY.md`)**: The agent audits entity names against the project vocabulary glossary. It identifies whether generic naming suffixes (`Manager`, `Handler`, `Processor`, `Helper`, `Data`) mask missing domain concepts or violate Single Responsibility boundaries.
2.  **Zero-Blast-Radius Deletion Simulation**: The agent mentally simulates deleting the target feature directory. If removing the feature breaks imports across unrelated layers (`controllers/`, `services/`, `models/`), the agent confirms that the codebase suffers from Package-by-Layer rot rather than true Package-by-Feature encapsulation.
3.  **Encapsulation and Façade Realism**: The agent evaluates whether the internal artifacts of the directory can be realistically encapsulated behind an explicit barrel interface (`index.ts` or `__init__.py`) without creating awkward pass-through abstractions.

The qualitative investigation schema establishes a structured contract between the deterministic scanner and the language model:

```yaml
investigation_request:
  hotspot_id: "HOTSPOT-2026-0042"
  smell_type: "SMELL_MODULAR_MIRAGE"
  target_directory: "src/services/billing/"
  metrics:
    cluster_factor: 0.182
    internal_dependency_edges: 4
    external_coupling_edges: 22
    commit_churn_90d: 38
    blast_radius: 17
    calculated_hps: 24.62
  context_inputs:
    vocabulary_file: "DDD-VOCABULARY.md"
    context_definition: "docs/architecture/contexts/billing/boundary.yaml"
  qualitative_tasks:
    - task: "Audit ubiquitous language usage against generic manager patterns"
    - task: "Simulate zero-blast-radius feature deletion"
    - task: "Draft target directory topology adhering to Package-by-Feature"
```

---

## 6. Comprehensive Reference Engine Implementation

Below is the complete, self-contained reference script (`refactor_engine.py`) implementing the graph construction, topological smell detection, and behavioral hotspot prioritization algorithms.

```python
#!/usr/bin/env python3
"""
CoBuilder Architectural Quality & Cohesion Engine
Analyzes codebase graph topology, calculates modular cohesion/coupling metrics,
and prioritizes architectural technical debt hotspots.
"""

import os
import sys
import json
import math
import argparse
import subprocess
from pathlib import Path
from collections import defaultdict
import networkx as nx

class CodebaseAnalysisEngine:
    """
    Constructs a multi-scale semantic graph and computes architectural
    cohesion, coupling, and behavioral hotspot rankings.
    """

    def __init__(self, repo_root: Path):
        self.repo_root = repo_root.resolve()
        self.graph = nx.DiGraph()
        self.directory_tree = defaultdict(list)

    def build_graph(self) -> nx.DiGraph:
        """Parses files, registers nodes, and extracts import dependencies."""
        ignored_directories = {
            ".git", "node_modules", ".venv", "__pycache__",
            "dist", "build", ".cobuilder", ".serena"
        }

        for root, dirs, files in os.walk(self.repo_root):
            dirs[:] = [d for d in dirs if d not in ignored_directories]
            
            for file in files:
                if file.endswith((".py", ".ts", ".tsx", ".js", ".jsx")):
                    file_path = Path(root) / file
                    rel_path = str(file_path.relative_to(self.repo_root))
                    parent_dir = str(file_path.parent.relative_to(self.repo_root))
                    
                    loc = self._compute_loc(file_path)
                    
                    self.graph.add_node(
                        rel_path,
                        type="File",
                        loc=loc,
                        parent_dir=parent_dir
                    )
                    self.directory_tree[parent_dir].append(rel_path)
                    self._extract_dependencies(file_path, rel_path)

        return self.graph

    def _compute_loc(self, path: Path) -> int:
        """Computes effective lines of code excluding blank lines and comments."""
        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                return sum(
                    1 for line in f
                    if line.strip() and not line.strip().startswith(("#", "//", "/*", "*"))
                )
        except Exception:
            return 0

    def _extract_dependencies(self, file_path: Path, source_rel: str):
        """Extracts dependency import vectors via lexical AST parsing heuristics."""
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

            for line in content.splitlines():
                line = line.strip()
                # TypeScript / JavaScript imports
                if line.startswith("import ") and " from " in line:
                    raw_target = line.split(" from ")[-1].strip(" ';\"")
                    self._resolve_import(source_rel, raw_target)
                # Python imports
                elif line.startswith("from ") or line.startswith("import "):
                    tokens = line.split()
                    if len(tokens) >= 2:
                        raw_target = tokens[1]
                        self._resolve_import(source_rel, raw_target)
        except Exception:
            pass

    def _resolve_import(self, source_file: str, target_import: str):
        """Resolves relative file imports against the repository root."""
        if target_import.startswith("."):
            src_dir = (self.repo_root / source_file).parent
            resolved = (src_dir / target_import).resolve()
            
            candidates = [
                resolved,
                resolved.with_suffix(".ts"),
                resolved.with_suffix(".tsx"),
                resolved.with_suffix(".js"),
                resolved.with_suffix(".py"),
                resolved / "index.ts",
                resolved / "index.js",
                resolved / "__init__.py"
            ]
            
            for cand in candidates:
                if cand.exists() and cand.is_file():
                    try:
                        rel_cand = str(cand.relative_to(self.repo_root))
                        self.graph.add_edge(source_file, rel_cand, kind="IMPORT")
                        return
                    except ValueError:
                        pass
        else:
            # External package or absolute path alias
            self.graph.add_node(target_import, type="ExternalPackage")
            self.graph.add_edge(source_file, target_import, kind="EXTERNAL_IMPORT")

    def detect_structural_smells(self) -> list[dict]:
        """Runs topological and structural smell detection suites."""
        findings = []

        # A. Directory Topology Smells
        for dir_path, files in self.directory_tree.items():
            if dir_path in {".", "src", "lib", "packages"}:
                continue

            file_count = len(files)

            # Rule of Seven Check
            if file_count > 10:
                findings.append({
                    "smell_id": "SMELL_DIRECTORY_FLAT_PACKING",
                    "target": dir_path,
                    "severity": "MAJOR",
                    "metrics": {"file_count": file_count, "threshold": 10},
                    "description": (
                        f"Directory has {file_count} files without logical "
                        "subfolder decomposition (Rule of Seven violation)."
                    )
                })

            if file_count >= 3:
                # Modular Mirage Check (Cluster Factor)
                file_set = set(files)
                internal_edges = 0
                external_edges = 0

                for f in files:
                    for target in self.graph.successors(f):
                        if target in file_set:
                            internal_edges += 1
                        else:
                            external_edges += 1

                total = internal_edges + external_edges
                if total > 0:
                    cf = (2 * internal_edges) / (2 * internal_edges + external_edges)
                    if cf < 0.25:
                        findings.append({
                            "smell_id": "SMELL_MODULAR_MIRAGE",
                            "target": dir_path,
                            "severity": "CRITICAL",
                            "metrics": {
                                "cluster_factor": round(cf, 3),
                                "internal_edges": internal_edges,
                                "external_edges": external_edges
                            },
                            "description": (
                                "Modular Mirage detected: high physical file fragmentation "
                                f"with poor internal cohesion (Cluster Factor = {cf:.3f})."
                            )
                        })

                # Leaky Façade (UIOD Gateway Violation)
                targeted_internal_files = set()
                for f in files:
                    for caller in self.graph.predecessors(f):
                        if caller not in file_set:
                            targeted_internal_files.add(f)

                has_facade = any(
                    Path(f).name in {"index.ts", "index.js", "__init__.py"}
                    for f in files
                )

                if len(targeted_internal_files) > 2 and not has_facade:
                    findings.append({
                        "smell_id": "SMELL_LEAKY_FACADE",
                        "target": dir_path,
                        "severity": "MAJOR",
                        "metrics": {"unprotected_entrypoints": len(targeted_internal_files)},
                        "description": (
                            "Module lacks an explicit barrel/façade interface; external callers "
                            f"bind directly to {len(targeted_internal_files)} private files."
                        )
                    })

        # B. File Bloat Smells
        for node, data in self.graph.nodes(data=True):
            if data.get("type") == "File":
                loc = data.get("loc", 0)
                if loc > 500:
                    findings.append({
                        "smell_id": "SMELL_FILE_BLOAT",
                        "target": node,
                        "severity": "MAJOR",
                        "metrics": {"loc": loc, "threshold": 500},
                        "description": f"File size ({loc} LOC) exceeds structural maintainability thresholds."
                    })

        return findings

    def prioritize_hotspots(self, findings: list[dict]) -> list[dict]:
        """Ranks structural findings using commit churn and dependency blast radius."""
        severity_multipliers = {
            "CRITICAL": 3.0,
            "MAJOR": 2.0,
            "MINOR": 1.0
        }

        prioritized = []

        for finding in findings:
            target = finding["target"]
            churn = self._get_git_churn(target)

            if target in self.graph:
                blast_radius = len(nx.descendants(self.graph, target))
            else:
                dir_nodes = [n for n in self.graph.nodes if n.startswith(target)]
                descendants = set()
                for dn in dir_nodes:
                    descendants.update(nx.descendants(self.graph, dn))
                blast_radius = len(descendants)

            weight = severity_multipliers.get(finding["severity"], 1.0)
            score = weight * math.log(1 + churn) * math.sqrt(1 + blast_radius)

            prioritized.append({
                **finding,
                "churn_90d_commits": churn,
                "blast_radius": blast_radius,
                "hotspot_priority_score": round(score, 2)
            })

        return sorted(prioritized, key=lambda x: x["hotspot_priority_score"], reverse=True)

    def _get_git_churn(self, target_path: str) -> int:
        """Retrieves commit frequency from Git history over the past 90 days."""
        try:
            cmd = ["git", "rev-list", "--count", "--since=90.days", "HEAD", "--", target_path]
            res = subprocess.run(cmd, cwd=self.repo_root, capture_output=True, text=True, check=True)
            return int(res.stdout.strip() or 0)
        except Exception:
            return 0


def main():
    parser = argparse.ArgumentParser(description="CoBuilder Architectural Cohesion Engine")
    parser.add_argument("--repo", default=".", help="Target repository root path")
    parser.add_argument("--output", help="Destination path for JSON report")
    parser.add_argument("--format", choices=["json", "text"], default="text", help="Output format")
    args = parser.parse_args()

    engine = CodebaseAnalysisEngine(Path(args.repo))
    engine.build_graph()
    raw_smells = engine.detect_structural_smells()
    hotspots = engine.prioritize_hotspots(raw_smells)

    payload = {
        "repository": str(Path(args.repo).resolve()),
        "total_files": sum(1 for _, d in engine.graph.nodes(data=True) if d.get("type") == "File"),
        "total_dependencies": engine.graph.number_of_edges(),
        "total_hotspots_found": len(hotspots),
        "hotspots": hotspots
    }

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
        print(f"Analysis complete. Wrote {len(hotspots)} hotspots to {args.output}")
    else:
        if args.format == "json":
            print(json.dumps(payload, indent=2))
        else:
            print("\nCoBuilder Architectural Cohesion & Hotspot Analysis")
            print("=" * 75)
            print(f"Scanned Repository: {payload['repository']}")
            print(f"Files: {payload['total_files']} | Dependencies: {payload['total_dependencies']}")
            print(f"Identified Structural Hotspots: {payload['total_hotspots_found']}\n")

            for rank, item in enumerate(hotspots[:10], 1):
                print(f"[{rank}] {item['smell_id']} (Severity: {item['severity']})")
                print(f"    Target: {item['target']}")
                print(f"    Hotspot Score: {item['hotspot_priority_score']} | 90d Churn: {item['churn_90d_commits']} | Blast Radius: {item['blast_radius']}")
                print(f"    Rationale: {item['description']}\n")


if __name__ == "__main__":
    main()
```
