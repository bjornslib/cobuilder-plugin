---
title: SaaS Codebase Review Checklist
description: Comprehensive codebase review checklist for SaaS products. Covers security, architecture, quality, performance, testing, observability, business risk, and cloud/platform security across Python/FastAPI, Next.js/TypeScript, and Supabase stacks.
status: active
---

# Codebase Review Checklist for SaaS Products

Stack-adapted for **Python / FastAPI**, **Next.js / TypeScript**, and **Supabase**. Includes Go patterns where relevant.

## How to Use This Checklist

Run each detection command against your codebase. For every finding, follow the remediation pattern. Use the 5-phase scanner pipeline (Section 11) for automated analysis.

### Core Principles

- **Risk-based triage**: Critical and High findings block release. Medium findings require a documented decision. Low findings go to backlog.
- **Business language first**: Every finding includes a plain-language business impact so non-technical stakeholders understand the stakes.
- **Actionable findings**: Each finding must include a detection method, a remediation pattern, and a verification step. No "be careful" without a concrete fix.

---

## 1. Architecture Discovery Phase

Before scanning for problems, map the codebase structure. Every subsequent check depends on knowing where the entry points, boundaries, and data flows are.

### 1.1 Entry Point Mapping

Identify every way external traffic reaches your system.

| What to map | Detection command | Why it matters |
|-------------|-------------------|----------------|
| Framework entry points | `grep -rn "app = FastAPI\|app = Flask\|createApp\|NextResponse\|export default function handler" --include="*.py" --include="*.ts" --include="*.tsx"` | Unmapped endpoints are unprotected endpoints |
| Auth middleware | `grep -rn "Depends(require_auth\|Depends(get_current_user\|withAuth\|middleware.*auth\|clerkMiddleware\|supabase.auth" --include="*.py" --include="*.ts" --include="*.tsx"` | Auth must be enforced at the entry point, not inside handlers |
| Database connections | `grep -rn "create_engine\|SupabaseClient\|createClient\|prisma\.\|PrismaClient\|DATABASE_URL" --include="*.py" --include="*.ts" --include="*.tsx"` | Every DB connection is a potential isolation boundary |
| State stores | `grep -rn "redis\|valkey\|upstash\|zustand\|createStore\|session" --include="*.py" --include="*.ts" --include="*.tsx"` | State stores determine consistency and race-condition risk |
| Background jobs | `grep -rn "celery\|huey\|arq\|bull\|bullmq\|Inngest\|queue\|worker" --include="*.py" --include="*.ts" --include="*.tsx"` | Jobs bypass request-level auth and must have independent guards |
| Test entry points | `grep -rn "pytest\|jest\|vitest\|describe(\|it(\|test(" --include="*.py" --include="*.ts" --include="*.tsx" -l` | Test infrastructure can leak credentials or skip auth |
| Deployment targets | `grep -rn "Dockerfile\|docker-compose\|railway\|vercel\|netlify\|fly\.io\|render" Dockerfile docker-compose* .github/ vercel.json netlify.toml fly.toml render.yaml railway.json 2>/dev/null` | Deployment config controls network exposure and secrets |

### 1.2 Directory Structure Analysis

```
# Walk the tree and identify architectural layers
find . -type f \( -name "*.py" -o -name "*.ts" -o -name "*.tsx" \) \
  | sed 's|/[^/]*$||' | sort -u | head -60
```

Look for:

- **Layer separation**: Do `routes/`, `services/`, `models/`, `repositories/` exist as distinct directories?
- **Circular references**: Does `routes/` import from `models/` which imports back from `routes/`?
- **God directories**: Does a single directory contain 20+ files or files over 500 lines?
- **Orphan directories**: Directories with no imports from the rest of the codebase (dead code or accidental exposure)

### 1.3 Cross-Reference Graph

Build a dependency graph to find boundary violations.

```bash
# Python: extract imports between packages
grep -rn "^from \|^import " --include="*.py" \
  | sed 's/:.*//;s/.*from //;s/ import .*//' \
  | sort | uniq -c | sort -rn | head -30

# TypeScript: extract imports between packages
grep -rn "from ['\"].*['\"]" --include="*.ts" --include="*.tsx" \
  | sed "s/.*from ['\"]//;s['\"].*//" \
  | sort | uniq -c | sort -rn | head -30
```

| Violation type | Detection | Severity |
|---------------|-----------|----------|
| Routes importing DB clients directly | `grep -rn "from sqlalchemy\|import sqlite3\|prisma\.\|SupabaseClient" --include="*.py" --include="*.ts" \| grep "routes\|api\|endpoints\|app/api"` | High |
| Circular imports between layers | `python3 -c "import <pkg>.models; import <pkg>.routes" 2>&1 \| grep -i "circular\|ImportError"` | Medium |
| High fan-out (>10 imports) | `grep -rn "^from \|^import " --include="*.py" \| sed 's/:.*//' \| sort \| uniq -c \| sort -rn \| awk '$1 > 10'` | Medium |
| High fan-in (>10 dependents) | `grep -rn "from.*models\|import.*models" --include="*.py" \| wc -l` — if >10 dependents on one module, it is a coupling hotspot | Medium |

---

## 2. Security Scanning

### 2.1 Authentication & Session Security

**What the scanner looks for**: Endpoints and routes that lack authentication decorators, middleware, or dependency injection. Client-side code that assumes auth state without server verification. Session management that allows fixation or replay. Auth bypass paths through middleware ordering.

**How it detects**: Grep for route decorators without auth dependencies. Check middleware registration order. Trace session lifecycle for regeneration patterns.

| Check | Detection command | Severity | Business impact |
|-------|-------------------|----------|-----------------|
| Unprotected FastAPI endpoints | `grep -rn "@app\.\(get\|post\|put\|delete\|patch\)" --include="*.py" \| grep -v "Depends(require_auth\|Depends(get_current_user\|health"` | Critical | Unauthenticated users access protected data |
| Unprotected Next.js API routes | `grep -rn "export.*GET\|export.*POST\|export.*PUT\|export.*DELETE" --include="*.ts" app/api/ \| grep -v "withAuth\|auth\|session\|clerk\|supabase.auth"` | Critical | Unauthenticated API access |
| Client-side auth assumptions | `grep -rn "useAuth\|useUser\|currentUser\|isAuthenticated" --include="*.tsx" --include="*.ts" \| grep -v "useServer\|server\|api"` | High | Client can bypass by modifying state |
| JWT without expiry | `grep -rn "exp\|expiry\|expires_delta" --include="*.py" \| grep -i "jwt\|token" \| grep -v "exp\|expires"` | High | Tokens valid forever; no rotation possible |
| Session fixation | `grep -rn "session_id\|session(" --include="*.py" \| grep -v "regenerate\|rotate\|new\|destroy"` | High | Attacker fixes session; user logs into attacker's session |
| Auth middleware ordering bypass | `grep -rn "app.add_middleware\|app.use(" --include="*.py" --include="*.ts" -A1 \| grep -B1 "CORS\|cors" \| grep "auth\|session"` | High | CORS middleware before auth means unauthenticated preflight reaches auth-protected routes |

**Remediation -- Missing Auth Dependency (FastAPI):**

```python
# Bad -- no auth check
@app.get("/api/users")
def list_users():
    return db.query(User).all()

# Good -- auth dependency on every endpoint
@app.get("/api/users")
def list_users(current_user: User = Depends(require_auth)):
    return user_repo.list_for_tenant(current_user.tenant_id)
```

**Remediation -- Missing Auth in Next.js API Route:**

```typescript
// Bad -- no auth check
export async function GET(request: Request) {
  const data = await db.query("SELECT * FROM users");
  return Response.json(data);
}

// Good -- auth check before data access
export async function GET(request: Request) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const data = await db.query(
    "SELECT * FROM users WHERE tenant_id = $1",
    [session.user.tenant_id]
  );
  return Response.json(data);
}
```

### 2.2 Authorization & Access Control

**What the scanner looks for**: Queries that lack tenant_id filters, Supabase RLS policies that are missing or disabled, object lookups that skip ownership checks, privilege escalation paths through role-missing admin endpoints.

**How it detects**: Grep for database queries without tenant or owner filters. Check Supabase RLS policy existence via migration files. Trace object-ID parameters that reach the database without ownership verification.

| Check | Detection command | Severity | Business impact |
|-------|-------------------|----------|-----------------|
| Missing tenant_id filter on queries | `grep -rn "SELECT\|\.query\|\.filter\|\.where\|\.findMany\|\.findFirst" --include="*.py" --include="*.ts" \| grep -v "tenant_id\|tenant\|organization_id"` | Critical | Cross-tenant data exposure |
| IDOR -- object lookup without ownership check | `grep -rn "\.get(\|\.filter_by(id=\|\.findUnique(\|\.findFirst(" --include="*.py" --include="*.ts" \| grep -v "tenant_id\|owner_id\|user_id\|where.*userId"` | Critical | User accesses another tenant's resources |
| Service-role key used for user requests | `grep -rn "SERVICE_ROLE_KEY\|supabase_service_role\|admin_client\|service_role" --include="*.py" --include="*.ts" \| grep -v "admin/\|cron\|background\|migration\|seed"` | High | Bypasses all tenant isolation |
| Missing RLS policies on Supabase tables | `grep -rn "CREATE POLICY\|ENABLE ROW LEVEL SECURITY" supabase/migrations/ --include="*.sql" \| wc -l` vs `grep -rn "CREATE TABLE" supabase/migrations/ --include="*.sql" \| wc -l` — if policies < tables, some tables lack RLS | Critical | Any client can read/write all rows |
| RLS bypassed with anon key | `grep -rn "anon.*key\|ANON_KEY\|supabase_anon" --include="*.py" --include="*.ts" \| grep -v "public\|read_only\|rls"` | High | Anon key has no role claims; RLS must be perfect |
| Role check missing on admin endpoints | `grep -rn "admin\|manage\|delete_all\|/admin" --include="*.py" --include="*.ts" \| grep -v "require_admin\|require_role\|isAdmin\|role.*check"` | High | Regular users perform admin actions |
| Privilege escalation via parameter manipulation | `grep -rn "role\|is_admin\|permissions\|tier" --include="*.py" --include="*.ts" \| grep "request\.\|body\.\|params\.\|query\." \| grep -v "validate\|verify\|check\|assert"` | High | User sets their own role via request body |

**Remediation -- Tenant-Scoped Queries (FastAPI/SQLAlchemy):**

```python
# Bad -- no tenant filter
stmt = select(Report).where(Report.id == report_id)

# Good -- always scope by tenant
stmt = select(Report).where(
    Report.id == report_id,
    Report.tenant_id == current_user.tenant_id,
)
```

**Remediation -- IDOR Prevention (Next.js/Prisma):**

```typescript
// Bad -- accepts any ID without ownership check
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const report = await prisma.report.findUnique({
    where: { id: params.id },
  });
  return Response.json(report);
}

// Good -- scoped to authenticated user's tenant
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const report = await prisma.report.findFirst({
    where: {
      id: params.id,
      tenantId: session.user.tenant_id,
    },
  });
  if (!report) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(report);
}
```

**Remediation -- Supabase RLS Policy:**

```sql
-- Bad -- no RLS
CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  data jsonb
);

-- Good -- enable RLS and add policy
CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  data jsonb
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON reports
  USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

### 2.3 Input Handling & Injection Defense

**What the scanner looks for**: SQL/NoSQL injection via string interpolation, XSS via unescaped output, command injection via shell execution, path traversal via unsanitized file paths, deserialization of untrusted data.

**How it detects**: Grep for f-string SQL, raw query construction, `shell=True`, unescaped output rendering, `pickle.loads` on user input, and path joins without validation.

| Check | Detection command | Severity | Business impact |
|-------|-------------------|----------|-----------------|
| SQL injection via f-strings | `grep -rn 'f".*SELECT\|f".*INSERT\|f".*UPDATE\|f".*DELETE\|f`SELECT\|f`INSERT' --include="*.py"` | Critical | Full database compromise |
| SQL injection via template literals | `grep -rn '\$\{.*\}.*FROM\|`SELECT.*\$\{.*\}\|\.query(\`SELECT' --include="*.ts" --include="*.tsx"` | Critical | Full database compromise |
| NoSQL injection | `grep -rn '\$where\|\$gt\|\$ne\|\$regex\|\$expr" --include="*.py" --include="*.ts" \| grep -v "sanitiz\|escap\|valid"` | Critical | Full database compromise |
| Command injection via shell=True | `grep -rn "shell=True" --include="*.py"` | Critical | Arbitrary command execution on server |
| Command injection via os.system | `grep -rn "os\.system(\|os\.popen(\|subprocess\.call(.*shell" --include="*.py" --include="*.ts"` | Critical | Arbitrary command execution on server |
| XSS via dangerouslySetInnerHTML | `grep -rn "dangerouslySetInnerHTML\|v-html\|innerHTML" --include="*.tsx" --include="*.ts" --include="*.vue"` | High | Script injection in user browsers |
| Path traversal | `grep -rn "open(.*+\|Path(.*+\|readFile(.*+\|writeFile(.*+" --include="*.py" --include="*.ts" \| grep -v "resolve\|is_relative_to\|normalize\|sanitize"` | High | Read any file on the server |
| Deserialization of untrusted data | `grep -rn "pickle\.loads\|yaml\.load(\|marshal\.loads\|eval(" --include="*.py" \| grep -v "SafeLoader\|safe_load"` | Critical | Remote code execution |
| Missing Pydantic validation on endpoints | `grep -rn "Request\|Body\|request: Request" --include="*.py" \| grep -v "BaseModel\|Pydantic"` | Medium | Malformed input reaches business logic |
| Missing Zod/validation on API routes | `grep -rn "export.*POST\|export.*PUT\|export.*PATCH" --include="*.ts" app/api/ \| grep -v "z\.object\|z\.string\|schema\|validate\|parse"` | Medium | Malformed input reaches business logic |

**Remediation -- SQL Injection (Python):**

```python
# Bad
cursor.execute(f"SELECT * FROM users WHERE name = '{name}'")

# Good -- parameterized query
cursor.execute("SELECT * FROM users WHERE name = %s", (name,))
```

**Remediation -- SQL Injection (TypeScript/Prisma):**

```typescript
// Bad -- raw SQL with interpolation
await prisma.$queryRaw`SELECT * FROM users WHERE name = ${name}`;

// Good -- parameterized raw query
await prisma.$queryRaw`SELECT * FROM users WHERE name = ${Prisma.sql`${name}`}`;

// Better -- use Prisma client methods
await prisma.user.findMany({ where: { name } });
```

**Remediation -- Command Injection:**

```python
# Bad
subprocess.run(f"convert {user_filename} output.png", shell=True)

# Good -- explicit arg list, shell=False
ALLOWED_FORMATS = {"png", "jpg", "webp"}
suffix = Path(user_filename).suffix.lstrip(".")
if suffix not in ALLOWED_FORMATS:
    raise HTTPException(400, f"Unsupported format: {suffix}")
subprocess.run(["convert", user_filename, "output.png"], shell=False, check=True)
```

**Remediation -- Path Traversal:**

```python
# Bad -- user controls the path
filepath = os.path.join("/data", request.query_params["file"])
with open(filepath) as f:
    return f.read()

# Good -- resolve and verify containment
base_dir = Path("/data").resolve()
filepath = (base_dir / request.query_params["file"]).resolve()
if not filepath.is_relative_to(base_dir):
    raise HTTPException(403, "Access denied")
with open(filepath) as f:
    return f.read()
```

### 2.4 Secrets & Credentials

**What the scanner looks for**: Hardcoded API keys and tokens, credentials in log output, .env files committed to git, over-privileged service keys, missing rotation procedures.

**How it detects**: Regex for known key patterns (sk-, AKIA, private keys). Grep for credential variable names near log/print calls. Check git tracked files for .env. Audit service key usage scope.

| Check | Detection command | Severity | Business impact |
|-------|-------------------|----------|-----------------|
| Hardcoded API keys | `grep -rn "sk-\|AKIA\|-----BEGIN.*PRIVATE KEY\|ghp_\|gho_\|xox[bpas]-" --include="*.py" --include="*.ts" --include="*.tsx" --include="*.env"` | Critical | Key is published via every repo clone |
| Credentials in log output | `grep -rn "logger\.\|log\.\|console\.log\|print(" --include="*.py" --include="*.ts" \| grep "api_key\|password\|secret\|token\|credential"` | High | Credentials visible in log aggregators |
| .env committed to git | `git ls-files \| grep "\.env$" \| grep -v "\.env\.example\|\.env\.template\|\.env\.local"` | Critical | All secrets in version control |
| Missing secret rotation | Check deployment scripts for rotation procedures; `grep -rn "rotate\|rotation\|expire.*key\|key.*expire" --include="*.py" --include="*.ts" --include="*.yml"` | Medium | Leaked secrets stay valid indefinitely |
| Over-privileged service keys | `grep -rn "service_role\|admin.*key\|supabase_service_role_key" --include="*.py" --include="*.ts" \| grep -v "cron\|migration\|seed\|background\|admin.*route"` | High | Service key bypasses all auth and RLS |
| Secrets in client-side code | `grep -rn "NEXT_PUBLIC_.*SECRET\|NEXT_PUBLIC_.*KEY\|NEXT_PUBLIC_.*TOKEN\|NEXT_PUBLIC_.*PASSWORD" --include="*.ts" --include="*.tsx" --include="*.env*"` | Critical | Secrets exposed in browser bundle |
| Default credentials in Docker images | `grep -rn "ADMIN_PASSWORD\|DEFAULT_PASSWORD\|ROOT_PASSWORD" Dockerfile* docker-compose* --include="*.yml" --include="*.yaml" \| grep -v "changeme\|replace\|TODO"` | High | Default passwords in production |

**Remediation -- Hardcoded Key:**

```python
# Bad
OPENAI_API_KEY = "sk-proj-abc123..."

# Good -- env var with startup validation
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    openai_api_key: str  # Fails at startup if not set

    class Config:
        env_file = ".env"
```

**Remediation -- Secrets in Client-Side Code:**

```typescript
// Bad -- prefixed with NEXT_PUBLIC_, exposed in browser
const apiKey = process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY;

// Good -- secret keys stay server-side only
// In a Server Action or API route (not in client components):
const apiKey = process.env.STRIPE_SECRET_KEY;

// Only public keys go in NEXT_PUBLIC_
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
```

### 2.5 Data Protection & Privacy

**What the scanner looks for**: PII stored without encryption, missing HTTPS enforcement, sensitive data in URLs, data retained beyond legal requirements, missing data classification.

**How it detects**: Grep for PII field names near storage operations. Check for HTTP URLs in production config. Audit data retention policies in migration files.

| Check | Detection command | Severity | Business impact |
|-------|-------------------|----------|-----------------|
| PII stored unencrypted | `grep -rn "ssn\|credit_card\|phone_number\|date_of_birth\|social_security\|passport" --include="*.py" --include="*.ts" \| grep -v "encrypt\|hash\|mask\|redact\|truncat"` | High | Regulatory violation (GDPR, CCPA) |
| Missing HTTPS enforcement | `grep -rn "http://" --include="*.py" --include="*.ts" --include="*.tsx" --include="*.go" \| grep -v "localhost\|127\.0\.0\.1\|example\.com\|0\.0\.0\.0"` | High | Data in transit readable by network attacker |
| Sensitive data in URLs | `grep -rn "api_key=\|token=\|password=\|ssn=" --include="*.py" --include="*.ts" \| grep -i "url\|href\|request\|fetch\|searchParams"` | Medium | Credentials in server logs and browser history |
| Missing data classification | `grep -rn "class.*Model\|interface.*Model\|CREATE TABLE" --include="*.py" --include="*.ts" --include="*.sql" \| grep -c "classification\|data_class\|sensitivity\|pii"` — if 0, no classification exists | Low | Cannot determine which data requires protection |
| Data retained beyond legal requirements | `grep -rn "retention\|delete_after\|expire_at\|purge\|GDPR\|CCPA" --include="*.py" --include="*.ts" --include="*.sql" \| wc -l` — if 0, no retention policy | Medium | Legal liability from over-retention |
| PII in log output | `grep -rn "logger\.\|log\.\|console\.log" --include="*.py" --include="*.ts" \| grep "email\|phone\|address\|name.*user\|ip_address"` | Medium | PII in log aggregators violates privacy regulations |

**Remediation -- PII Encryption at Rest:**

```python
# Bad -- plaintext PII in database
class User(Base):
    ssn = Column(String)  # stored as plaintext

# Good -- encrypted PII with dedicated column type
from cryptography.fernet import Fernet

class EncryptedString(TypeDecorator):
    impl = String(512)
    key = Fernet(os.environ["PII_ENCRYPTION_KEY"])

    def process_bind_param(self, value, dialect):
        return self.key.encrypt(value.encode()).decode()

    def process_result_value(self, value, dialect):
        return self.key.decrypt(value.encode()).decode()

class User(Base):
    ssn = Column(EncryptedString)  # encrypted at rest
```

### 2.6 API & Webhook Security

**What the scanner looks for**: Webhook endpoints that do not verify signatures, missing rate limiting, overly permissive CORS, error details leaked to clients, bulk endpoints without safeguards.

**How it detects**: Grep for webhook handlers without signature verification. Check for rate-limiting middleware. Audit CORS configuration. Trace error handling paths.

| Check | Detection command | Severity | Business impact |
|-------|-------------------|----------|-----------------|
| Unverified webhook signatures | `grep -rn "webhook" --include="*.py" --include="*.ts" \| grep -v "verify\|signature\|hmac\|validate\|crypto"` | Critical | Forged events trigger unauthorized actions |
| Missing rate limiting | `grep -rn "@app\.\(post\|put\|delete\)\|export.*POST\|export.*PUT\|export.*DELETE" --include="*.py" --include="*.ts" \| grep -v "limit\|throttle\|Limiter\|rate"` | High | Denial-of-wallet on LLM endpoints |
| Overly permissive CORS | `grep -rn "allow_origins.*\*\|Access-Control-Allow-Origin.*\*\|origin.*\*" --include="*.py" --include="*.ts" --include="*.tsx"` | High | Any website steals authenticated data |
| Error details leaked to client | `grep -rn "traceback\|stack\|exc_info\|stackTrace\|error\.stack" --include="*.py" --include="*.ts" \| grep -v "logger\|logging\|console\.error\|serverSide"` | Medium | Internal infrastructure details exposed |
| Bulk endpoints without safeguards | `grep -rn "bulk\|batch\|/import\|/sync\|mass" --include="*.py" --include="*.ts" \| grep -v "limit\|max\|cap\|validate\|auth\|admin"` | High | Unbounded operations exhaust resources or corrupt data |
| Missing idempotency on state-changing endpoints | `grep -rn "@app\.post\|export.*POST" --include="*.py" --include="*.ts" \| grep -v "idempotency\|idempotent\|dedup\|event_id\|request_id"` | Medium | Retries cause duplicate side effects |

**Remediation -- Webhook Signature Verification (Python):**

```python
# Bad -- trusts payload without verification
@app.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    payload = await request.json()
    process_event(payload)  # forged events accepted

# Good -- HMAC signature + idempotency
@app.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    raw = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    if not verify_signature(raw, sig):
        raise HTTPException(400, "Invalid signature")
    payload = await request.json()
    event_id = payload["id"]
    if event_id in processed_events:
        return {"status": "already_processed"}
    processed_events.add(event_id)
    process_event(payload)
    return {"status": "received"}
```

**Remediation -- Webhook Signature Verification (Next.js):**

```typescript
// Bad -- trusts payload without verification
export async function POST(request: Request) {
  const payload = await request.json();
  processEvent(payload); // forged events accepted
  return Response.json({ received: true });
}

// Good -- HMAC signature verification
import { createHmac } from "crypto";

export async function POST(request: Request) {
  const raw = await request.text();
  const sig = request.headers.get("stripe-signature") ?? "";
  const expected = createHmac("sha256", process.env.WEBHOOK_SECRET!)
    .update(raw)
    .digest("hex");
  if (sig !== expected) {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }
  const payload = JSON.parse(raw);
  processEvent(payload);
  return Response.json({ received: true });
}
```

### 2.7 Dependency & Supply-Chain

**What the scanner looks for**: Unpinned dependencies, missing lockfiles, known CVEs, suspicious packages, license conflicts, lockfile integrity gaps.

**How it detects**: Check pin format in requirements/package.json. Verify lockfile existence and age. Run audit tools. Check license fields.

| Check | Detection command | Severity | Business impact |
|-------|-------------------|----------|-----------------|
| Unpinned Python dependencies | `grep -rn "^[a-zA-Z]" requirements.txt \| grep -v "=="` | High | Build breaks or installs compromised release |
| Unpinned npm dependencies | `grep -rn '"dependencies"' -A50 package.json \| grep '": "^' \| grep -v "workspace:\|peer"` | High | Build breaks or installs compromised release |
| Missing lockfile | `test -f uv.lock -o -f poetry.lock -o -f package-lock.json -o -f pnpm-lock.yaml -o -f yarn.lock -o -f go.sum || echo "NO LOCKFILE"` | High | Non-reproducible builds |
| Known CVEs in dependencies | `pip-audit -r requirements.txt --strict 2>&1 \| grep -c "vulnerability"; npm audit --json 2>&1 \| jq '.metadata.vulnerabilities' 2>/dev/null` | High | Known exploitable code in production |
| Missing integrity hashes | `grep -c "sha256" requirements.txt \| grep "^0$"; grep -c "integrity" package-lock.json \| head -1` | Medium | MITM can substitute malicious package |
| Suspicious package names (typosquatting) | `grep -rn "from \|import " --include="*.py" \| sed 's/.*from //;s/ import .*//' \| sort -u \| grep -i "reqeusts\|nmp\|pythom\|lodash\|reacat"` | High | Typosquatted packages are often malicious |
| License conflicts | `pip-licenses --format=json 2>/dev/null \| jq '.[] \| select(.License == "GPL")' 2>/dev/null; npx license-checker --failOn "GPL" 2>/dev/null` | Medium | GPL license forces code disclosure |

**Remediation -- Pinned Dependencies:**

```text
# Bad -- requirements.txt
requests
flask
sqlalchemy

# Good -- pinned with hashes
requests==2.32.3 \
    --hash=sha256:a1b2c3d4e5f6...
flask==3.0.3 \
    --hash=sha256:b7c8d9e0f1a2...
sqlalchemy==2.0.31 \
    --hash=sha256:c3d4e5f6a7b8...
```

```text
# Bad -- package.json dependencies with caret ranges
"dependencies": {
  "next": "^14.0.0",
  "react": "^18.0.0"
}

# Good -- exact versions with lockfile
"dependencies": {
  "next": "14.2.4",
  "react": "18.3.1"
}
# Plus committed package-lock.json or pnpm-lock.yaml
```

---

## 3. Architecture Scan

### 3.1 Layer Boundary Enforcement

**What the scanner looks for**: API routes that import database clients directly. Domain models that import I/O libraries. View components that call data layers. Configuration that leaks across layers.

**How it detects**: Grep for framework imports in wrong directories. Check import direction (routes should import services, not models importing routes). Verify dependency direction matches layer hierarchy.

| Check | Detection command | Severity | Business impact |
|-------|-------------------|----------|-----------------|
| API routes importing database clients | `grep -rn "from sqlalchemy\|import sqlite3\|prisma\.\|SupabaseClient\|createClient" --include="*.py" --include="*.ts" \| grep "routes\|api\|endpoints\|app/api"` | High | Untrusted input reaches DB without validation |
| Domain models importing I/O | `grep -rn "import os\|import requests\|import subprocess\|import httpx\|fetch(" --include="*.py" domain/ models/ lib/` | High | Domain logic coupled to infrastructure; hard to test |
| View components calling data layer | `grep -rn "prisma\.\|supabase\|createClient\|from.*db\|from.*repository" --include="*.tsx" components/ \| grep -v "server\|use server\|useEffect.*fetch"` | High | Client-side rendering depends on DB schema |
| Circular imports between layers | `python3 -c "import importlib; import models; import routes" 2>&1 \| grep "circular\|ImportError"` | Medium | Hidden coupling causes cascading failures |
| Configuration leaking across layers | `grep -rn "os\.environ\|process\.env" --include="*.py" --include="*.ts" \| grep -v "config\|settings\|env\|constants" \| wc -l` — if >5, env access is scattered | Low | Config changes require hunting through many files |

**Remediation -- Layer Separation (FastAPI):**

```python
# Bad -- API route directly uses database
@app.post("/users")
def create_user(name: str, db: Session = Depends(get_db)):
    db.execute(text("INSERT INTO users (name) VALUES (:name)"), {"name": name})

# Good -- route depends on repository interface
@app.post("/users")
def create_user(req: CreateUserRequest, repo: UserRepository = Depends(get_repo)):
    user = User(name=req.name, email=req.email)
    errors = user.validate()
    if errors:
        raise HTTPException(400, detail=errors)
    return repo.save(user)
```

**Remediation -- Layer Separation (Next.js):**

```typescript
// Bad -- Server Component directly queries database inline
export default async function UserList() {
  const users = await sql`SELECT * FROM users`;
  return <UserTable users={users} />;
}

// Good -- Server Component calls data layer function
import { getUsers } from "@/data/users";

export default async function UserList() {
  const users = await getUsers();
  return <UserTable users={users} />;
}

// data/users.ts -- dedicated data access layer
export async function getUsers() {
  return sql`SELECT id, name FROM users`;
}
```

### 3.2 Service & Module Cohesion

**What the scanner looks for**: God modules with excessive line counts. Mixed concerns in single files. Modules with too many public exports. Feature modules that depend on other feature modules.

**How it detects**: Line count analysis. Cross-reference count per file. Import dependency between feature directories.

| Check | Detection command | Severity | Business impact |
|-------|-------------------|----------|-----------------|
| God modules (>500 lines) | `find . -name "*.py" -o -name "*.ts" -o -name "*.tsx" \| xargs wc -l \| sort -rn \| head -20 \| awk '$1 > 500'` | Medium | Changes ripple unpredictably |
| Mixed concerns in one file | `grep -l "import smtplib\|import sqlite3\|import redis" --include="*.py" \| xargs grep -l "import requests\|import httpx\|import flask"` | Medium | Multiple axes of change tangled |
| Too many exports from one module | `grep -rn "^export " --include="*.ts" --include="*.tsx" \| sed 's/:.*//' \| sort \| uniq -c \| sort -rn \| awk '$1 > 10'` | Low | Module has no single responsibility |
| Cross-feature dependencies | `grep -rn "from.*feature.*import\|import.*feature" --include="*.py" --include="*.ts" features/ \| grep -v "shared\|common\|types"` | Medium | Feature coupling prevents independent deployment |

### 3.3 Prompt-Driven Sprawl Detection

**What the scanner looks for**: Prompt templates scattered across the codebase. Hardcoded system messages. Prompt strings that embed business logic. Duplicate prompts with slight variations.

**How it detects**: Grep for prompt assignment patterns. Count prompt string locations. Check for prompt string deduplication.

| Check | Detection command | Severity | Business impact |
|-------|-------------------|----------|-----------------|
| Prompt templates scattered across codebase | `grep -rn "prompt.*=\|system.*=\|PROMPT\|SYSTEM_MSG" --include="*.py" --include="*.ts" \| wc -l` — if >10 locations, sprawl exists | Medium | Inconsistent agent behavior; hard to audit |
| Hardcoded system messages | `grep -rn '"system".*:.*"' --include="*.py" --include="*.ts" \| grep -v "template\|jinja\|yaml\|config\|prompt_template"` | Medium | Cannot update without code deployment |
| Business logic in prompt strings | `grep -rn "if.*in prompt\|prompt.*contains\|prompt.*include" --include="*.py" --include="*.ts"` | High | Prompt injection changes business behavior |
| Duplicate prompt fragments | `grep -rn "You are a\|You are an\|Your task is\|As an AI" --include="*.py" --include="*.ts" \| sort \| uniq -c \| sort -rn \| awk '$1 > 1'` | Low | Inconsistent behavior from copy-paste drift |

**Remediation -- Prompt Template Centralization:**

```python
# Bad -- prompts scattered inline
response = openai.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "You are a helpful assistant that summarizes documents."},
        {"role": "user", "content": user_input},
    ],
)

# Good -- prompts loaded from templates directory
from myapp.prompts import load_prompt

system_prompt = load_prompt("summarize_documents")
response = openai.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_input},
    ],
)
```

### 3.4 Database Access Pattern Analysis

**What the scanner looks for**: N+1 queries. Raw SQL outside the repository layer. Missing indexes on frequently queried columns. Unbounded result sets. Schema drift between code and migrations.

**How it detects**: Grep for query patterns inside loops. Check for ORM calls outside repository/service directories. Compare WHERE clause columns against index definitions. Look for unpaginated queries.

| Check | Detection command | Severity | Business impact |
|-------|-------------------|----------|-----------------|
| N+1 queries | `grep -rn "for .* in .*:" --include="*.py" -A5 \| grep "db\.\|session\.\|execute\|prisma\.\|findMany\|findFirst"` | High | Performance cliff under load |
| Raw SQL outside repository | `grep -rn "text(\|execute(\|\.raw(\|\$queryRaw" --include="*.py" --include="*.ts" \| grep -v "repository\|repo\|model\|migration\|seed\|data/"` | Medium | No centralized query validation |
| Missing indexes on filtered columns | `grep -rn "WHERE\|\.filter\|\.where\|where:" --include="*.py" --include="*.ts" \| sed 's/.*where.*://;s/.*=.*//' \| sort -u \| while read col; do grep -rn "Index\|index.*$col\|CREATE INDEX.*$col" migrations/ --include="*.sql" \| wc -l; done \| grep "^0"` | High | Queries degrade as data grows |
| Unbounded result sets | `grep -rn "\.all()\|\.scalars()\|findMany()\|findMany({" --include="*.py" --include="*.ts" \| grep -v "limit\|slice\|paginate\|take\|cursor"` | High | OOM on large tables |
| Schema drift | `diff <(grep -rn "Column\|Field\|column\|field" models/ --include="*.py" \| sort) <(grep -rn "ALTER TABLE\|ADD COLUMN\|CREATE TABLE" migrations/ --include="*.sql" \| sort) \| head -20` | Medium | Code and database out of sync |

---

## 4. Code Quality & Maintainability Scan

### 4.1 Complexity & Readability

**What the scanner looks for**: Long functions. Deep nesting. High cyclomatic complexity. Magic numbers. Unclear variable names.

**How it detects**: Line count per function. Nesting depth via indentation analysis. Branch counting. Grep for numeric literals without named constants.

| Check | Detection command | Severity | Business impact |
|-------|-------------------|----------|-----------------|
| Functions > 50 lines | `find . -name "*.py" -exec awk '/^def /{start=NR; name=$0} NR-start>50 && /^def /{print FILENAME":"start" "name}' {} \;` | Medium | Hard to review; bugs hide in length |
| Deep nesting (>4 levels) | `grep -Prn "^( {16,}|\t{4,})if " --include="*.py" --include="*.ts" --include="*.tsx"` | Medium | Cognitive overload; test coverage gaps |
| Magic numbers | `grep -rn "[^0-9a-zA-Z_][0-9]\{2,\}[^0-9a-zA-Z_\.]" --include="*.py" --include="*.ts" \| grep -v "test\|spec\|constant\|enum\|const \|MAX_\|MIN_\|DEFAULT_"` | Low | Intent unclear; changes require hunting |
| Duplicate code blocks | `find . -name "*.py" \| xargs -I{} sh -c 'wc -l < {} \| awk "{print \\$1, \\$2}"' \| sort -rn \| head -20` then manual diff of large files | Low | Bug fixes must be applied in multiple places |

### 4.2 Error Handling Consistency

**What the scanner looks for**: Bare except clauses. Swallowed exceptions. Inconsistent error response formats. Missing error handling for external service calls.

**How it detects**: Grep for bare except and pass patterns. Check error response schemas. Trace external call paths for try/catch coverage.

| Check | Detection command | Severity | Business impact |
|-------|-------------------|----------|-----------------|
| Bare except clauses | `grep -rn "except:" --include="*.py" \| grep -v "raise\|logger\|log\|Exception\|BaseException"` | High | Swallows errors; hides failures |
| Swallowed exceptions | `grep -rn "except.*:\s*pass\|catch.*{\s*}" --include="*.py" --include="*.ts"` | High | Silent failures corrupt state |
| Inconsistent error response format | `grep -rn "HTTPException\|raise HTTPException\|Response\.json.*error" --include="*.py" --include="*.ts" \| sed 's/.*detail.*:.*//;s/.*error.*:.*//' \| sort -u \| wc -l` — if >3 distinct patterns, inconsistency exists | Medium | Frontend must handle multiple error shapes |
| Missing error handling for external calls | `grep -rn "requests\.\|httpx\.\|fetch(\|openai\." --include="*.py" --include="*.ts" -l \| xargs grep -L "try\|except\|catch\|\.catch"` | High | Network failures cause unhandled crashes |

### 4.3 Edge Case & Null Safety

**What the scanner looks for**: Null/undefined access without checks. Missing default values. Race conditions in concurrent access. Off-by-one errors in pagination.

**How it detects**: Grep for optional chaining gaps. Check for None/null comparisons. Audit pagination boundaries.

| Check | Detection command | Severity | Business impact |
|-------|-------------------|----------|-----------------|
| Optional chaining gaps in TypeScript | `grep -rn "\.\w*\.\w*\.\w*" --include="*.ts" --include="*.tsx" \| grep -v "?\.\|optional\|null\|undefined\|NonNullable\|!"` | Medium | Runtime TypeError on null access |
| None access without check in Python | `grep -rn "\.get(" --include="*.py" \| grep -v "if \|or \|None\|default\|= .* or"` | Medium | AttributeError on missing keys |
| Missing pagination bounds | `grep -rn "skip\|offset\|page\|cursor\|take" --include="*.py" --include="*.ts" \| grep -v "min\|max\|limit\|clamp\|validate\|0\|default"` | Medium | Negative or zero page values cause errors |
| Race conditions on shared state | `grep -rn "global \|shared\|singleton\|_instance" --include="*.py" --include="*.ts" \| grep -v "lock\|mutex\|atomic\|threading\|synchronized"` | High | Concurrent requests corrupt shared state |

### 4.4 Type Safety & Schema Alignment

**What the scanner looks for**: Missing return type annotations. Any type usage. Schema mismatches between API contracts and database models. Runtime type errors that a type checker would catch.

**How it detects**: Grep for function definitions without return types. Check for Any usage. Compare Pydantic/Zod schemas with database models.

| Check | Detection command | Severity | Business impact |
|-------|-------------------|----------|-----------------|
| Missing return type annotations | `grep -rn "^def \|^    def \|async def " --include="*.py" \| grep -v " -> "` | Medium | Type errors caught at runtime, not compile time |
| Any type usage | `grep -rn "Any\|typing.Any\|: any" --include="*.py" --include="*.ts" \| grep -v "# type: ignore\|import\|// @ts-\|unknown"` | Low | Type checker provides no protection |
| API schema drift from DB model | `diff <(grep -rn "class.*BaseModel\|class.*Schema" --include="*.py" api/ \| sort) <(grep -rn "class.*Model\|class.*Base" --include="*.py" models/ \| sort) \| head -20` | Medium | API returns fields that no longer exist in DB |
| Missing Zod schemas for API routes | `grep -rn "export.*POST\|export.*PUT\|export.*PATCH" --include="*.ts" app/api/ -l \| xargs grep -L "z\.\|zod\|schema" 2>/dev/null` | Medium | Untyped request bodies reach handlers |

### 4.5 Documentation & Onboarding

**What the scanner looks for**: Missing README. Undocumented public APIs. Missing ADRs for architectural decisions. No onboarding guide.

**How it detects**: Check for README files. Grep for docstring coverage. Check for ADR directory.

| Check | Detection command | Severity | Business impact |
|-------|-------------------|----------|-----------------|
| Missing README | `test -f README.md && echo "EXISTS" || echo "MISSING"` | Medium | New developers cannot orient themselves |
| Missing docstrings on public functions | `grep -rn "^def \|^async def " --include="*.py" \| grep -v "test\|_" \| while read line; do f=$(echo "$line" \| cut -d: -f1); n=$(echo "$line" \| cut -d: -f2); sed -n "$((n+1))p" "$f" \| grep -q '"""' \|\| echo "NO_DOC: $f:$n"; done` | Low | Public API is opaque without reading source |
| Missing ADRs | `test -d docs/adr -o -d adr -o -d .adr && echo "EXISTS" || echo "MISSING"` | Low | Architectural decisions have no audit trail |
| No onboarding guide | `test -f CONTRIBUTING.md -o -f docs/onboarding.md -o -f docs/getting-started.md && echo "EXISTS" || echo "MISSING"` | Low | Ramp-up time for new team members increases |

---

## 5. Performance & Scalability Scan

### 5.1 Query & Data Access Performance

**What the scanner looks for**: Missing database indexes. Unbounded result sets. N+1 queries. Full table scans. Missing connection pooling.

**How it detects**: Grep for WHERE clause columns without corresponding indexes. Check for queries without LIMIT. Trace ORM calls inside loops. Verify connection pool configuration.

| Check | Detection command | Severity | Business impact |
|-------|-------------------|----------|-----------------|
| Missing database indexes | `grep -rn "WHERE\|\.filter\|\.where\|where:" --include="*.py" --include="*.ts" \| grep -v "index\|Index\|pk\|primary"` | High | Queries degrade as data grows |
| Unbounded result sets | `grep -rn "\.all()\|\.scalars()\|findMany()\|findMany({" --include="*.py" --include="*.ts" \| grep -v "limit\|slice\|paginate\|take\|cursor"` | High | OOM on large tables |
| SELECT * instead of needed columns | `grep -rn "SELECT \*\|\.all()\|findMany()" --include="*.py" --include="*.ts" \| grep -v "select\|columns\|include\|only"` | Medium | Unnecessary data transfer; schema changes break consumers |
| Missing connection pooling | `grep -rn "create_engine\|SupabaseClient\|PrismaClient" --include="*.py" --include="*.ts" \| grep -v "pool\|pool_size\|connection_limit"` | High | Connection exhaustion under load |
| Slow queries without timeout | `grep -rn "execute\|\.query\|\.raw\|\.findMany" --include="*.py" --include="*.ts" \| grep -v "timeout\|statement_timeout\|max_execution_time"` | Medium | Single slow query blocks the connection pool |

### 5.2 Bundle & Render Performance

**What the scanner looks for**: Large client bundles. Missing code splitting. Unoptimized images. Client-side data fetching that should be server-side. Unnecessary re-renders.

**How it detects**: Check bundle analysis. Grep for dynamic import absence. Audit image component usage. Check for client components that could be server components.

| Check | Detection command | Severity | Business impact |
|-------|-------------------|----------|-----------------|
| Missing code splitting | `grep -rn "import.*from" --include="*.tsx" --include="*.ts" \| grep -v "dynamic\|lazy\|import(" \| grep "chart\|editor\|player\|map\|pdf"` | Medium | First load includes code user never uses |
| Client component for static content | `grep -rn '"use client"' --include="*.tsx" -l \| xargs grep -L "useState\|useEffect\|onClick\|onChange\|onSubmit\|useReducer\|useContext"` | Medium | JavaScript shipped for content that needs none |
| Unoptimized images | `grep -rn "<img " --include="*.tsx" --include="*.ts" --include="*.jsx" \| grep -v "next/image\|Image\|width\|height\|priority"` | Medium | Slow LCP; wasted bandwidth |
| Large dependency tree | `npx bundlephobia --json 2>/dev/null \| jq '.[] \| select(.size > 50000) \| .name' 2>/dev/null \| head -10` | Low | Bundle bloat slows every page load |
| Missing Suspense boundaries | `grep -rn "async\|await" --include="*.tsx" app/ \| grep -v "Suspense\|loading\|fallback" \| wc -l` — if >0 async Server Components without Suspense, streaming is blocked | Medium | Entire page blocked by slowest data fetch |

### 5.3 Background Processing & Concurrency

**What the scanner looks for**: Synchronous LLM/API calls in request path. Unbounded concurrency. Missing task timeouts. Unhandled task failures. Queue backpressure.

**How it detects**: Grep for synchronous external calls in request handlers. Check worker pool configuration. Audit timeout settings.

| Check | Detection command | Severity | Business impact |
|-------|-------------------|----------|-----------------|
| Synchronous LLM calls in request path | `grep -rn "openai\|anthropic\|chat\.completions" --include="*.py" \| grep -v "async\|background\|celery\|queue\|await\|worker"` | High | Request thread blocked; timeouts under load |
| Unbounded concurrency | `grep -rn "ThreadPoolExecutor\|ProcessPoolExecutor\|concurrent\.\|Promise\.all\|Promise\.allSettled" --include="*.py" --include="*.ts" \| grep -v "max_workers\|limit\|concurrency\|semaphore"` | High | Resource exhaustion; cascading failures |
| Missing task timeouts | `grep -rn "celery\|arq\|bull\|Inngest\|queue" --include="*.py" --include="*.ts" \| grep -v "timeout\|time_limit\|soft_deadline\|maxDuration"` | Medium | Stuck tasks block queue indefinitely |
| Unhandled task failures | `grep -rn "on_failure\|on_rejection\|dead_letter\|dlq\|retry\|max_retries" --include="*.py" --include="*.ts" \| wc -l` — if 0, no failure handling exists | High | Failed tasks disappear silently |
| Missing backpressure on queues | `grep -rn "queue\|push\|enqueue\|send.*message\|publish" --include="*.py" --include="*.ts" \| grep -v "limit\|cap\|max\|backpressure\|throttle\|rate"` | Medium | Queue grows unbounded; memory exhaustion |

---

## 6. Testing & Release Confidence Scan

### 6.1 Coverage & Critical Path Testing

**What the scanner looks for**: Missing tests for auth-critical paths. Low coverage on payment/tenant code. Missing integration tests. No end-to-end smoke tests.

**How it detects**: Grep for auth/payment function definitions and check for corresponding test files. Check coverage reports. Verify test file existence.

| Check | Detection command | Severity | Business impact |
|-------|-------------------|----------|-----------------|
| Missing tests for security-critical paths | `grep -rn "require_auth\|require_admin\|tenant_id\|rls\|policy" --include="*.py" -l \| while read f; do base=$(basename "$f" .py); test -f "tests/test_${base}.py" -o -f "tests/${base}_test.py" \|\| echo "NO_TEST: $f"; done` | High | Auth bypass ships undetected |
| Missing tests for payment paths | `grep -rn "stripe\|payment\|charge\|invoice\|subscribe" --include="*.py" --include="*.ts" -l \| while read f; do base=$(basename "$f" .py); test -f "tests/test_${base}.py" -o -f "tests/${base}_test.py" \|\| echo "NO_TEST: $f"; done` | Critical | Money-handling bugs ship undetected |
| No integration tests | `find tests/ -name "*integration*" -o -name "*e2e*" \| wc -l` — if 0, no integration tests exist | Medium | Component interactions untested |
| Missing smoke tests for critical flows | `grep -rn "signup\|login\|checkout\|create.*tenant\|delete.*account" tests/ --include="*.py" --include="*.ts" \| wc -l` — if 0, no critical path tests | High | Regression in core flows undetected |

### 6.2 Test Reliability

**What the scanner looks for**: Flaky tests (time-dependent, order-dependent). Tests that depend on external services. Missing test isolation. Shared mutable state between tests.

**How it detects**: Grep for time.sleep and datetime.now in tests. Check for external URL references. Audit test fixture cleanup.

| Check | Detection command | Severity | Business impact |
|-------|-------------------|----------|-----------------|
| Flaky tests (time-dependent) | `grep -rn "time\.sleep\|sleep(\|datetime\.now()\|new Date()" tests/ --include="*.py" --include="*.ts"` | Medium | CI unreliability erodes trust |
| Tests depending on external services | `grep -rn "http://\|https://\|api\.openai\|api\.stripe\|smtp\|localhost:[0-9]" tests/ --include="*.py" --include="*.ts" \| grep -v "mock\|fixture\|test_server\|127\.0\.0\.1"` | Medium | Tests fail when services are down |
| Missing test isolation | `grep -rn "global\|shared\|classmethod\|class variable" tests/ --include="*.py" --include="*.ts" \| grep -v "fixture\|setUp\|tearDown\|beforeEach\|afterEach"` | Medium | Test order affects results |
| Missing cleanup in fixtures | `grep -rn "yield " tests/ conftest.py --include="*.py" -A3 \| grep -v "cleanup\|teardown\|drop\|delete\|rollback\|truncate\|flush"` | Medium | Test data accumulates; later tests see stale state |

### 6.3 CI/CD Integration

**What the scanner looks for**: Overly broad CI permissions. Secrets exposed in CI output. Missing CI gates. No deployment verification.

**How it detects**: Check GitHub Actions workflow permissions. Grep for secret echo/print patterns. Verify test requirements in CI config.

| Check | Detection command | Severity | Business impact |
|-------|-------------------|----------|-----------------|
| Broad GitHub Actions permissions | `grep -rn "permissions: write-all\|contents: write" .github/ --include="*.yml" --include="*.yaml" \| grep -v "dependabot\|release"` | High | Compromised workflow modifies repo |
| Secrets in CI env without masking | `grep -rn "echo.*SECRET\|print.*KEY\|console\.log.*KEY\|console\.log.*TOKEN" .github/ --include="*.yml" --include="*.yaml"` | High | Credentials in CI logs |
| No test gate before deploy | `grep -rn "deploy\|release" .github/ --include="*.yml" \| grep -v "test\|check\|verify\|lint"` | High | Broken code ships to production |
| Missing deployment verification | `grep -rn "deploy\|release" .github/ --include="*.yml" -A5 \| grep -v "health\|smoke\|verify\|curl\|ping\|check"` | Medium | Deployed code not verified to be working |

---

## 7. Observability & Operational Readiness Scan

### 7.1 Logging Coverage

**What the scanner looks for**: Missing structured logging. Print statements instead of loggers. Missing correlation IDs. Logs that lack request context.

**How it detects**: Grep for print() calls outside tests. Check for trace_id/correlation_id in log statements. Verify logger usage patterns.

| Check | Detection command | Severity | Business impact |
|-------|-------------------|----------|-----------------|
| Missing structured logging | `grep -rn "print(" --include="*.py" \| grep -v "test\|__repr__\|debug\|console\.log" \| grep -v "logger\|logging\|logfire\|structlog"` | Medium | Unstructured logs are expensive to query |
| Missing correlation IDs | `grep -rn "trace_id\|correlation_id\|request_id\|span_id" --include="*.py" --include="*.ts" \| wc -l` — if 0, no request tracing | Medium | Cannot trace requests across services |
| Missing request context in logs | `grep -rn "logger\.\|log\.\|logfire" --include="*.py" -A1 \| grep -v "user_id\|tenant_id\|request_id\|trace_id\|span_id"` | Low | Cannot attribute log entries to specific requests or users |
| Console.log in production code | `grep -rn "console\.log\|console\.debug" --include="*.ts" --include="*.tsx" \| grep -v "test\|spec\|mock\|stub\|__tests__"` | Low | Browser console leaks info; noise in production |

### 7.2 Error Tracking & Alerting

**What the scanner looks for**: Missing error tracking integration. No alerting on error spikes. Errors not grouped by root cause. Silent failures in background jobs.

**How it detects**: Grep for Sentry/Datadog/etc. SDK initialization. Check alert configuration. Audit background job error reporting.

| Check | Detection command | Severity | Business impact |
|-------|-------------------|----------|-----------------|
| Missing error tracking | `grep -rn "sentry\|datadog\|rollbar\|bugsnag\|newrelic\|logfire" --include="*.py" --include="*.ts" \| wc -l` — if 0, no error tracking | High | Production errors invisible |
| No alerting on error rate | `grep -rn "alert\|notify\|pagerduty\|opsgenie\|slack.*webhook" --include="*.py" --include="*.ts" --include="*.yml" --include="*.yaml" \| wc -l` — if 0, no alerting | Medium | Errors accumulate without notification |
| Background job errors not tracked | `grep -rn "celery\|arq\|bull\|Inngest\|worker\|queue" --include="*.py" --include="*.ts" -l \| xargs grep -L "sentry\|datadog\|rollbar\|logfire\|notify" 2>/dev/null` | High | Silent job failures accumulate |
| Errors not grouped by cause | `grep -rn "except\|catch" --include="*.py" --include="*.ts" \| grep -v "Sentry\|capture\|notify\|log\|report\|track" \| wc -l` — compare with total error handlers to find ratio | Low | Error dashboard shows noise, not signal |

### 7.3 Health Checks & Metrics

**What the scanner looks for**: Lying health checks (always return OK). Missing readiness vs liveness distinction. No resource metrics. Missing SLI/SLO definitions.

**How it detects**: Check health endpoint implementations for dependency verification. Grep for metrics exposition. Check for SLO definitions.

| Check | Detection command | Severity | Business impact |
|-------|-------------------|----------|-----------------|
| Lying health checks | `grep -rn "def health\|/health\|/healthz\|/readiness" --include="*.py" --include="*.ts" -A5 \| grep -v "db\|redis\|database\|ping\|connect\|check\|ready"` | High | Load balancer sends traffic to broken instances |
| No readiness vs liveness distinction | `grep -rn "readiness\|liveness\|ready\|live" --include="*.py" --include="*.ts" --include="*.yml" \| wc -l` — if only 1 endpoint, no distinction | Medium | Rolling updates kill healthy instances |
| Missing resource metrics | `grep -rn "prometheus\|metrics\|statsd\|datadog\|cloudwatch" --include="*.py" --include="*.ts" \| wc -l` — if 0, no metrics | Medium | Cannot detect performance degradation |
| Missing SLI/SLO definitions | `find . -name "slo*" -o -name "sli*" -o -name "error-budget*" \| wc -l` — if 0, no SLOs | Low | No objective measure of reliability |

---

## 8. Product & Business Risk Scan

### 8.1 Technical Debt Quantification

**What the scanner looks for**: TODO/FIXME markers in critical code. Dead code paths. Deprecated API usage. Workarounds that became permanent.

**How it detects**: Grep for TODO/FIXME/HACK markers. Trace dead code via call-graph analysis. Check for deprecated function usage.

| Check | Detection command | Severity | Business impact |
|-------|-------------------|----------|-----------------|
| TODO/FIXME in security-critical code | `grep -rn "TODO\|FIXME\|HACK\|XXX" --include="*.py" --include="*.ts" \| grep -i "auth\|security\|inject\|secret\|tenant\|payment\|stripe"` | Medium | Known security gaps left unfixed |
| Dead code paths | `grep -rn "^def \|^async def " --include="*.py" \| cut -d: -f3 \| sed 's/def \([a-zA-Z_]*\).*/\1/' \| while read fn; do grep -rn "$fn" --include="*.py" \| grep -qv "def $fn" \|\| echo "UNUSED: $fn"; done` | Low | Attack surface that is untested and unreviewed |
| Deprecated API usage | `grep -rn "deprecated\|DeprecationWarning\|@deprecated" --include="*.py" --include="*.ts" \| grep -v "test\|mock\|stub"` | Medium | API will break on next version bump |
| Temporary workarounds past deadline | `grep -rn "temp\|temporary\|quick\|hotfix\|workaround\|hack" --include="*.py" --include="*.ts" \| grep -v "test\|template\|temperature"` | Low | Temporary fixes become permanent |

### 8.2 Single Points of Failure

**What the scanner looks for**: Single LLM provider. Single database instance. Single deployment region. Single team member knowledge.

**How it detects**: Grep for provider references. Check infrastructure config for redundancy. Verify deployment region settings.

| Check | Detection command | Severity | Business impact |
|-------|-------------------|----------|-----------------|
| Single LLM provider | `grep -rn "openai\|anthropic\|cohere\|mistral" --include="*.py" --include="*.ts" \| grep -v "fallback\|alternative\|provider\|config\|router" \| wc -l` — if only one provider appears, no fallback | Medium | Provider outage stops all agent operations |
| Single database instance | `grep -rn "DATABASE_URL\|connection_string\|host.*5432" --include="*.py" --include="*.ts" --include="*.env*" \| grep -v "replica\|read_replica\|failover\|cluster\|pool"` | Medium | DB outage stops all operations |
| No deployment rollback plan | `grep -rn "rollback\|revert\|previous.*version\|canary" Dockerfile* docker-compose* .github/ railway.json vercel.json 2>/dev/null \| wc -l` — if 0, no rollback | High | Bad deploy requires manual recovery |

### 8.3 Onboarding & Support Readiness

**What the scanner looks for**: No error messages for common user mistakes. Missing feature flags for gradual rollout. No admin tooling for support. No data export capability.

**How it detects**: Grep for feature flag systems. Check for admin API routes. Verify data export endpoints.

| Check | Detection command | Severity | Business impact |
|-------|-------------------|----------|-----------------|
| Missing feature flags | `grep -rn "feature.*flag\|featureFlag\|flag.*toggle\|LaunchDarkly\|unleash\|stat_sig\|posthog\|variant" --include="*.py" --include="*.ts" \| wc -l` — if 0, no feature flagging | Low | Cannot gradually roll out or quickly disable features |
| No admin/support tooling | `grep -rn "admin\|support\|impersonate\|override\|manual" --include="*.py" --include="*.ts" app/api/ \| grep -v "test" \| wc -l` — if 0, no admin API | Medium | Support team cannot help users without DB access |
| No data export endpoint | `grep -rn "export\|download\|csv\|bulk.*data" --include="*.py" --include="*.ts" app/api/ \| wc -l` — if 0, no export capability | Medium | Users cannot export their data; GDPR right to portability |
| Missing user-facing error messages | `grep -rn "HTTPException\|Response\.json.*error\|throw new Error" --include="*.py" --include="*.ts" \| grep -v "message\|detail\|description\|help\|docs\|guide"` | Low | Users see generic errors; increase support load |

---

## 9. Cloud & Platform Security

### 9.1 Supabase-Specific Issues

**What the scanner looks for**: RLS disabled or missing. Service role key used outside admin context. Anon key used for privileged operations. Missing audit logging. Storage bucket misconfiguration.

**How it detects**: Check migration files for RLS policies. Grep for key usage patterns. Audit storage bucket policies.

| Check | Detection command | Severity | Business impact |
|-------|-------------------|----------|-----------------|
| Tables without RLS | `grep -rn "CREATE TABLE" supabase/migrations/ --include="*.sql" \| sed 's/.*TABLE \(if not exists \)\?\(\w*\).*/\2/' \| while read t; do grep -rn "ALTER TABLE $t ENABLE ROW LEVEL SECURITY\|POLICY.*ON $t" supabase/migrations/ \| wc -l \| grep "^0" && echo "NO_RLS: $t"; done` | Critical | Any client can read/write all rows |
| Service role key in client code | `grep -rn "SUPABASE_SERVICE_ROLE\|service_role\|supabase_service_role_key" --include="*.ts" --include="*.tsx" --include="*.js" \| grep -v "server\|api\|middleware\|middleware\|utils/server"` | Critical | Client bypasses all auth |
| Anon key with no RLS dependency | `grep -rn "ANON_KEY\|supabase_anon" --include="*.py" --include="*.ts" \| head -5` then verify tables have RLS | High | Anon key has no role claims; RLS must be perfect |
| Storage bucket without policies | `grep -rn "storage\.from\|\.upload\|\.download" --include="*.py" --include="*.ts" \| grep -v "policy\|rules\|allowedMimeTypes\|maxSize"` | High | Anyone uploads/reads files |
| Missing audit logging on sensitive tables | `grep -rn "CREATE TABLE.*\(user\|account\|payment\|billing\|role\|permission\|api_key\)" supabase/migrations/ --include="*.sql" \| while read line; do t=$(echo "$line" \| sed 's/.*TABLE \(if not exists \)\?\(\w*\).*/\2/'); grep -rn "audit\|log.*$t\|trigger.*$t" supabase/migrations/ \| wc -l \| grep "^0" && echo "NO_AUDIT: $t"; done` | Medium | Changes to sensitive data not tracked |
| Realtime enabled on sensitive tables | `grep -rn "realtime\|REALTIME\|supabase\.channel\|subscribe" --include="*.py" --include="*.ts" \| grep -v "auth\|public\|RLS\|policy"` | Medium | Realtime bypasses RLS if not configured correctly |

### 9.2 Deployment Configuration

**What the scanner looks for**: Debug mode in production. Exposed admin ports. Missing HTTPS redirect. Container running as root. Missing resource limits.

**How it detects**: Check environment-specific config. Grep for debug flags. Verify Dockerfile USER directives. Check compose resource limits.

| Check | Detection command | Severity | Business impact |
|-------|-------------------|----------|-----------------|
| Debug mode in production | `grep -rn "DEBUG=True\|debug.*true\|NODE_ENV.*development\|APP_DEBUG.*1" --include="*.py" --include="*.ts" --include="*.env*" --include="*.yml" \| grep -v "test\|local\|example\|template"` | Critical | Verbose errors; debugger access; security details exposed |
| Container running as root | `grep -rn "USER " Dockerfile* \| grep -v "root\|0" \| wc -l` — if 0, no non-root user | High | Container escape yields root on host |
| Missing resource limits | `grep -rn "mem_limit\|memory\|cpus\|deploy.*resources" docker-compose* --include="*.yml" \| wc -l` — if 0, no limits | Medium | Runaway process consumes all host resources |
| Exposed internal ports | `grep -rn "0\.0\.0\.0\|::" --include="*.py" --include="*.ts" Dockerfile* docker-compose* \| grep -v "80\|443\|8080\|health\|proxy"` | High | Internal services reachable from network |
| Missing HTTPS redirect | `grep -rn "HTTPS\|SECURE_SSL\|redirect.*https\|forceSSL" --include="*.py" --include="*.ts" --include="*.yml" \| wc -l` — if 0, no redirect | Medium | Traffic can arrive over plain HTTP |

### 9.3 CORS & Headers

**What the scanner looks for**: Wildcard CORS origins. Missing security headers. Inconsistent CORS between environments. Missing CSP headers.

**How it detects**: Grep for CORS middleware configuration. Check for security header middleware. Compare CORS across environments.

| Check | Detection command | Severity | Business impact |
|-------|-------------------|----------|-----------------|
| Overly permissive CORS | `grep -rn "allow_origins.*\*\|Access-Control-Allow-Origin.*\*\|origin.*\*" --include="*.py" --include="*.ts" --include="*.tsx" \| grep -v "test\|localhost\|example\.com"` | High | Any website steals authenticated data |
| Missing security headers | `grep -rn "X-Frame-Options\|X-Content-Type-Options\|X-XSS-Protection\|Content-Security-Policy\|Strict-Transport-Security" --include="*.py" --include="*.ts" --include="*.tsx" \| wc -l` — if 0, no security headers | Medium | Clickjacking; MIME sniffing; XSS |
| Credentials allowed with wildcard origin | `grep -rn "allow_credentials.*True\|credentials.*true" --include="*.py" --include="*.ts" -B5 \| grep "allow_origins.*\*\|origin.*\*"` | Critical | Any website steals cookies and auth tokens |
| Missing CSP header | `grep -rn "Content-Security-Policy\|CSP\|helmet\|csp" --include="*.py" --include="*.ts" --include="*.tsx" \| wc -l` — if 0, no CSP | Medium | XSS can load external scripts |

### 9.4 CI/CD Exposure

**What the scanner looks for**: Self-hosted runners without isolation. Workflow triggers on pull_request from forks. Secrets in workflow files. Missing pinning on action versions.

**How it detects**: Check runner labels. Audit workflow trigger events. Grep for secret references. Check action version pinning.

| Check | Detection command | Severity | Business impact |
|-------|-------------------|----------|-----------------|
| Fork PRs can trigger workflows with secrets | `grep -rn "pull_request" .github/ --include="*.yml" \| grep -v "pull_request_target\|main\|master"` | High | Malicious PR steals CI secrets |
| Unpinned GitHub Actions | `grep -rn "uses:.*@" .github/ --include="*.yml" \| grep -v "sha256\|[a-f0-9]\{40\}"` | Medium | Compromised action version runs in CI |
| Secrets in workflow env without masking | `grep -rn "echo.*\${{ secrets\.\|run:.*SECRETS\|printenv" .github/ --include="*.yml"` | High | CI logs expose secrets |
| Self-hosted runners without sandboxing | `grep -rn "runs-on: self-hosted" .github/ --include="*.yml" \| grep -v "container\|docker\|sandbox"` | High | Compromised workflow persists on runner |

---

## 10. 5-Phase Scanner Pipeline

### Phase 1: Structure Discovery

Parse project metadata, walk directories, and map entry points to understand the codebase shape.

```bash
#!/bin/bash
echo "=== Phase 1: Structure Discovery ==="

# Per-run, per-repo scratch directory for this scan's intermediates. Minted fresh on
# every Phase 1 run — never falls back to an inherited ARCHKIT_RUN_DIR — so two scans
# in the same session, even of the same repo, never collide or silently overwrite or
# append to each other's report/findings. The portable-mktemp form below (an explicit
# TEMPLATE with a trailing X-run, not the `-t` flag) behaves identically on macOS/BSD
# and Linux/GNU mktemp, which otherwise disagree on `-t` semantics.
ARCHKIT_RUN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/archkit-scan.XXXXXXXX")"
export ARCHKIT_RUN_DIR
echo "Run directory: $ARCHKIT_RUN_DIR"
echo "(Phases 2-5 read/write files under this directory. Keep ARCHKIT_RUN_DIR exported"
echo " in the environment those phases run in — e.g. run all 5 phases in the same"
echo " shell session — so they resolve to this same directory.)"

# Python project metadata
if [ -f pyproject.toml ]; then
    echo "Python project detected (pyproject.toml)"
    grep -A20 "dependencies" pyproject.toml
fi

# Node.js project metadata
if [ -f package.json ]; then
    echo "Node.js project detected (package.json)"
    jq '.dependencies, .devDependencies' package.json 2>/dev/null || grep -A50 "dependencies" package.json
fi

# Go module metadata
if [ -f go.mod ]; then
    echo "Go project detected (go.mod)"
    cat go.mod
fi

# Directory structure
find . -type f \( -name "*.py" -o -name "*.ts" -o -name "*.tsx" -o -name "*.go" \) | head -200

# Framework detection
echo "--- Python frameworks ---"
grep -rn "from fastapi\|import fastapi\|from flask\|import flask\|from django\|import django" --include="*.py" | head -10

echo "--- JavaScript frameworks ---"
grep -rn "from 'next'\|from 'react'\|import.*next\|import.*react" --include="*.ts" --include="*.tsx" | head -10

echo "--- Supabase ---"
grep -rn "supabase\|@supabase" --include="*.ts" --include="*.tsx" --include="*.py" | head -5

# Entry points
echo "--- Application entry points ---"
grep -rn "app = FastAPI\|app = Flask\|if __name__\|createApp\|NextResponse\|export default function" --include="*.py" --include="*.ts" --include="*.tsx" | head -10

# Auth middleware detection
echo "--- Auth middleware ---"
grep -rn "Depends(require_auth\|Depends(get_current_user\|withAuth\|clerkMiddleware\|supabase\.auth" --include="*.py" --include="*.ts" --include="*.tsx" | head -10

# Database connection detection
echo "--- Database connections ---"
grep -rn "create_engine\|SupabaseClient\|createClient\|PrismaClient\|DATABASE_URL" --include="*.py" --include="*.ts" | head -10

# Background job detection
echo "--- Background jobs ---"
grep -rn "celery\|huey\|arq\|bull\|Inngest\|queue\|worker" --include="*.py" --include="*.ts" | head -10

# Deployment target detection
echo "--- Deployment targets ---"
for f in Dockerfile docker-compose* vercel.json netlify.toml fly.toml render.yaml railway.json railway.toml; do
    test -f "$f" && echo "Found: $f"
done
```

### Phase 2: Static Pattern Matching

Grep and AST analysis for security sinks, architecture violations, and quality issues.

```bash
#!/bin/bash
echo "=== Phase 2: Static Pattern Matching ==="

# Injection sinks
echo "--- SQL injection ---"
grep -rn 'f".*SELECT\|f".*INSERT\|f".*UPDATE\|f".*DELETE' --include="*.py"
grep -rn '\$\{.*\}.*FROM\|`SELECT.*\$\{.*\}' --include="*.ts"

echo "--- Command injection ---"
grep -rn "shell=True" --include="*.py"
grep -rn "os\.system(\|os\.popen(" --include="*.py" --include="*.ts"

echo "--- Path traversal ---"
grep -rn "open(.*+\|Path(.*+\|readFile(.*+" --include="*.py" --include="*.ts" | grep -v "resolve\|is_relative_to\|normalize\|sanitize"

echo "--- Deserialization ---"
grep -rn "pickle\.loads\|yaml\.load(\|marshal\.loads\|eval(" --include="*.py" | grep -v "SafeLoader\|safe_load"

echo "--- XSS ---"
grep -rn "dangerouslySetInnerHTML\|v-html\|innerHTML" --include="*.tsx" --include="*.ts" --include="*.vue"

# Secrets sinks
echo "--- Hardcoded secrets ---"
grep -rn "sk-[a-zA-Z0-9]\|AKIA[A-Z0-9]\{16\}\|-----BEGIN.*PRIVATE KEY\|ghp_\|xox[bpas]-" --include="*.py" --include="*.ts" --include="*.tsx"

echo "--- Credentials in logs ---"
grep -rn "logger\.\|log\.\|console\.log\|print(" --include="*.py" --include="*.ts" | grep "api_key\|password\|secret\|token\|credential"

echo "--- Client-side secrets ---"
grep -rn "NEXT_PUBLIC_.*SECRET\|NEXT_PUBLIC_.*KEY\|NEXT_PUBLIC_.*TOKEN\|NEXT_PUBLIC_.*PASSWORD" --include="*.ts" --include="*.tsx" --include="*.env*"

# Auth sinks
echo "--- Missing auth on endpoints ---"
grep -rn "@app\.\(get\|post\|put\|delete\|patch\)" --include="*.py" | grep -v "Depends(require_auth\|Depends(get_current_user\|health"
grep -rn "export.*GET\|export.*POST\|export.*PUT\|export.*DELETE" --include="*.ts" app/api/ | grep -v "withAuth\|auth\|session\|clerk\|supabase.auth"

echo "--- Missing tenant filters ---"
grep -rn "\.query(\|\.filter(\|\.where(\|findMany(\|findFirst(" --include="*.py" --include="*.ts" | grep -v "tenant_id\|owner_id\|tenantId\|organization_id"

# CORS configuration
echo "--- CORS configuration ---"
grep -rn "CORSMiddleware\|allow_origins\|Access-Control\|cors" --include="*.py" --include="*.ts"

# Dependency issues
echo "--- Unpinned dependencies ---"
grep -rn "^[a-zA-Z]" requirements.txt 2>/dev/null | grep -v "=="
grep -rn '": "^' package.json 2>/dev/null | grep -v "workspace:\|peer"

echo "--- Missing lockfile ---"
for f in uv.lock poetry.lock package-lock.json pnpm-lock.yaml yarn.lock go.sum; do
    test -f "$f" && echo "Found: $f" || echo "MISSING: $f"
done
```

### Phase 3: Semantic Analysis

Data flow tracing, cross-reference analysis, and deeper pattern investigation.

```bash
#!/bin/bash
echo "=== Phase 3: Semantic Analysis ==="

# Data flow: user input to database
echo "--- User input reaching DB without validation ---"
grep -rn "request\.\|Request\|Body\|Query\|Param" --include="*.py" -l | while read f; do
    grep -n "execute\|cursor\|session\.\|db\." "$f" | head -5
done

echo "--- User input reaching subprocess ---"
grep -rn "subprocess\.\|os\.system\|os\.popen" --include="*.py" -l | while read f; do
    grep -n "request\.\|Query\|Param\|Path" "$f" | head -5
done

# Layer boundary violations
echo "--- Routes importing DB clients ---"
grep -rn "from sqlalchemy\|import sqlite3\|prisma\.\|SupabaseClient" --include="*.py" --include="*.ts" | grep "routes\|api\|endpoints\|app/api"

echo "--- Domain models importing I/O ---"
grep -rn "import os\|import requests\|import subprocess\|import httpx\|fetch(" domain/ models/ lib/ --include="*.py" --include="*.ts" 2>/dev/null

# Repository pattern compliance
echo "--- Raw SQL outside repository layer ---"
grep -rn "text(\|execute(\|\.raw(\|\$queryRaw" --include="*.py" --include="*.ts" | grep -v "repository\|repo\|model\|migration\|seed\|data/"

# N+1 query detection
echo "--- Potential N+1 queries ---"
grep -rn "for .* in .*:" --include="*.py" -A5 | grep "db\.\|session\.\|execute\|prisma\.\|findMany\|findFirst"

# Prompt sprawl detection
echo "--- Prompt template locations ---"
grep -rn "prompt.*=\|system.*=\|PROMPT\|SYSTEM_MSG" --include="*.py" --include="*.ts" | wc -l

# RLS policy coverage (Supabase)
echo "--- RLS policy coverage ---"
TABLES=$(grep -rn "CREATE TABLE" supabase/migrations/ --include="*.sql" 2>/dev/null | sed 's/.*TABLE \(if not exists \)\?\(\w*\).*/\2/' | sort -u)
RLS=$(grep -rn "ENABLE ROW LEVEL SECURITY" supabase/migrations/ --include="*.sql" 2>/dev/null | sed 's/.*TABLE \(if not exists \)\?\(\w*\).*/\2/' | sort -u)
comm -23 <(echo "$TABLES") <(echo "$RLS") | while read t; do echo "NO_RLS: $t"; done

# Health check verification
echo "--- Health check depth ---"
grep -rn "def health\|/health\|/healthz" --include="*.py" --include="*.ts" -A5 | grep -c "db\|redis\|database\|ping\|connect" || echo "SHALLOW_HEALTH_CHECK"
```

### Phase 4: Heuristic Scoring

Score per-category health based on findings from Phases 2-3.

```bash
#!/bin/bash
echo "=== Phase 4: Heuristic Scoring ==="

score_category() {
    local category=$1
    local critical=$2
    local high=$3
    local medium=$4
    local low=$5
    local total=$((critical * 10 + high * 5 + medium * 2 + low * 1))
    local max_score=100
    local score=$((max_score - total))
    if [ $score -lt 0 ]; then score=0; fi
    echo "$category: $score/100 (critical=$critical, high=$high, medium=$medium, low=$low)"
}

# Count findings per severity per category (from Phase 2/3 output)
# These are example counts; replace with actual pipeline output parsing
CRITICAL_AUTH=0; HIGH_AUTH=0; MEDIUM_AUTH=0; LOW_AUTH=0
CRITICAL_INJECT=0; HIGH_INJECT=0; MEDIUM_INJECT=0; LOW_INJECT=0
CRITICAL_SECRETS=0; HIGH_SECRETS=0; MEDIUM_SECRETS=0; LOW_SECRETS=0
CRITICAL_APISEC=0; HIGH_APISEC=0; MEDIUM_APISEC=0; LOW_APISEC=0
CRITICAL_SUPPLY=0; HIGH_SUPPLY=0; MEDIUM_SUPPLY=0; LOW_SUPPLY=0
HIGH_ARCH=0; MEDIUM_ARCH=0; LOW_ARCH=0
MEDIUM_QUALITY=0; LOW_QUALITY=0
HIGH_PERF=0; MEDIUM_PERF=0
HIGH_TESTING=0; MEDIUM_TESTING=0
MEDIUM_OBSERVABILITY=0; LOW_OBSERVABILITY=0
MEDIUM_BIZRISK=0; LOW_BIZRISK=0
HIGH_CLOUD=0; MEDIUM_CLOUD=0

score_category "authentication" "$CRITICAL_AUTH" "$HIGH_AUTH" "$MEDIUM_AUTH" "$LOW_AUTH"
score_category "authorization" "$CRITICAL_AUTH" "$HIGH_AUTH" "$MEDIUM_AUTH" "$LOW_AUTH"
score_category "injection" "$CRITICAL_INJECT" "$HIGH_INJECT" "$MEDIUM_INJECT" "$LOW_INJECT"
score_category "secrets" "$CRITICAL_SECRETS" "$HIGH_SECRETS" "$MEDIUM_SECRETS" "$LOW_SECRETS"
score_category "data_protection" 0 "$HIGH_AUTH" "$MEDIUM_AUTH" "$LOW_AUTH"
score_category "api_security" "$CRITICAL_APISEC" "$HIGH_APISEC" "$MEDIUM_APISEC" "$LOW_APISEC"
score_category "supply_chain" "$CRITICAL_SUPPLY" "$HIGH_SUPPLY" "$MEDIUM_SUPPLY" "$LOW_SUPPLY"
score_category "architecture" 0 "$HIGH_ARCH" "$MEDIUM_ARCH" "$LOW_ARCH"
score_category "quality" 0 0 "$MEDIUM_QUALITY" "$LOW_QUALITY"
score_category "performance" 0 "$HIGH_PERF" "$MEDIUM_PERF" 0
score_category "testing" 0 "$HIGH_TESTING" "$MEDIUM_TESTING" 0
score_category "observability" 0 0 "$MEDIUM_OBSERVABILITY" "$LOW_OBSERVABILITY"
score_category "business_risk" 0 0 "$MEDIUM_BIZRISK" "$LOW_BIZRISK"
score_category "cloud_platform" 0 "$HIGH_CLOUD" "$MEDIUM_CLOUD" 0

# Overall score
echo "---"
echo "Overall: average of all category scores"
echo "Passing: overall >= 70 and no critical findings"
echo "Failing: overall < 70 or any critical finding"
```

### Phase 5: Report Generation

Markdown and JSON output with machine-readable findings.

```bash
#!/bin/bash
echo "=== Phase 5: Report Generation ==="

# Fail loudly rather than silently falling back to a fresh (different) directory if
# Phase 1 wasn't run first in this environment — a silent fallback here would write
# this phase's output next to nothing from Phases 1-4, the same cross-run bleed this
# scoping exists to prevent, just within a single scan instead of across scans.
: "${ARCHKIT_RUN_DIR:?ARCHKIT_RUN_DIR is unset — run Phase 1 first and keep it exported in this shell}"

# Markdown report
cat > "$ARCHKIT_RUN_DIR/saas-review-report.md" << 'HEADER'
# SaaS Codebase Review Report

## Summary
HEADER

# Append category scores from Phase 4
cat "$ARCHKIT_RUN_DIR/scores.txt" >> "$ARCHKIT_RUN_DIR/saas-review-report.md" 2>/dev/null

# Append critical findings
echo -e "\n## Critical Findings\n" >> "$ARCHKIT_RUN_DIR/saas-review-report.md"
grep '"severity": "critical"' "$ARCHKIT_RUN_DIR/findings.jsonl" 2>/dev/null | while read line; do
    title=$(echo "$line" | jq -r '.title' 2>/dev/null)
    file=$(echo "$line" | jq -r '.file_path' 2>/dev/null)
    impact=$(echo "$line" | jq -r '.business_impact' 2>/dev/null)
    echo "- **$title** ($file): $impact" >> "$ARCHKIT_RUN_DIR/saas-review-report.md"
done

# JSON findings (see schema below)
python3 -c "
import json, sys
findings = []
for line in sys.stdin:
    try:
        findings.append(json.loads(line))
    except json.JSONDecodeError:
        pass
summary = {
    'total': len(findings),
    'critical': sum(1 for f in findings if f.get('severity') == 'critical'),
    'high': sum(1 for f in findings if f.get('severity') == 'high'),
    'medium': sum(1 for f in findings if f.get('severity') == 'medium'),
    'low': sum(1 for f in findings if f.get('severity') == 'low'),
    'informational': sum(1 for f in findings if f.get('severity') == 'informational'),
}
json.dump({'findings': findings, 'summary': summary}, sys.stdout, indent=2)
" < "$ARCHKIT_RUN_DIR/findings.jsonl" > "$ARCHKIT_RUN_DIR/saas-review-report.json" 2>/dev/null

echo "Report written to $ARCHKIT_RUN_DIR/saas-review-report.md and $ARCHKIT_RUN_DIR/saas-review-report.json"
```

---

## 11. Per-Finding Structure

Each finding conforms to this JSON schema for machine-readable output:

```json
{
  "id": "SEC-2025-001",
  "title": "SQL injection in user search endpoint",
  "category": "security",
  "subcategory": "injection",
  "severity": "critical",
  "confidence": "high",
  "file_path": "app/api/routes/users.py",
  "line_range": "23-25",
  "evidence": "cursor.execute(f\"SELECT * FROM users WHERE name LIKE '%{q}%'\")",
  "business_impact": "An attacker can read, modify, or delete all data in the database",
  "technical_detail": "User input 'q' is interpolated directly into SQL via f-string, allowing arbitrary SQL injection",
  "recommended_fix": "Replace f-string with parameterized query: cursor.execute('SELECT * FROM users WHERE name LIKE %s', (f'%{q}%',))",
  "ai_prompt": "In app/api/routes/users.py, replace the f-string SQL query on line 23 with a parameterized query using %s placeholders and a tuple parameter",
  "verification": "Send a request with q='; DROP TABLE users; -- and confirm it returns no results instead of dropping the table"
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier following pattern `{CATEGORY}-{YEAR}-{NUMBER}` |
| `title` | string | Yes | Short human-readable summary of the finding |
| `category` | string | Yes | One of: `security`, `architecture`, `quality`, `performance`, `testing`, `observability`, `business_risk`, `cloud_platform` |
| `subcategory` | string | Yes | Specific area within the category (e.g., `injection`, `authorization`, `secrets`) |
| `severity` | string | Yes | One of: `critical`, `high`, `medium`, `low`, `informational` (see Section 12) |
| `confidence` | string | Yes | One of: `high` (confirmed), `medium` (likely), `low` (possible, needs manual review) |
| `file_path` | string | Yes | Relative path to the file containing the issue |
| `line_range` | string | Yes | Line number or range (e.g., `23` or `23-25`) |
| `evidence` | string | Yes | Code snippet or configuration showing the issue |
| `business_impact` | string | Yes | Plain-language description of what happens if unfixed |
| `technical_detail` | string | Yes | Technical explanation of why this is a problem |
| `recommended_fix` | string | Yes | Concrete steps to fix the issue |
| `ai_prompt` | string | Yes | Prompt an AI coding tool can use to implement the fix |
| `verification` | string | Yes | How to verify the fix works (test, curl, etc.) |

---

## 12. Severity Model

| Severity | Definition | Action required | Example |
|----------|-----------|-----------------|---------|
| **Critical** | Exploitable vulnerability or data breach. System can be compromised without authentication or with minimal effort. | Block release. Fix immediately. Do not ship until resolved. | SQL injection, hardcoded production secrets, missing auth on data endpoints |
| **High** | Significant security or reliability risk. Exploitation requires some precondition, or the impact is severe but not immediate. | Fix before next release. Document risk if deferred with owner and date. | Missing tenant isolation, IDOR, service-role key in user path, lying health checks |
| **Medium** | Moderate risk. Could become critical under specific conditions, or degrades reliability under load. | Fix within current sprint. Track in backlog if deferred. | Missing rate limiting, unbounded queries, missing error handling, CORS wildcard |
| **Low** | Minor risk or maintainability concern. Unlikely to cause immediate problems but increases technical debt. | Add to backlog. Fix when convenient. | Missing type annotations, magic numbers, shallow documentation |
| **Informational** | Observation or recommendation. Not a finding requiring action. | No action required. Consider for future planning. | Missing ADRs, feature flag absence, SLO gaps |

### Severity Escalation Rules

- A **High** finding that is also **trivially exploitable** escalates to **Critical**.
- A **Medium** finding that affects **all tenants** or **payment flows** escalates to **High**.
- A **Low** finding that exists in **security-critical code** (auth, payment, tenant isolation) escalates to **Medium**.
- Findings with **low confidence** should be reviewed manually before assigning final severity.

---

## 13. Implementation Notes

### Phase 1: Scanner Engine Foundation

Build the pipeline runner that orchestrates Phases 1-5. Must support:
- Project type auto-detection (Python, Node.js, Go, mixed)
- Configurable scope (scan all or specific directories)
- Incremental scanning (only changed files since last scan)
- Output format selection (markdown, JSON, SARIF)

### Phase 2: Detection Rule Registry

Create a pluggable rule system where each detection command from Sections 2-9 is a registered rule with:
- Rule ID, category, subcategory
- Detection command (the grep/AST pattern)
- Severity default (overridable by context)
- Confidence heuristic (pattern match = medium; data flow proven = high)
- Remediation template
- Verification command

Rules are independent and composable. New rules register without modifying the scanner core.

### Phase 3: Semantic Analysis Engine

Extend beyond grep with:
- AST parsing for Python (`ast` module) and TypeScript (TypeScript compiler API)
- Data flow analysis from user input to security sinks
- Cross-file import graph for layer boundary enforcement
- Call-graph construction for dead code detection

### Phase 4: Scoring & Prioritization

Implement the heuristic scoring model with:
- Per-category weighted scores based on finding counts and severity
- Context-aware severity adjustment (escalation rules from Section 12)
- Trend tracking across scans (new findings, resolved findings, persistent findings)
- Comparison mode (diff between two scan runs)

### Phase 5: Integration & Reporting

Connect the scanner to the development workflow:
- GitHub Actions integration (run on PR, post findings as comments)
- Pre-commit hook (block commits with critical findings)
- IDE integration (inline findings in editor)
- SARIF output for GitHub Security tab
- Structured JSON for custom dashboards