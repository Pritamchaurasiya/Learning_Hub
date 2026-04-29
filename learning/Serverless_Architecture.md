# ☁️ SERVERLESS ARCHITECTURE (FaaS)

> [!NOTE] > **Serverless** doesn't mean no servers. It means **you don't manage them**.

---

## 1. CORE CONCEPTS

### 1.1 Function as a Service (FaaS)

- **Unit of Scale**: The function invocation.
- **Billing**: Pay per millisecond of execution.
- **Lifecycle**: Ephemeral. Spins up, runs, dies.
- **Provider Examples**: AWS Lambda, Google Cloud Functions, Azure Functions.

### 1.2 Backend as a Service (BaaS)

- **Auth**: Firebase Auth, Auth0.
- **Database**: DynamoDB, Firestore.
- **Storage**: S3, Cloud Storage.

---

## 2. THE SERVERLESS TRADE-OFF

| Pros                                                    | Cons                                                                                         |
| :------------------------------------------------------ | :------------------------------------------------------------------------------------------- |
| **No Ops**: Auto-scaling, patching handled by provider. | **Cold Starts**: Latency when spinning up new instances.                                     |
| **Cost**: Zero cost when idle.                          | **Vendor Lock-in**: Hard to migrate away from AWS/GCP specific triggers.                     |
| **Velocity**: Focus purely on business logic.           | **Complexity**: Monitoring distributed functions is hard (Distributed Tracing is mandatory). |

---

## 3. ARCHITECTURE PATTERNS

### 3.1 Event-Driven Data Processing

S3 Upload -> Trigger Lambda -> Resize Image -> Save to S3.
**Perfect fit.**

### 3.2 API Gateway + Lambda

REST API -> API Gateway -> Lambda.
**Good for**: Low traffic, irregular bursty traffic.
**Bad for**: High frequency, low latency requirements (Cold starts hurt).

### 3.3 The "Lambdalith"

Deploying an entire Flask/Django app inside a single Lambda function using an adapter (e.g., Mangum, Zappa).

- **Pros**: Easy migration.
- **Cons**: Large bundle size = Slower cold starts.

---

## 4. COLD STARTS & OPTIMIZATION

### 4.1 Causes

1. **Downloading Code**: Large dependencies (TensorFlow, Pandas).
2. **Starting Runtime**: JVM/Python initialization.
3. **Init Code**: Database connections established outside the handler.

### 4.2 Solutions

- **Provisioned Concurrency**: Keep warm instances ready (Costs money).
- **Language Choice**: Go/Rust/Node.js start faster than Java/C#.
- **Minification**: Webpack/Esbuild to reduce code size.

---

## 5. SERVERLESS FRAMEWORK & SAM

Don't click in the console. Use Infrastructure as Code (IaC).

```yaml
# serverless.yml
service: my-app
provider:
  name: aws
  runtime: python3.9

functions:
  hello:
    handler: handler.hello
    events:
      - http:
          path: hello
          method: get
```

---

## 🎓 EXERCISE

1.  Create a Google Cloud Function.
2.  Trigger it via HTTP.
3.  Connect it to Firestore.
4.  Observe the "Cold Start" in logs.
