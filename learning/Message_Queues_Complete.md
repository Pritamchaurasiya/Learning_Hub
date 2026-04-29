# 📬 MESSAGE QUEUES COMPLETE GUIDE

## Asynchronous Communication at Scale

---

## 📋 TABLE OF CONTENTS

1. [What Are Message Queues](#-what-are-message-queues)
2. [Why Use Message Queues](#-why-use-message-queues)
3. [Core Concepts](#-core-concepts)
4. [Queue vs Topic vs Stream](#-queue-vs-topic-vs-stream)
5. [RabbitMQ](#-rabbitmq)
6. [Apache Kafka](#-apache-kafka)
7. [Redis Streams](#-redis-streams)
8. [Patterns & Best Practices](#-patterns--best-practices)
9. [Choosing the Right Tool](#-choosing-the-right-tool)

---

## 🎯 WHAT ARE MESSAGE QUEUES

### Definition

A **message queue** is a form of asynchronous service-to-service communication. Messages are stored on the queue until they are processed and deleted.

### Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Producer   │────►│   Message    │────►│   Consumer   │
│   (Sender)   │     │    Queue     │     │  (Receiver)  │
└──────────────┘     └──────────────┘     └──────────────┘
                           │
                           ├── Durability
                           ├── Ordering
                           └── Delivery guarantees
```

---

## 🎯 WHY USE MESSAGE QUEUES

### Problems Solved

| Problem            | Solution                              |
| ------------------ | ------------------------------------- |
| **Tight Coupling** | Decouple services via async messaging |
| **Peak Load**      | Buffer requests, process at own pace  |
| **Resilience**     | Retry failed operations               |
| **Scaling**        | Add consumers as needed               |
| **Cross-Language** | Universal protocol                    |

### Real-World Examples

```python
# WITHOUT Queue: Synchronous, blocking
def process_order(order):
    save_order(order)           # 50ms
    charge_payment(order)       # 500ms - External API!
    send_email(order)           # 200ms - External API!
    update_inventory(order)     # 100ms
    # Total: 850ms - User waits!

# WITH Queue: Asynchronous, non-blocking
def process_order(order):
    save_order(order)           # 50ms
    queue.publish('orders', order)  # 5ms
    # Total: 55ms - User happy!

# Workers handle rest
def order_worker(order):
    charge_payment(order)
    send_email(order)
    update_inventory(order)
```

---

## 🧱 CORE CONCEPTS

### Delivery Guarantees

| Guarantee         | Meaning           | Use Case                 |
| ----------------- | ----------------- | ------------------------ |
| **At-most-once**  | May lose messages | Metrics, logs            |
| **At-least-once** | May duplicate     | Payments (+ idempotency) |
| **Exactly-once**  | No loss, no dups  | Financial transactions   |

### Message Structure

```json
{
  "id": "msg-uuid",
  "timestamp": "2026-01-07T10:00:00Z",
  "type": "order.created",
  "payload": {
    "order_id": 12345,
    "user_id": 789,
    "amount": 99.99
  },
  "metadata": {
    "correlation_id": "req-123",
    "retry_count": 0
  }
}
```

### Dead Letter Queue (DLQ)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Main       │────►│   Consumer   │────►│   Process    │
│   Queue      │     │              │     │              │
└──────────────┘     └──────┬───────┘     └──────────────┘
                           │
                    [Failed 3x]
                           │
                           ▼
                    ┌──────────────┐
                    │  Dead Letter │
                    │    Queue     │
                    └──────────────┘
```

---

## 📊 QUEUE VS TOPIC VS STREAM

### Comparison

```
QUEUE (Point-to-Point):
  ┌──────┐     ┌──────────┐     ┌──────┐
  │Prod A│────►│  Queue   │────►│Cons A│ ✓ Gets message
  └──────┘     └──────────┘     └──────┘
                                ┌──────┐
                                │Cons B│ ✗ Doesn't get same message
                                └──────┘

TOPIC (Pub/Sub):
  ┌──────┐     ┌──────────┐     ┌──────┐
  │Prod A│────►│  Topic   │────►│Cons A│ ✓ Gets copy
  └──────┘     └──────────┘     └──────┘
                    │           ┌──────┐
                    └──────────►│Cons B│ ✓ Gets copy
                                └──────┘

STREAM (Log-based):
  ┌──────┐     ┌────────────────────────────┐
  │Prod A│────►│  Stream [0][1][2][3][4]    │
  └──────┘     └────────────────────────────┘
                    ▲         ▲
               Cons A (offset=2)
                         Cons B (offset=4)
```

---

## 🐰 RABBITMQ

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     RabbitMQ Broker                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐  │
│  │ Exchange │───►│ Binding  │───►│      Queue       │  │
│  │ (Router) │    │  (Rule)  │    │   (Storage)      │  │
│  └──────────┘    └──────────┘    └──────────────────┘  │
│                                                         │
│  Exchange Types: direct, fanout, topic, headers        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Python Example with Pika

```python
import pika
import json

# Connection
connection = pika.BlockingConnection(
    pika.ConnectionParameters('localhost')
)
channel = connection.channel()

# Declare exchange and queue
channel.exchange_declare(exchange='orders', exchange_type='topic')
channel.queue_declare(queue='order_processing', durable=True)
channel.queue_bind(
    exchange='orders',
    queue='order_processing',
    routing_key='order.created'
)

# Producer
def publish_order(order):
    channel.basic_publish(
        exchange='orders',
        routing_key='order.created',
        body=json.dumps(order),
        properties=pika.BasicProperties(
            delivery_mode=2,  # Persistent
            content_type='application/json'
        )
    )

# Consumer
def callback(ch, method, properties, body):
    order = json.loads(body)
    try:
        process_order(order)
        ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as e:
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

channel.basic_qos(prefetch_count=1)
channel.basic_consume(queue='order_processing', on_message_callback=callback)
channel.start_consuming()
```

### Django Celery Integration

```python
# settings.py
CELERY_BROKER_URL = 'amqp://guest:guest@localhost:5672//'

# tasks.py
from celery import shared_task

@shared_task(bind=True, max_retries=3)
def process_order_task(self, order_id):
    try:
        order = Order.objects.get(id=order_id)
        # Process...
    except Exception as exc:
        self.retry(exc=exc, countdown=60)
```

---

## 🦈 APACHE KAFKA

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Kafka Cluster                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Topic: orders                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Partition 0: [0][1][2][3][4][5]──► Offset 5    │   │
│  │ Partition 1: [0][1][2][3]──────► Offset 3      │   │
│  │ Partition 2: [0][1][2][3][4]───► Offset 4      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Consumer Group: order-processors                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ Consumer 1  │ │ Consumer 2  │ │ Consumer 3  │       │
│  │ (Part 0)    │ │ (Part 1)    │ │ (Part 2)    │       │
│  └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Python Example

```python
from kafka import KafkaProducer, KafkaConsumer
import json

# Producer
producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
    acks='all',  # Wait for all replicas
    retries=3
)

def send_order(order):
    future = producer.send(
        'orders',
        key=str(order['user_id']).encode(),  # For partitioning
        value=order
    )
    record_metadata = future.get(timeout=10)
    return record_metadata.offset

# Consumer
consumer = KafkaConsumer(
    'orders',
    bootstrap_servers=['localhost:9092'],
    group_id='order-processors',
    auto_offset_reset='earliest',
    value_deserializer=lambda m: json.loads(m.decode('utf-8')),
    enable_auto_commit=False
)

for message in consumer:
    try:
        process_order(message.value)
        consumer.commit()
    except Exception as e:
        # Handle error, maybe send to DLQ topic
        send_to_dlq(message)
```

### When to Use Kafka

- **Event sourcing** - Full history of events
- **Log aggregation** - Central log collection
- **Stream processing** - Real-time analytics
- **High throughput** - Millions of messages/sec
- **Replay capability** - Re-process historical data

---

## 🔴 REDIS STREAMS

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Redis Stream                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Stream: orders                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 1704614400-0  │ 1704614401-0 │ 1704614402-0   │   │
│  │ {order_id:1}  │ {order_id:2} │ {order_id:3}   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Consumer Group: processors                             │
│  ┌───────────────────────────────────────────────┐     │
│  │ Consumer-1: last-delivered-id = 1704614401-0  │     │
│  │ Consumer-2: last-delivered-id = 1704614402-0  │     │
│  │ Pending Entries List (PEL): [1704614401-0]   │     │
│  └───────────────────────────────────────────────┘     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Python Example

```python
import redis

r = redis.Redis()

# Producer
def add_order(order):
    stream_id = r.xadd('orders', order)
    return stream_id

# Consumer with group
r.xgroup_create('orders', 'processors', id='0', mkstream=True)

def consume_orders():
    while True:
        messages = r.xreadgroup(
            'processors',
            'consumer-1',
            {'orders': '>'},  # Only new messages
            count=10,
            block=5000
        )

        for stream, entries in messages:
            for msg_id, data in entries:
                try:
                    process_order(data)
                    r.xack('orders', 'processors', msg_id)
                except Exception:
                    # Will retry automatically
                    pass

# Claim stuck messages
def claim_pending():
    """Claim messages stuck for > 1 minute."""
    pending = r.xpending('orders', 'processors')
    for entry in pending:
        if entry['time_since_delivered'] > 60000:
            r.xclaim(
                'orders', 'processors', 'consumer-1',
                min_idle_time=60000,
                message_ids=[entry['message_id']]
            )
```

---

## 🎨 PATTERNS & BEST PRACTICES

### Idempotent Consumers

```python
def process_message(message):
    """Ensure processing is idempotent."""
    message_id = message['id']

    # Check if already processed
    if redis.sismember('processed_messages', message_id):
        return  # Skip duplicate

    # Process
    do_work(message)

    # Mark as processed (with TTL)
    redis.sadd('processed_messages', message_id)
    redis.expire('processed_messages', 86400)
```

### Retry with Backoff

```python
@shared_task(
    bind=True,
    autoretry_for=(TemporaryError,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
    max_retries=5
)
def reliable_task(self, data):
    process(data)
```

### Dead Letter Queue Pattern

```python
def consume_with_dlq(message, max_retries=3):
    retry_count = message.get('retry_count', 0)

    try:
        process(message)
    except Exception as e:
        if retry_count < max_retries:
            message['retry_count'] = retry_count + 1
            queue.publish(message, delay=2 ** retry_count * 60)
        else:
            dlq.publish({
                'original_message': message,
                'error': str(e),
                'failed_at': datetime.now().isoformat()
            })
```

---

## 🎯 CHOOSING THE RIGHT TOOL

| Criteria       | RabbitMQ    | Kafka           | Redis Streams     |
| -------------- | ----------- | --------------- | ----------------- |
| **Throughput** | Medium      | Very High       | High              |
| **Latency**    | Low         | Medium          | Very Low          |
| **Durability** | Optional    | Yes             | Optional          |
| **Ordering**   | Per-queue   | Per-partition   | Per-stream        |
| **Replay**     | No          | Yes             | Yes               |
| **Complexity** | Medium      | High            | Low               |
| **Best For**   | Task queues | Event streaming | Real-time + cache |

### Decision Tree

```
Need event replay/history?
├── Yes → Kafka
└── No
    ├── Need complex routing?
    │   ├── Yes → RabbitMQ
    │   └── No
    │       ├── Already using Redis?
    │       │   ├── Yes → Redis Streams
    │       │   └── No → RabbitMQ (simpler setup)
    │       └── Need < 1ms latency?
    │           └── Yes → Redis Streams
```

---

**SINGULARITY ENGINE v17.0**  
_"Decouple, scale, and never lose a message."_
