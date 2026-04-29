# 🏗️ MICROSERVICES ARCHITECTURE: COMPLETE GUIDE

## Building Scalable Distributed Systems

---

## 📋 TABLE OF CONTENTS

1. [Microservices vs Monolith](#-microservices-vs-monolith)
2. [Service Design Principles](#-service-design-principles)
3. [Communication Patterns](#-communication-patterns)
4. [Service Discovery](#-service-discovery)
5. [API Gateway](#-api-gateway)
6. [Data Management](#-data-management)
7. [Saga Pattern](#-saga-pattern)
8. [Observability](#-observability)
9. [Deployment Strategies](#-deployment-strategies)

---

## 🔄 MICROSERVICES VS MONOLITH

### Comparison

| Aspect                | Monolith           | Microservices      |
| --------------------- | ------------------ | ------------------ |
| **Deployment**        | All-or-nothing     | Independent        |
| **Scaling**           | Entire app         | Per service        |
| **Technology**        | Single stack       | Polyglot           |
| **Complexity**        | Simpler initially  | Complex from start |
| **Team structure**    | Single team        | Multiple teams     |
| **Failure isolation** | Affects entire app | Contained          |

### When to Use Microservices

```
✅ USE MICROSERVICES WHEN:
- Team size > 20 developers
- Need independent deployments
- Different scaling requirements
- Multiple technology stacks needed
- Clear bounded contexts exist

❌ AVOID MICROSERVICES WHEN:
- Small team (< 10 developers)
- Simple domain
- Tight deadlines
- Limited DevOps expertise
- No clear service boundaries
```

### Architecture Evolution

```
Stage 1: Monolith (MVP)
┌─────────────────────────────────┐
│          Learning Hub           │
│  Users + Courses + Payments     │
└─────────────────────────────────┘

Stage 2: Modular Monolith (Growing)
┌──────────────────────────────────────────┐
│              Learning Hub                 │
│ ┌───────┐ ┌─────────┐ ┌──────────┐       │
│ │ Users │ │ Courses │ │ Payments │       │
│ └───────┘ └─────────┘ └──────────┘       │
└──────────────────────────────────────────┘

Stage 3: Microservices (Scale)
┌───────┐   ┌─────────┐   ┌──────────┐
│ Users │   │ Courses │   │ Payments │
│Service│   │ Service │   │ Service  │
└───┬───┘   └────┬────┘   └────┬─────┘
    │            │             │
    └────────────┴─────────────┘
              API Gateway
```

---

## 🎯 SERVICE DESIGN PRINCIPLES

### Single Responsibility

```python
# ❌ BAD: Service does too much
class LearningService:
    def create_user(self): pass
    def process_payment(self): pass
    def upload_video(self): pass
    def send_notification(self): pass

# ✅ GOOD: Focused services
class UserService:
    def create_user(self): pass
    def authenticate(self): pass
    def get_profile(self): pass

class PaymentService:
    def process_payment(self): pass
    def refund(self): pass
    def get_history(self): pass
```

### Bounded Context

```
┌─────────────────────────────────────────────────────────────┐
│                    Learning Platform                         │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   Identity   │   Catalog    │   Billing    │   Engagement   │
│   Context    │   Context    │   Context    │    Context     │
├──────────────┼──────────────┼──────────────┼────────────────┤
│ User         │ Course       │ Payment      │ Badge          │
│ Profile      │ Lesson       │ Invoice      │ Streak         │
│ Auth         │ Category     │ Subscription │ Leaderboard    │
│ Session      │ Instructor   │ Coupon       │ XP             │
└──────────────┴──────────────┴──────────────┴────────────────┘

Each context owns its data and has clear boundaries
```

### Service Size

```
"A service should be small enough that a single team can own it,
 but large enough to be worth deploying independently."

Guidelines:
- 1 team (3-8 people) per service
- 1 service = 1 database
- Deployable in < 15 minutes
- Understandable by new team member in 1 week
```

---

## 📡 COMMUNICATION PATTERNS

### Synchronous (REST/gRPC)

```python
# HTTP REST
import httpx

async def get_user_courses(user_id: str):
    async with httpx.AsyncClient() as client:
        # Call User Service
        user = await client.get(f"http://user-service/users/{user_id}")

        # Call Course Service
        courses = await client.get(
            f"http://course-service/enrollments?user_id={user_id}"
        )

        return {"user": user.json(), "courses": courses.json()}
```

### Asynchronous (Message Queue)

```python
# Producer (Payment Service)
import pika

def publish_payment_completed(payment_data):
    connection = pika.BlockingConnection(
        pika.ConnectionParameters('rabbitmq')
    )
    channel = connection.channel()
    channel.exchange_declare(exchange='events', exchange_type='topic')

    channel.basic_publish(
        exchange='events',
        routing_key='payment.completed',
        body=json.dumps(payment_data)
    )
    connection.close()

# Consumer (Enrollment Service)
def on_payment_completed(ch, method, properties, body):
    data = json.loads(body)
    # Create enrollment after payment
    create_enrollment(data['user_id'], data['course_id'])

channel.queue_bind(queue='enrollment-queue', exchange='events',
                   routing_key='payment.completed')
channel.basic_consume(queue='enrollment-queue', on_message_callback=on_payment_completed)
```

### Comparison

| Pattern   | Use When                | Pros                 | Cons                         |
| --------- | ----------------------- | -------------------- | ---------------------------- |
| **Sync**  | Need immediate response | Simple, predictable  | Coupling, cascading failures |
| **Async** | Can tolerate delay      | Decoupled, resilient | Complex debugging            |

---

## 🔍 SERVICE DISCOVERY

### Problem

```
How does Service A find Service B when IP addresses change?

Static: service-b.example.com:8080  ❌ Doesn't work in dynamic environments
Dynamic: Need service registry
```

### Solutions

```yaml
# 1. DNS-Based (Kubernetes)
# Services automatically get DNS names
apiVersion: v1
kind: Service
metadata:
  name: user-service
spec:
  selector:
    app: user
  ports:
    - port: 80
# Access via: http://user-service.default.svc.cluster.local

# 2. Service Mesh (Istio/Linkerd)
# - Automatic discovery
# - Load balancing
# - Mutual TLS
# - Traffic management
```

### Consul Example

```python
import consul

# Register service
c = consul.Consul()
c.agent.service.register(
    name='course-service',
    service_id='course-service-1',
    address='10.0.0.5',
    port=8080,
    check=consul.Check.http('http://10.0.0.5:8080/health', interval='10s')
)

# Discover service
services = c.health.service('user-service', passing=True)
for service in services[1]:
    address = service['Service']['Address']
    port = service['Service']['Port']
    print(f"Found: {address}:{port}")
```

---

## 🚪 API GATEWAY

### Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                             │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌─────────────┐  │
│  │  Auth    │ │  Rate    │ │   Load     │ │   Request   │  │
│  │Validation│ │ Limiting │ │  Balancing │ │   Routing   │  │
│  └──────────┘ └──────────┘ └────────────┘ └─────────────┘  │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌─────────────┐  │
│  │  SSL     │ │ Response │ │  Caching   │ │  Logging/   │  │
│  │Termination│ │ Transform│ │            │ │  Metrics    │  │
│  └──────────┘ └──────────┘ └────────────┘ └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
   ┌──────────┐      ┌──────────┐      ┌──────────┐
   │  User    │      │  Course  │      │ Payment  │
   │ Service  │      │ Service  │      │ Service  │
   └──────────┘      └──────────┘      └──────────┘
```

### Kong Gateway Configuration

```yaml
# services
- name: user-service
  url: http://user-service:8080
  routes:
    - name: user-routes
      paths: ["/api/users"]
  plugins:
    - name: rate-limiting
      config:
        minute: 100
    - name: jwt
      config:
        key_claim_name: kid

- name: course-service
  url: http://course-service:8080
  routes:
    - name: course-routes
      paths: ["/api/courses"]
```

---

## 📊 DATA MANAGEMENT

### Database Per Service

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ User Service │   │Course Service│   │Payment Service│
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │
       ▼                  ▼                  ▼
 ┌──────────┐      ┌──────────┐      ┌──────────┐
 │PostgreSQL│      │ MongoDB  │      │PostgreSQL│
 │(users)   │      │(courses) │      │(payments)│
 └──────────┘      └──────────┘      └──────────┘

Each service owns its data - no shared databases!
```

### Data Consistency Challenge

```
Problem: How to keep data consistent across services?

User buys course:
1. Payment Service creates payment ✅
2. Enrollment Service creates enrollment ❓ (what if this fails?)

Solutions:
- Saga Pattern (eventual consistency)
- Two-Phase Commit (rarely used - too slow)
- Event Sourcing
```

---

## 🔄 SAGA PATTERN

### Choreography (Event-Driven)

```
┌──────────┐   payment.created   ┌────────────┐   enrollment.created   ┌────────────┐
│ Payment  │ ──────────────────► │ Enrollment │ ──────────────────────►│Notification│
│ Service  │                     │  Service   │                        │  Service   │
└──────────┘                     └────────────┘                        └────────────┘
     │                                 │
     │  payment.failed                 │  enrollment.failed
     ▼ (compensate)                    ▼ (compensate)
┌──────────┐                     ┌────────────┐
│  Refund  │                     │  Rollback  │
└──────────┘                     └────────────┘
```

### Orchestration (Central Controller)

```python
# saga_orchestrator.py
class PurchaseCourseSaga:
    def __init__(self, user_id, course_id):
        self.user_id = user_id
        self.course_id = course_id
        self.state = "STARTED"

    async def execute(self):
        try:
            # Step 1: Create Payment
            self.state = "PAYMENT_PENDING"
            payment = await payment_service.create_payment(
                self.user_id, self.course_id
            )

            # Step 2: Create Enrollment
            self.state = "ENROLLMENT_PENDING"
            enrollment = await enrollment_service.create_enrollment(
                self.user_id, self.course_id
            )

            # Step 3: Send Notification
            self.state = "NOTIFICATION_PENDING"
            await notification_service.send(
                self.user_id, "Welcome to your new course!"
            )

            self.state = "COMPLETED"
            return {"status": "success"}

        except Exception as e:
            # Compensate
            await self.compensate()
            raise

    async def compensate(self):
        if self.state in ["ENROLLMENT_PENDING", "NOTIFICATION_PENDING"]:
            await payment_service.refund(self.user_id, self.course_id)
        if self.state == "NOTIFICATION_PENDING":
            await enrollment_service.delete_enrollment(
                self.user_id, self.course_id
            )
```

---

## 📈 OBSERVABILITY

### The Three Pillars

```
┌─────────────────────────────────────────────────────────────┐
│                    Observability Stack                       │
├──────────────────┬──────────────────┬───────────────────────┤
│      Logs        │     Metrics      │       Traces          │
│                  │                  │                       │
│  What happened?  │  How is it       │  Where's the          │
│                  │  performing?     │  bottleneck?          │
├──────────────────┼──────────────────┼───────────────────────┤
│  ELK Stack       │  Prometheus      │  Jaeger               │
│  Loki            │  Grafana         │  Zipkin               │
│  Fluentd         │  Datadog         │  OpenTelemetry        │
└──────────────────┴──────────────────┴───────────────────────┘
```

### Distributed Tracing

```python
# OpenTelemetry integration
from opentelemetry import trace
from opentelemetry.instrumentation.requests import RequestsInstrumentor

# Auto-instrument HTTP requests
RequestsInstrumentor().instrument()

tracer = trace.get_tracer(__name__)

async def purchase_course(user_id, course_id):
    with tracer.start_as_current_span("purchase_course") as span:
        span.set_attribute("user_id", user_id)
        span.set_attribute("course_id", course_id)

        # This call will automatically propagate trace context
        payment = await payment_service.create(user_id, course_id)
        enrollment = await enrollment_service.create(user_id, course_id)

        return {"payment": payment, "enrollment": enrollment}
```

### Correlation ID Pattern

```python
# middleware.py
import uuid

class CorrelationIdMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        correlation_id = request.headers.get(
            'X-Correlation-ID',
            str(uuid.uuid4())
        )
        request.correlation_id = correlation_id

        response = self.get_response(request)
        response['X-Correlation-ID'] = correlation_id

        return response

# Use in logging
logger.info(f"[{request.correlation_id}] Processing payment...")
```

---

## 🚀 DEPLOYMENT STRATEGIES

### Blue-Green Deployment

```
                 ┌─────────────────┐
                 │  Load Balancer  │
                 └────────┬────────┘
                          │
         ┌────────────────┴────────────────┐
         │                                 │
         ▼                                 ▼
┌─────────────────┐              ┌─────────────────┐
│   Blue (v1.0)   │              │  Green (v1.1)   │
│   [ACTIVE]      │              │   [STANDBY]     │
└─────────────────┘              └─────────────────┘

1. Deploy new version to Green
2. Test Green
3. Switch traffic to Green
4. Blue becomes standby
```

### Canary Deployment

```
┌─────────────────┐
│  Load Balancer  │
│   (90% → v1.0)  │
│   (10% → v1.1)  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│  v1.0  │ │  v1.1  │
│  90%   │ │  10%   │
└────────┘ └────────┘

Gradually increase v1.1 traffic if metrics look good
```

---

## 💎 MICROSERVICES GOLDEN RULES

1. **Start with monolith** - Extract services when needed
2. **One database per service** - No shared databases
3. **Design for failure** - Circuit breakers, retries
4. **Automate everything** - CI/CD is mandatory
5. **Embrace eventual consistency** - Use sagas
6. **Centralize logging** - Distributed tracing essential
7. **API versioning** - Plan for change

---

**SINGULARITY ENGINE v16.0**  
_"Microservices: Solve organizational problems, not technical ones."_
