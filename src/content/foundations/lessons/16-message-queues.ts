import type { FoundationLesson } from "../types";

/**
 * Source: shared chat https://claude.ai/share/6be6bcd3-ae81-4a65-afd5-e058c33ae762,
 * "Lesson 16 | Topic: Message Queues | Phase: 1 — Foundations".
 */
export const MESSAGE_QUEUES: FoundationLesson = {
  slug: "message-queues",
  number: 16,
  title: "Message Queues",
  tagline:
    "\"Stand here and wait\" vs \"here's your order number, go sit down\" — how modern systems decouple work from time.",
  estimatedMinutes: 60,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        { kind: "paragraph", text: "You're at a busy Starbucks. You walk up, order a coffee, and the cashier says:" },
        {
          kind: "list",
          items: [
            "Option A: \"Stand here and don't move. I'll make your coffee right now while you watch. Don't leave.\"",
            "Option B: \"Here's your order number. Go sit down. We'll call you when it's ready.\"",
          ],
        },
        { kind: "paragraph", text: "Option A = Synchronous processing. Option B = Asynchronous processing with a queue." },
        { kind: "paragraph", text: "Option A blocks you. Option B frees you immediately." },
        {
          kind: "paragraph",
          text: "Now imagine Swiggy processes 500 orders per second during peak hours. For each order, Swiggy needs to: send an SMS confirmation, send an email receipt, notify the restaurant, notify a delivery partner, update analytics, update loyalty points.",
        },
        {
          kind: "paragraph",
          text: "If all of this happens synchronously — the user waits 3-4 seconds for their \"Order Placed\" confirmation.",
        },
        {
          kind: "insight",
          text: "With a message queue — user gets confirmation in 50ms. Everything else happens in the background. Message queues are how modern systems decouple work from time.",
        },
      ],
    },
    {
      id: "the-problem",
      heading: "The problem message queues solve",
      blocks: [
        { kind: "paragraph", text: "Problem 1: Tight Coupling. Without queues, services call each other directly:" },
        {
          kind: "paragraph",
          text: "What if SMS Service is down? Order Service crashes or returns an error, the user's order fails — even though the order WAS placed successfully. Services are tightly coupled. One failure cascades everywhere.",
        },
        { kind: "paragraph", text: "Problem 2: Traffic Spikes." },
        {
          kind: "flow",
          steps: [
            { title: "Normal day: 100 orders/second", detail: "all services handle fine", tone: "healthy" },
            { title: "Big Billion Day: 10,000 orders/second" },
            { title: "Email Service can only handle 500/sec", detail: "it gets overwhelmed", tone: "signal" },
            { title: "Crashes", detail: "everything downstream fails", tone: "critical" },
          ],
        },
        { kind: "paragraph", text: "Problem 3: Speed Mismatch." },
        {
          kind: "table",
          headers: ["Operation", "Latency"],
          rows: [
            ["Order placement", "needs to be fast (50ms)"],
            ["Sending email", "slow (200-500ms, external SMTP server)"],
            ["Updating analytics", "slow (complex computation)"],
          ],
        },
        { kind: "paragraph", text: "The user shouldn't wait for slow operations to complete. Message queues solve all three:" },
        {
          kind: "compare",
          panels: [
            {
              title: "Direct calls",
              nodes: [
                { id: "direct-order", label: "Order Service", col: 0, row: 2 },
                { id: "direct-sms", label: "SMS Service", col: 1, row: 0 },
                { id: "direct-email", label: "Email Service", col: 1, row: 1 },
                { id: "direct-restaurant", label: "Restaurant Service", col: 1, row: 2 },
                { id: "direct-analytics", label: "Analytics Service", col: 1, row: 3 },
                { id: "direct-loyalty", label: "Loyalty Service", col: 1, row: 4 },
              ],
              edges: [
                { from: "direct-order", to: "direct-sms" },
                { from: "direct-order", to: "direct-email" },
                { from: "direct-order", to: "direct-restaurant" },
                { from: "direct-order", to: "direct-analytics" },
                { from: "direct-order", to: "direct-loyalty" },
              ],
            },
            {
              title: "Via queue",
              nodes: [
                { id: "queued-order", label: "Order Service", col: 0, row: 1, tone: "healthy" },
                { id: "queued-queue", label: "Queue", col: 1, row: 1 },
                { id: "queued-sms", label: "SMS Service", sublabel: "processes when ready", col: 2, row: 0 },
                { id: "queued-email", label: "Email Service", sublabel: "processes when ready", col: 2, row: 1 },
                { id: "queued-analytics", label: "Analytics", sublabel: "processes when ready", col: 2, row: 2 },
              ],
              edges: [
                { from: "queued-order", to: "queued-queue", tone: "healthy" },
                { from: "queued-queue", to: "queued-sms" },
                { from: "queued-queue", to: "queued-email" },
                { from: "queued-queue", to: "queued-analytics" },
              ],
            },
          ],
        },
        {
          kind: "paragraph",
          text: "Order Service completes in 50ms — everything else happens asynchronously. If Email Service is down, messages wait in the queue; when it recovers, it processes the backlog.",
        },
      ],
    },
    {
      id: "core-concepts",
      heading: "Core concepts",
      blocks: [
        { kind: "paragraph", text: "The Three Actors:" },
        {
          kind: "architecture",
          nodes: [
            { id: "producer", label: "Producer", sublabel: "Order Service", col: 0, row: 0 },
            { id: "queue", label: "Queue", sublabel: "Message Broker", col: 1, row: 0 },
            { id: "consumer", label: "Consumer", sublabel: "Email Service", col: 2, row: 0 },
          ],
          edges: [
            { from: "producer", to: "queue", label: "sends message" },
            { from: "queue", to: "consumer", label: "reads message" },
          ],
        },
        {
          kind: "list",
          items: [
            "Producer: sends messages to the queue. Doesn't care who processes them or when.",
            "Queue/Broker: stores messages reliably, delivers to consumers, acts as a buffer.",
            "Consumer: reads and processes messages, at its own pace.",
          ],
        },
        { kind: "paragraph", text: "A message is just data — whatever the producer wants to communicate:" },
        {
          kind: "code",
          language: "json",
          code: '{\n  "event_type": "ORDER_PLACED",\n  "order_id": 9981,\n  "user_id": 123,\n  "restaurant_id": 42,\n  "total": 605.00,\n  "items": [...],\n  "timestamp": "2024-01-15T14:30:00Z"\n}',
        },
        { kind: "paragraph", text: "Acknowledgment (ACK). After processing a message, the consumer sends an ACK to the broker:" },
        {
          kind: "flow",
          steps: [
            { title: "Consumer reads message" },
            { title: "Consumer processes message", detail: "sends email" },
            { title: "Consumer sends ACK", detail: "\"I've successfully processed this\"", tone: "healthy" },
            { title: "Broker deletes message from queue", tone: "healthy" },
            { title: "If consumer crashes BEFORE sending ACK", tone: "critical" },
            { title: "Broker sees no ACK → redelivers to another consumer", detail: "message is never lost", tone: "healthy" },
          ],
        },
        { kind: "insight", text: "This is how message queues guarantee at-least-once delivery." },
      ],
    },
    {
      id: "queue-vs-topic",
      heading: "Queue vs topic — two delivery models",
      blocks: [
        { kind: "paragraph", text: "Point-to-Point (Queue Model). One message → processed by exactly ONE consumer." },
        {
          kind: "paragraph",
          text: "Used for: task queues, job processing, one-to-one work distribution. Order placed → [email queue] → Email Worker (one worker sends one email).",
        },
        { kind: "paragraph", text: "Publish-Subscribe (Topic Model). One message → delivered to ALL subscribers." },
        {
          kind: "paragraph",
          text: "Used for: event broadcasting, notifications, fan-out patterns.",
        },
        {
          kind: "compare",
          panels: [
            {
              title: "Queue — point to point",
              nodes: [
                { id: "qvt-q-producer", label: "Producer", col: 0, row: 1 },
                { id: "qvt-q-queue", label: "Queue", col: 1, row: 1 },
                { id: "qvt-q-a", label: "Consumer A", col: 2, row: 0, tone: "healthy" },
                { id: "qvt-q-b", label: "Consumer B", col: 2, row: 1 },
                { id: "qvt-q-c", label: "Consumer C", col: 2, row: 2 },
              ],
              edges: [
                { from: "qvt-q-producer", to: "qvt-q-queue" },
                { from: "qvt-q-queue", to: "qvt-q-a", tone: "healthy" },
                { from: "qvt-q-queue", to: "qvt-q-b", dashed: true },
                { from: "qvt-q-queue", to: "qvt-q-c", dashed: true },
              ],
            },
            {
              title: "Topic — pub/sub",
              nodes: [
                { id: "qvt-t-producer", label: "Producer", col: 0, row: 1 },
                { id: "qvt-t-topic", label: "Topic", col: 1, row: 1 },
                { id: "qvt-t-a", label: "Consumer A", col: 2, row: 0, tone: "healthy" },
                { id: "qvt-t-b", label: "Consumer B", col: 2, row: 1, tone: "healthy" },
                { id: "qvt-t-c", label: "Consumer C", col: 2, row: 2, tone: "healthy" },
              ],
              edges: [
                { from: "qvt-t-producer", to: "qvt-t-topic" },
                { from: "qvt-t-topic", to: "qvt-t-a", tone: "healthy" },
                { from: "qvt-t-topic", to: "qvt-t-b", tone: "healthy" },
                { from: "qvt-t-topic", to: "qvt-t-c", tone: "healthy" },
              ],
            },
          ],
          transitionLabel: ["One consumer gets each message", "vs. ALL consumers get each message"],
        },
      ],
    },
    {
      id: "delivery-guarantees",
      heading: "Message queue guarantees",
      blocks: [
        {
          kind: "paragraph",
          text: "Different queues offer different guarantees. Understanding them is critical for system design.",
        },
        { kind: "paragraph", text: "At-Most-Once: message delivered 0 or 1 times. Might be lost. Never duplicated. Use when losing a message is acceptable (metrics, analytics)." },
        { kind: "paragraph", text: "At-Least-Once (most common): message delivered 1 or more times. Might be duplicated. Never lost. Consumer must handle duplicates (idempotent processing). Use when losing a message is NOT acceptable (orders, payments)." },
        { kind: "paragraph", text: "Exactly-Once (hardest to implement): message delivered exactly 1 time. Not lost, not duplicated. Very expensive to implement, rare in practice. Use when strict financial accuracy is required." },
        { kind: "paragraph", text: "Why At-Least-Once requires idempotent consumers:" },
        {
          kind: "flow",
          steps: [
            { title: "Consumer reads \"Send email for order_9981\"" },
            { title: "Consumer sends email", tone: "healthy" },
            { title: "Consumer crashes BEFORE sending ACK", tone: "critical" },
            { title: "Broker: \"No ACK received, redeliver\"" },
            { title: "Consumer (recovered) reads message again" },
            { title: "Consumer sends email AGAIN", detail: "user gets 2 emails", tone: "critical" },
          ],
        },
        {
          kind: "paragraph",
          text: "Solution: idempotent consumer. Before sending email, check: \"Have I already processed order_9981?\" If yes → skip (don't send duplicate). If no → send and mark as processed.",
        },
        {
          kind: "code",
          language: "java",
          code: 'public void processEmailMessage(Message message) {\n    String orderId = message.getOrderId();\n\n    // Check if already processed (idempotency check)\n    if (processedOrders.contains(orderId)) {\n        log.info("Already processed order: " + orderId + ", skipping");\n        message.ack();\n        return;\n    }\n\n    // Process\n    emailService.sendOrderConfirmation(orderId);\n\n    // Mark as processed\n    processedOrders.add(orderId);\n\n    // ACK\n    message.ack();\n}',
        },
      ],
    },
    {
      id: "dead-letter-queue",
      heading: "Dead Letter Queue (DLQ)",
      blocks: [
        { kind: "paragraph", text: "What happens when a message keeps failing to process?" },
        {
          kind: "flow",
          steps: [
            { title: "Message: \"Send email to invalid_email@@broken\"" },
            { title: "Consumer tries to process: fails", tone: "critical" },
            { title: "Consumer NACKs", detail: "negative acknowledgment" },
            { title: "Broker redelivers: fails", tone: "critical" },
            { title: "Redelivers again: fails... forever?", tone: "critical" },
          ],
        },
        { kind: "paragraph", text: "Solution: Dead Letter Queue. After N failed attempts, move the message to a separate DLQ." },
        {
          kind: "paragraph",
          text: "Operations team monitors the DLQ: investigate why messages failed, fix the bug, replay messages from the DLQ.",
        },
        {
          kind: "architecture",
          nodes: [
            { id: "dlq-order-queue", label: "Order Queue", sublabel: "[msg1] [msg2] [msg3_broken] [msg4] [msg5]", col: 0, row: 0 },
            { id: "dlq-dlq", label: "Dead Letter Queue", sublabel: "[msg3_broken] ← ops team investigates", col: 1, row: 0, tone: "critical" },
          ],
          edges: [{ from: "dlq-order-queue", to: "dlq-dlq", label: "msg3_broken fails 3 times" }],
        },
        {
          kind: "insight",
          text: "Every production message queue system needs a DLQ. Without it, one bad message can block the entire queue or be lost silently.",
        },
      ],
    },
    {
      id: "queue-patterns",
      heading: "Queue patterns in system design",
      blocks: [
        { kind: "paragraph", text: "Pattern 1: Work Queue (Task Distribution). Multiple workers process tasks from a single queue:" },
        {
          kind: "architecture",
          nodes: [
            { id: "work-queue", label: "Job Queue", col: 1, row: 0 },
            { id: "work-w1", label: "Worker 1", sublabel: "processing job A", col: 0, row: 1 },
            { id: "work-w2", label: "Worker 2", sublabel: "processing job B", col: 1, row: 1 },
            { id: "work-w3", label: "Worker 3", sublabel: "processing job C", col: 2, row: 1 },
          ],
          edges: [
            { from: "work-queue", to: "work-w1" },
            { from: "work-queue", to: "work-w2" },
            { from: "work-queue", to: "work-w3" },
          ],
        },
        { kind: "paragraph", text: "Each job processed by exactly one worker. Auto-scales: add more workers for more throughput." },
        {
          kind: "paragraph",
          text: "Real example: Flipkart image processing — a user uploads a product image → [image_processing_queue] → Worker 1 resizes to thumbnail, Worker 2 resizes to medium, Worker 3 applies a watermark. Each worker handles different jobs from the queue.",
        },
        { kind: "paragraph", text: "Pattern 2: Fan-Out. One event → multiple consumers process it independently:" },
        {
          kind: "architecture",
          nodes: [
            { id: "fanout-event", label: "Order Placed Event", col: 1, row: 0 },
            { id: "fanout-sms", label: "SMS Worker", sublabel: "send SMS", col: 0, row: 1 },
            { id: "fanout-email", label: "Email Worker", sublabel: "send email", col: 1, row: 1 },
            { id: "fanout-analytics", label: "Analytics", sublabel: "update dashboard", col: 2, row: 1 },
            { id: "fanout-loyalty", label: "Loyalty", sublabel: "add points", col: 3, row: 1 },
          ],
          edges: [
            { from: "fanout-event", to: "fanout-sms" },
            { from: "fanout-event", to: "fanout-email" },
            { from: "fanout-event", to: "fanout-analytics" },
            { from: "fanout-event", to: "fanout-loyalty" },
          ],
        },
        { kind: "paragraph", text: "All four happen in parallel. Each consumer processes independently." },
        {
          kind: "paragraph",
          text: "Real example: Swiggy order placement — POST /orders → order saved → publish \"ORDER_PLACED\" event → SMS Worker (\"Your order is confirmed\"), Restaurant App (\"New order received\"), Driver App (\"New delivery available\"), Analytics (increment order count).",
        },
        { kind: "paragraph", text: "Pattern 3: Rate Limiting with Queues. Consumer processes at a controlled rate regardless of producer speed:" },
        {
          kind: "architecture",
          nodes: [
            { id: "ratelimit-producer", label: "Producer", sublabel: "10,000 msg/sec (spike)", col: 0, row: 0 },
            { id: "ratelimit-queue", label: "Queue", sublabel: "buffers all messages", col: 1, row: 0 },
            { id: "ratelimit-consumer", label: "Consumer", sublabel: "100 msg/sec, controlled", col: 2, row: 0, tone: "healthy" },
          ],
          edges: [
            { from: "ratelimit-producer", to: "ratelimit-queue" },
            { from: "ratelimit-queue", to: "ratelimit-consumer", tone: "healthy" },
          ],
        },
        {
          kind: "paragraph",
          text: "Producer is never blocked, consumer is never overwhelmed — messages are processed eventually.",
        },
        { kind: "paragraph", text: "Pattern 4: Priority Queue. Higher priority messages processed first:" },
        {
          kind: "table",
          headers: ["Priority", "Message type"],
          rows: [
            ["CRITICAL", "Payment failure alert ← processed first"],
            ["HIGH", "Order placed notification"],
            ["MEDIUM", "Promotional email"],
            ["LOW", "Weekly digest email ← processed last"],
          ],
        },
        {
          kind: "paragraph",
          text: "Implementation: separate queues per priority. High-priority workers only read from the CRITICAL queue. Normal workers read CRITICAL first, then HIGH, then MEDIUM. Background workers read LOW priority.",
        },
        { kind: "paragraph", text: "Pattern 5: Saga Pattern (Distributed Transactions). Coordinate multi-step transactions across services without distributed locks:" },
        { kind: "paragraph", text: "Happy path:" },
        {
          kind: "flow",
          steps: [
            { title: "Reserve inventory", detail: "success → proceed", tone: "healthy" },
            { title: "Process payment", detail: "success → proceed", tone: "healthy" },
            { title: "Confirm order", detail: "success → proceed", tone: "healthy" },
            { title: "Notify restaurant", detail: "success → done", tone: "healthy" },
          ],
        },
        { kind: "paragraph", text: "If Step 2 fails:" },
        {
          kind: "flow",
          steps: [
            { title: "Publish \"PAYMENT_FAILED\" event", tone: "critical" },
            { title: "Inventory Service releases reserved inventory", detail: "compensating action", tone: "critical" },
            { title: "Order Service marks order as failed", tone: "critical" },
            { title: "Notify user: \"Payment failed\"", tone: "critical" },
          ],
        },
        {
          kind: "paragraph",
          text: "Each step publishes an event. The next step is triggered by that event. Failure triggers compensating events. No distributed lock needed. Used by: Flipkart checkout, BookMyShow booking, any multi-step transaction.",
        },
      ],
    },
    {
      id: "rabbitmq",
      heading: "RabbitMQ — traditional message queue",
      blocks: [
        {
          kind: "paragraph",
          text: "RabbitMQ is the most popular traditional message broker. Good for complex routing and task queues.",
        },
        { kind: "paragraph", text: "Core Concepts: Producer → Exchange → Queue → Consumer." },
        {
          kind: "list",
          items: [
            "Exchange: receives messages and routes them to queues",
            "Queue: stores messages until consumed",
            "Binding: rule connecting exchange to queue",
          ],
        },
        { kind: "paragraph", text: "Exchange Types:" },
        { kind: "paragraph", text: "Direct Exchange — route by exact routing key:" },
        {
          kind: "architecture",
          nodes: [
            { id: "direct-exchange", label: "Exchange", sublabel: "\"orders\"", col: 0, row: 0 },
            { id: "direct-email-q", label: "email_queue", col: 1, row: 0 },
            { id: "direct-sms-q", label: "sms_queue", col: 1, row: 1 },
          ],
          edges: [
            { from: "direct-exchange", to: "direct-email-q", label: "key: email" },
            { from: "direct-exchange", to: "direct-sms-q", label: "key: sms" },
          ],
        },
        { kind: "paragraph", text: "Fanout Exchange — broadcast to all bound queues:" },
        {
          kind: "architecture",
          nodes: [
            { id: "fanout-exchange", label: "Exchange", sublabel: "\"order_events\"", col: 0, row: 1 },
            { id: "fanout-email-q", label: "email_queue", col: 1, row: 0 },
            { id: "fanout-sms-q", label: "sms_queue", col: 1, row: 1 },
            { id: "fanout-analytics-q", label: "analytics_queue", col: 1, row: 2 },
          ],
          edges: [
            { from: "fanout-exchange", to: "fanout-email-q" },
            { from: "fanout-exchange", to: "fanout-sms-q" },
            { from: "fanout-exchange", to: "fanout-analytics-q" },
          ],
        },
        { kind: "paragraph", text: "Topic Exchange — route by pattern matching:" },
        {
          kind: "architecture",
          nodes: [
            { id: "topic-exchange", label: "Exchange", sublabel: "\"logs\"", col: 0, row: 1 },
            { id: "topic-payment-q", label: "payment_errors_queue", col: 1, row: 0 },
            { id: "topic-all-errors-q", label: "all_errors_queue", col: 1, row: 1 },
            { id: "topic-critical-q", label: "critical_alerts_queue", col: 1, row: 2 },
          ],
          edges: [
            { from: "topic-exchange", to: "topic-payment-q", label: "error.payment" },
            { from: "topic-exchange", to: "topic-all-errors-q", label: "error.*" },
            { from: "topic-exchange", to: "topic-critical-q", label: "*.critical" },
          ],
        },
        {
          kind: "paragraph",
          text: "RabbitMQ strengths: complex routing (exchange types), per-message TTL and priority, dead letter queues built-in, good for task queues, low latency, management UI out of the box.",
        },
        {
          kind: "paragraph",
          text: "RabbitMQ weaknesses: not designed for massive throughput (millions/sec); messages deleted after consumption (no replay); scaling is manual; not ideal for streaming/event sourcing.",
        },
        { kind: "insight", text: "Use RabbitMQ when: complex routing logic, task queues, moderate throughput." },
      ],
    },
    {
      id: "when-to-use",
      heading: "When NOT to use a message queue",
      blocks: [
        { kind: "paragraph", text: "Queues add complexity. Don't use them everywhere." },
        {
          kind: "list",
          items: [
            "❌ When the operation must complete before responding to the user: \"Is my payment successful?\" — the user NEEDS the answer now. Use a synchronous call, not a queue.",
            "❌ When latency must be minimal: real-time gaming, trading systems — a queue adds latency.",
            "❌ When operations are simple and fast: a single database write that takes 1ms — adding a queue is overkill.",
            "❌ When you need a request-response pattern: API calls where the caller needs an immediate result — use synchronous REST/gRPC.",
          ],
        },
        { kind: "paragraph", text: "✅ Use queues when:" },
        {
          kind: "list",
          items: [
            "Work can happen after the user gets a response",
            "The system can't process at arrival rate (spike buffering)",
            "Multiple systems need the same event",
            "Work must not be lost if a consumer crashes",
            "Decoupling is more important than latency",
          ],
        },
      ],
    },
    {
      id: "comparison",
      heading: "Message queue comparison",
      blocks: [
        {
          kind: "table",
          headers: ["", "RabbitMQ", "Kafka", "AWS SQS"],
          rows: [
            ["Model", "Queue + Exchange", "Log/Stream", "Queue"],
            ["Throughput", "~50K/sec", "Millions/sec", "High"],
            ["Retention", "Until consumed", "Configurable (days/forever)", "14 days max"],
            ["Replay", "❌ No", "✅ Yes", "❌ No"],
            ["Ordering", "Per queue", "Per partition", "Best effort"],
            ["Routing", "Complex (exchanges)", "Topic-based", "Simple"],
            ["Use case", "Task queues", "Event streaming", "Simple queues on AWS"],
            ["Complexity", "Medium", "High", "Low"],
          ],
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        { kind: "paragraph", text: "Queue questions appear in almost every system design interview:" },
        {
          kind: "qa",
          question: "\"How would you handle 1 million order confirmations per day?\"",
          answer:
            "\"Decouple order placement from notification sending using a message queue. Order service publishes an ORDER_PLACED event to a topic. SMS, email, and analytics services subscribe independently — each processes at its own pace. The queue absorbs traffic spikes. If email service is temporarily down, messages wait — no orders are lost.\"",
        },
        {
          kind: "qa",
          question: "\"What happens if the email service crashes?\"",
          answer:
            "\"Messages remain in the queue with no ACK. When the email service recovers, it processes the backlog. With at-least-once delivery and idempotent consumers (checking if the email was already sent), there are no duplicate emails and no lost notifications.\"",
        },
        {
          kind: "qa",
          question: "\"What is a Dead Letter Queue?\"",
          answer:
            "\"A queue for messages that fail processing after N retries. Prevents a bad message from blocking the queue forever. Operations team monitors the DLQ, investigates failures, fixes bugs, and replays messages. Every production queue needs a DLQ.\"",
        },
      ],
    },
  ],
  summary:
    "Message queues decouple producers from consumers by introducing an asynchronous buffer that absorbs traffic spikes, enables fan-out to multiple consumers, and guarantees message delivery even when consumers are temporarily unavailable — making them the essential architectural component between any two systems that operate at different speeds or need to evolve independently.",
  keyTakeaways: [
    "Queues decouple systems — the producer doesn't know or care about consumers. They evolve independently.",
    "At-least-once delivery requires idempotent consumers — check before processing to handle redelivered messages.",
    "Dead Letter Queue is non-negotiable — bad messages must go somewhere or they block/disappear silently.",
    "Fan-out pattern enables one event to trigger many independent actions — the backbone of event-driven architecture.",
    "Queues are shock absorbers — they buffer traffic spikes so consumers process at a controlled rate.",
  ],
  exercise: {
    prompt:
      "You're designing the order processing system for Flipkart's Big Billion Day — expecting 5 million orders in the first hour (1,400 orders/second). For each order placed, Flipkart needs to: (1) send order confirmation SMS (~200ms, external SMS gateway); (2) send order confirmation email (~300ms, external SMTP); (3) notify the seller (~100ms); (4) update inventory count (~50ms, must be accurate); (5) update the analytics dashboard (~500ms, complex aggregation); (6) award loyalty points (~150ms). Which of these 6 operations should be synchronous (user waits) vs asynchronous (queued)? Justify each. For the asynchronous operations — should you use a single queue for all of them, or separate queues? What are the trade-offs? During Big Billion Day, the SMS gateway can only handle 500 SMS/second but orders are arriving at 1,400/second — how does the queue help here, and what metric would you monitor to know if you're falling behind? The loyalty points service has a bug and keeps crashing when processing orders above ₹10,000 — after 3 hours, what happens to those messages, and how does a DLQ help?",
  },
  relatedEntitySlugs: ["message-queue"],
};
