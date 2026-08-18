import type { FoundationLesson } from "../types";

/**
 * Source: shared chat https://claude.ai/share/6be6bcd3-ae81-4a65-afd5-e058c33ae762,
 * "Lesson 17 | Topic: Kafka Deep Dive | Phase: 1 — Foundations".
 */
export const KAFKA_DEEP_DIVE: FoundationLesson = {
  slug: "kafka-deep-dive",
  number: 17,
  title: "Kafka Deep Dive",
  tagline:
    "A postman delivers one letter to one person and it's gone. Kafka is a newspaper press — printed, archived, and replayable if you missed yesterday's edition.",
  estimatedMinutes: 60,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        { kind: "paragraph", text: "Imagine a newspaper." },
        {
          kind: "paragraph",
          text: "RabbitMQ is like a postman — he picks up your letter, delivers it to one person, and the letter is gone. Once delivered, it's done.",
        },
        {
          kind: "paragraph",
          text: "Kafka is like a newspaper printing press — it prints thousands of copies, distributes them to everyone who wants one, keeps the old editions in an archive, and if you missed yesterday's paper, you can go back and read it.",
        },
        {
          kind: "insight",
          text: "This difference — log-based, replayable, distributed — is what makes Kafka fundamentally different from traditional queues.",
        },
        {
          kind: "paragraph",
          text: "LinkedIn built Kafka in 2010 because they needed to move billions of events per day — user activity, metrics, logs, notifications — across their entire infrastructure. Nothing else existed that could do it.",
        },
        { kind: "paragraph", text: "Today, Kafka is the backbone of data infrastructure at:" },
        {
          kind: "list",
          items: [
            "Uber — trip events, driver location updates, surge pricing",
            "Netflix — viewing events, recommendations pipeline",
            "Flipkart — order events, inventory updates, analytics",
            "LinkedIn — activity feeds, notifications, metrics",
            "Zomato — order pipeline, restaurant analytics",
          ],
        },
      ],
    },
    {
      id: "why-kafka-exists",
      heading: "Why Kafka exists — the problem at scale",
      blocks: [
        {
          kind: "paragraph",
          text: "Let's say Uber needs to process location updates from 5 million drivers simultaneously. Each driver sends location every 4 seconds:",
        },
        {
          kind: "code",
          code: "5,000,000 drivers × (1 update / 4 seconds)\n= 1,250,000 location updates/second\n= 75,000,000 updates/minute\n= 4,500,000,000 updates/hour",
        },
        { kind: "paragraph", text: "4.5 billion events per hour. From location alone." },
        {
          kind: "paragraph",
          text: "Now add: trip events, payment events, surge pricing calculations, driver analytics, rider notifications, fraud detection...",
        },
        {
          kind: "insight",
          text: "No traditional message queue handles this. RabbitMQ tops out at ~50,000 messages/second. Kafka handles millions per second on a single cluster.",
        },
        { kind: "paragraph", text: "But throughput isn't the only problem. Uber also needs:" },
        {
          kind: "list",
          items: [
            "Multiple consumers — pricing, analytics, and fraud detection all need the same location event",
            "Replay — if the fraud detection service was down for 2 hours, it needs to process the missed events",
            "Retention — keep 7 days of events for debugging and reprocessing",
          ],
        },
        { kind: "insight", text: "RabbitMQ can't do this. Kafka was built for exactly this." },
      ],
    },
    {
      id: "core-architecture",
      heading: "The core Kafka architecture",
      blocks: [
        {
          kind: "architecture",
          nodes: [
            { id: "kafka-producer", label: "Producer", sublabel: "writes to topic", col: 0, row: 1 },
            { id: "kafka-partition-0", label: "Partition 0", sublabel: "Broker 1", col: 1, row: 0, entityType: "kafka" },
            { id: "kafka-partition-1", label: "Partition 1", sublabel: "Broker 2", col: 1, row: 1, entityType: "kafka" },
            { id: "kafka-partition-2", label: "Partition 2", sublabel: "Broker 3", col: 1, row: 2, entityType: "kafka" },
            { id: "kafka-consumer", label: "Consumer", sublabel: "reads from topic", col: 2, row: 1 },
          ],
          edges: [
            { from: "kafka-producer", to: "kafka-partition-0" },
            { from: "kafka-producer", to: "kafka-partition-1" },
            { from: "kafka-producer", to: "kafka-partition-2" },
            { from: "kafka-partition-0", to: "kafka-consumer" },
            { from: "kafka-partition-1", to: "kafka-consumer" },
            { from: "kafka-partition-2", to: "kafka-consumer" },
          ],
        },
        {
          kind: "paragraph",
          text: "Kafka's architecture is radically different from traditional queues — understanding it is the key to everything else. Producer writes to the topic (\"order-events\" above), distributed across partitions. Consumer reads from the topic — each consumer reads some partitions.",
        },
        { kind: "paragraph", text: "Let's unpack each component." },
      ],
    },
    {
      id: "topics-and-partitions",
      heading: "Topics and partitions — the foundation",
      blocks: [
        { kind: "paragraph", text: "Topic — a named stream of events. Think of it as a category or feed name." },
        { kind: "paragraph", text: "Topics at Flipkart:" },
        {
          kind: "list",
          items: [
            "\"order-events\" → all order lifecycle events",
            "\"inventory-updates\" → stock level changes",
            "\"user-activity\" → clicks, searches, page views",
            "\"payment-events\" → payment attempts, successes, failures",
          ],
        },
        { kind: "paragraph", text: "Partition — each topic is split into partitions: ordered, immutable log files." },
        { kind: "paragraph", text: "Topic \"order-events\" with 3 partitions:" },
        {
          kind: "table",
          headers: ["Partition", "Messages in order"],
          rows: [
            ["Partition 0", "[msg0] [msg1] [msg2] [msg3] [msg4] ..."],
            ["Partition 1", "[msg0] [msg1] [msg2] ..."],
            ["Partition 2", "[msg0] [msg1] [msg2] [msg3] ..."],
          ],
        },
        { kind: "paragraph", text: "Key properties of partitions:" },
        {
          kind: "list",
          items: [
            "Ordered within partition — messages in one partition are strictly ordered",
            "Immutable — once written, a message is never modified",
            "Indexed by offset — each message has a sequential number (offset)",
            "Distributed — different partitions live on different brokers (servers)",
          ],
        },
        { kind: "paragraph", text: "Offset — every message in a partition has an offset, a sequential, immutable ID." },
        { kind: "paragraph", text: "Partition 0:" },
        {
          kind: "table",
          headers: ["Offset", "Data"],
          rows: [
            ["0", "order_A (oldest)"],
            ["1", "order_B"],
            ["2", "order_C"],
            ["3", "order_D"],
            ["4", "order_E (newest)"],
          ],
        },
        {
          kind: "insight",
          text: "Consumers track which offset they've read up to. This is why Kafka can replay — consumers can reset their offset to reread old messages.",
        },
      ],
    },
    {
      id: "producers",
      heading: "Producers — writing to Kafka",
      blocks: [
        {
          kind: "flow",
          steps: [
            { title: "ORDER_PLACED", detail: "order_9981" },
            { title: "PAYMENT_SUCCESS" },
            { title: "PREPARING" },
            { title: "DELIVERED", tone: "healthy" },
          ],
        },
        {
          kind: "paragraph",
          text: "That's a single order's event sequence — and it only stays in this order if every one of those events lands on the same partition. Split across partitions, DELIVERED might be processed before ORDER_PLACED. Producers write messages to topics, choosing which partition using a partitioning strategy.",
        },
        { kind: "paragraph", text: "By Key (most common) — all events for the same order go to the same partition, guaranteeing ordering for a single order." },
        {
          kind: "code",
          language: "java",
          code: '// All events for the same order go to same partition\n// Guarantees ordering for a single order\nproducer.send(new ProducerRecord<>(\n    "order-events",\n    orderId,        // key → determines partition\n    orderEventJson  // value\n));\n\n// Kafka hashes the key:\npartition = hash(orderId) % numPartitions\n\n// order_9981 → always Partition 0\n// order_9982 → always Partition 2\n// order_9983 → always Partition 1',
        },
        { kind: "paragraph", text: "Round Robin (when ordering doesn't matter) — maximum throughput, no ordering guarantee:" },
        { kind: "code", language: "java", code: '// No key → round robin across partitions\n// Maximum throughput, no ordering guarantee\nproducer.send(new ProducerRecord<>("metrics", null, metricJson));' },
        { kind: "paragraph", text: "Custom Partitioner:" },
        {
          kind: "code",
          language: "java",
          code: "// Route VIP orders to dedicated partition\npublic int partition(String topic, Object key, ...) {\n    Order order = deserialize(value);\n    if (order.isVIP()) return 0;  // VIP partition\n    return hash(key) % (numPartitions - 1) + 1;\n}",
        },
      ],
    },
    {
      id: "consumers",
      heading: "Consumers and consumer groups — reading from Kafka",
      blocks: [
        {
          kind: "paragraph",
          text: "Consumer Group — multiple consumers working together to process a topic are organized into a consumer group.",
        },
        { kind: "paragraph", text: "Topic \"order-events\" — 6 partitions:" },
        {
          kind: "table",
          headers: ["Group", "Consumer", "Partitions"],
          rows: [
            ["notification-service", "Consumer 1", "0, 1"],
            ["notification-service", "Consumer 2", "2, 3"],
            ["notification-service", "Consumer 3", "4, 5"],
            ["analytics-service", "Consumer A", "0, 1, 2"],
            ["analytics-service", "Consumer B", "3, 4, 5"],
          ],
        },
        { kind: "paragraph", text: "Critical insight:" },
        {
          kind: "list",
          items: [
            "Each partition is assigned to exactly one consumer within a group",
            "Different consumer groups get all the messages independently",
            "Adding more consumers in a group = more parallelism (up to the number of partitions)",
          ],
        },
        {
          kind: "insight",
          text: "Rule: max useful consumers per group = number of partitions. 6 partitions, 6 consumers → each gets 1 partition ✅. 6 partitions, 3 consumers → each gets 2 partitions ✅. 6 partitions, 10 consumers → 4 consumers sit idle ⚠️. To increase parallelism: increase partition count.",
        },
        { kind: "paragraph", text: "Offset Management — each consumer group tracks its own offset per partition:" },
        {
          kind: "table",
          headers: ["Group", "Partition", "Offset"],
          rows: [
            ["notification-service", "Partition 0", "157 (processed up to message 157)"],
            ["notification-service", "Partition 1", "203"],
            ["notification-service", "Partition 2", "89"],
            ["analytics-service", "Partition 0", "143 (behind! processing slower)"],
            ["analytics-service", "Partition 1", "198"],
            ["analytics-service", "Partition 2", "201"],
          ],
        },
        { kind: "paragraph", text: "This is stored in Kafka itself (in a special topic __consumer_offsets)." },
      ],
    },
    {
      id: "brokers-and-replication",
      heading: "Brokers and replication — durability and availability",
      blocks: [
        {
          kind: "architecture",
          nodes: [
            { id: "rf-leader", label: "Broker 1", sublabel: "Partition 0 — LEADER", col: 1, row: 0, tone: "healthy", entityType: "kafka" },
            { id: "rf-follower-1", label: "Broker 2", sublabel: "Partition 0 — FOLLOWER", col: 0, row: 1, entityType: "kafka" },
            { id: "rf-follower-2", label: "Broker 3", sublabel: "Partition 0 — FOLLOWER", col: 2, row: 1, entityType: "kafka" },
          ],
          edges: [
            { from: "rf-leader", to: "rf-follower-1", label: "replicates" },
            { from: "rf-leader", to: "rf-follower-2", label: "replicates" },
          ],
        },
        {
          kind: "paragraph",
          text: "That's Partition 0 of the \"order-events\" topic at replication factor 3: one broker holds the LEADER copy, the other two hold FOLLOWER copies. All writes go to the LEADER, followers replicate from it, and producers/consumers only ever talk to the LEADER — every partition has exactly one leader and N-1 such followers.",
        },
        {
          kind: "paragraph",
          text: "Broker — a Kafka broker is a server in the Kafka cluster. Each broker stores some partitions (as files on disk), handles produce and consume requests, and participates in leader election.",
        },
        { kind: "paragraph", text: "The same leader/follower pattern repeats across every partition in the topic. Kafka Cluster: 3 Brokers." },
        {
          kind: "table",
          headers: ["Broker", "Partition", "Role"],
          rows: [
            ["Broker 1", "Partition 0", "leader"],
            ["Broker 1", "Partition 2", "replica"],
            ["Broker 2", "Partition 1", "leader"],
            ["Broker 2", "Partition 0", "replica"],
            ["Broker 3", "Partition 2", "leader"],
            ["Broker 3", "Partition 1", "replica"],
          ],
        },
        { kind: "paragraph", text: "What happens when a broker fails:" },
        {
          kind: "flow",
          steps: [
            { title: "Broker 1 (leader for Partition 0) crashes", tone: "critical" },
            { title: "Kafka detects failure", detail: "via ZooKeeper/KRaft", tone: "signal" },
            { title: "Elects new leader from in-sync replicas (ISR)", detail: "Broker 2 or 3 becomes new leader" },
            { title: "Producers/consumers automatically reroute to new leader", detail: "downtime ~10-30 seconds", tone: "healthy" },
          ],
        },
        { kind: "paragraph", text: "Replication factor trade-off:" },
        {
          kind: "table",
          headers: ["RF", "Redundancy", "Overhead"],
          rows: [
            ["RF=1", "no redundancy — any broker failure = data loss", "fastest writes"],
            ["RF=2", "survives 1 failure", "moderate overhead"],
            ["RF=3", "survives 2 failures ← recommended", "standard production setting"],
            ["RF=5", "survives 4 failures", "high overhead, overkill for most"],
          ],
        },
      ],
    },
    {
      id: "retention",
      heading: "Message retention — the key differentiator",
      blocks: [
        { kind: "paragraph", text: "Traditional queues delete messages after consumption. Kafka retains messages for a configurable period regardless of consumption." },
        { kind: "paragraph", text: "Retention policy options:" },
        {
          kind: "list",
          items: [
            "By time: retain for 7 days (default)",
            "By size: retain up to 100GB per partition",
            "Forever: compact mode (keep latest per key)",
          ],
        },
        { kind: "paragraph", text: "After the retention period, old messages are deleted (oldest segments first)." },
        { kind: "paragraph", text: "Why retention changes everything — scenario: analytics service was down for 6 hours." },
        {
          kind: "compare",
          panels: [
            {
              title: "Traditional Queue (RabbitMQ)",
              nodes: [
                { id: "retention-rmq-outage", label: "Messages during outage", sublabel: "LOST ❌", col: 0, row: 0, tone: "critical" },
                { id: "retention-rmq-analytics", label: "Analytics", sublabel: "missing 6 hours of data", col: 1, row: 0, tone: "critical", entityType: "api" },
              ],
              edges: [{ from: "retention-rmq-outage", to: "retention-rmq-analytics", tone: "critical" }],
            },
            {
              title: "Kafka",
              nodes: [
                { id: "retention-kafka-outage", label: "Messages during outage", sublabel: "still in topic ✅", col: 0, row: 0, tone: "healthy" },
                {
                  id: "retention-kafka-analytics",
                  label: "Analytics service recovers",
                  sublabel: "reads from last committed offset, catches up — no data lost",
                  col: 1,
                  row: 0,
                  tone: "healthy",
                  entityType: "api",
                },
              ],
              edges: [{ from: "retention-kafka-outage", to: "retention-kafka-analytics", tone: "healthy" }],
            },
          ],
        },
        { kind: "paragraph", text: "Log Compaction — a special retention mode. Instead of deleting old messages by time, keep only the latest value per key:" },
        {
          kind: "table",
          headers: ["Before compaction", "After compaction (keep latest per key)"],
          rows: [
            [
              '[user:123→"Mumbai"] [user:456→"Delhi"] [user:123→"Pune"] [user:123→"Bangalore"]',
              '[user:456→"Delhi"] [user:123→"Bangalore"]',
            ],
          ],
        },
        {
          kind: "paragraph",
          text: "Use case: Kafka as a database — always have the latest state of each entity. Used for: user preferences, configuration, entity state.",
        },
      ],
    },
    {
      id: "performance",
      heading: "Kafka performance — why it's so fast",
      blocks: [
        { kind: "paragraph", text: "Kafka achieves extraordinary throughput through several design decisions." },
        { kind: "paragraph", text: "Sequential Disk Writes:" },
        {
          kind: "table",
          headers: ["Write pattern", "Speed"],
          rows: [
            ["Random disk write", "~100 I/Os/second"],
            ["Sequential write", "~millions/second"],
          ],
        },
        {
          kind: "paragraph",
          text: "Kafka ALWAYS writes sequentially (append-only log) — sequential disk writes are as fast as RAM writes.",
        },
        { kind: "paragraph", text: "Zero-Copy Data Transfer:" },
        {
          kind: "compare",
          panels: [
            {
              title: "Traditional data path — 4 copies, 2 context switches",
              nodes: [
                { id: "copy-disk-1", label: "Disk", col: 0, row: 0 },
                { id: "copy-kernel-1", label: "Kernel buffer", col: 1, row: 0 },
                { id: "copy-user-1", label: "User space", col: 2, row: 0 },
                { id: "copy-kernel-2", label: "Kernel buffer", col: 3, row: 0 },
                { id: "copy-network-1", label: "Network", col: 4, row: 0 },
              ],
              edges: [
                { from: "copy-disk-1", to: "copy-kernel-1" },
                { from: "copy-kernel-1", to: "copy-user-1" },
                { from: "copy-user-1", to: "copy-kernel-2" },
                { from: "copy-kernel-2", to: "copy-network-1" },
              ],
            },
            {
              title: "Kafka zero-copy — 2 copies, 0 context switches",
              nodes: [
                { id: "copy-disk-2", label: "Disk", col: 0, row: 0, tone: "healthy" },
                { id: "copy-kernel-3", label: "Kernel buffer", col: 1, row: 0, tone: "healthy" },
                { id: "copy-network-2", label: "Network", col: 2, row: 0, tone: "healthy" },
              ],
              edges: [
                { from: "copy-disk-2", to: "copy-kernel-3", tone: "healthy" },
                { from: "copy-kernel-3", to: "copy-network-2", tone: "healthy", label: "sendfile()" },
              ],
            },
          ],
        },
        { kind: "paragraph", text: "Batching:" },
        {
          kind: "table",
          headers: ["Mode", "Behavior", "Network calls"],
          rows: [
            ["Without batching", "producer sends 1 message per round trip", "1 network call per message"],
            ["With batching", "producer accumulates 100 messages (or 5ms passes)", "1 call for 100 messages — 100x fewer"],
          ],
        },
        { kind: "paragraph", text: "Page Cache — the OS page cache keeps recently written data in RAM, so most reads come from cache (not disk); consumers reading recent data get RAM speed, not disk speed." },
        {
          kind: "insight",
          text: "Combined result: Kafka throughput on a single node — writes: 700MB/second, reads: 2GB/second (multiple consumers reading the same data from cache).",
        },
      ],
    },
    {
      id: "kafka-vs-rabbitmq",
      heading: "Kafka vs RabbitMQ — when to use which",
      blocks: [
        { kind: "paragraph", text: "This is the most important practical decision:" },
        {
          kind: "table",
          headers: ["Choose Kafka when", "Choose RabbitMQ when"],
          rows: [
            ["Millions of messages/second", "Thousands of messages/second"],
            ["Multiple consumers per event", "Point-to-point task queues"],
            ["Message replay needed", "Complex routing (exchanges)"],
            ["Event sourcing/event streaming", "Per-message TTL/priority"],
            ["Long retention needed", "Low latency is critical"],
            ["Analytics pipeline", "Simpler operational model"],
            ["Audit log", "Task distribution"],
            ["Real-time data pipeline", ""],
            ["Microservices event bus", ""],
          ],
        },
        { kind: "paragraph", text: "Real decision framework:" },
        {
          kind: "tree",
          root: {
            label: "Need to replay messages?",
            children: [
              { label: "Kafka", edgeLabel: "YES", tone: "healthy" },
              {
                label: "Need millions of messages/second?",
                edgeLabel: "NO",
                children: [
                  { label: "Kafka", edgeLabel: "YES", tone: "healthy" },
                  {
                    label: "Do multiple independent services need the same event?",
                    edgeLabel: "NO",
                    children: [
                      { label: "Both work — Kafka better at scale", edgeLabel: "YES", tone: "healthy" },
                      {
                        label: "Need complex routing (exchanges, headers)?",
                        edgeLabel: "NO",
                        children: [
                          { label: "RabbitMQ", edgeLabel: "YES" },
                          {
                            label: "Simple task queue (one producer, one consumer type)?",
                            edgeLabel: "NO",
                            children: [{ label: "RabbitMQ (simpler, less overhead)", edgeLabel: "YES" }],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
    },
    {
      id: "real-architectures",
      heading: "Kafka in real system designs",
      blocks: [
        { kind: "paragraph", text: "Uber's Architecture:" },
        {
          kind: "architecture",
          nodes: [
            { id: "uber-topic", label: "driver-locations", sublabel: "Kafka topic — update every 4s", col: 1, row: 0, entityType: "kafka" },
            { id: "uber-surge", label: "surge-pricing-service", sublabel: "calculates demand, updates multipliers", col: 0, row: 1, entityType: "api" },
            { id: "uber-eta", label: "eta-service", sublabel: "updates driver ETAs", col: 1, row: 1, entityType: "api" },
            { id: "uber-analytics", label: "analytics-service", sublabel: "populates dashboards", col: 2, row: 1, entityType: "api" },
            { id: "uber-fraud", label: "fraud-detection", sublabel: "detects impossible speeds", col: 3, row: 1, entityType: "api" },
          ],
          edges: [
            { from: "uber-topic", to: "uber-surge" },
            { from: "uber-topic", to: "uber-eta" },
            { from: "uber-topic", to: "uber-analytics" },
            { from: "uber-topic", to: "uber-fraud" },
          ],
        },
        { kind: "paragraph", text: "One topic, four independent consumer groups, four different use cases." },
        { kind: "paragraph", text: "Netflix's Architecture:" },
        {
          kind: "architecture",
          nodes: [
            { id: "netflix-topic", label: "viewing-events", sublabel: "Kafka topic", col: 1, row: 0, entityType: "kafka" },
            { id: "netflix-recs", label: "recommendations-pipeline", sublabel: "updates similar-user watch, feeds ML training", col: 0, row: 1, entityType: "api" },
            { id: "netflix-billing", label: "billing-service", sublabel: "tracks watch minutes", col: 1, row: 1, entityType: "api" },
            { id: "netflix-analytics", label: "analytics", sublabel: "content performance dashboards", col: 2, row: 1, entityType: "api" },
            { id: "netflix-resume", label: "resume-playback", sublabel: "stores where user paused", col: 3, row: 1, entityType: "api" },
          ],
          edges: [
            { from: "netflix-topic", to: "netflix-recs" },
            { from: "netflix-topic", to: "netflix-billing" },
            { from: "netflix-topic", to: "netflix-analytics" },
            { from: "netflix-topic", to: "netflix-resume" },
          ],
        },
        { kind: "paragraph", text: "Flipkart's Order Pipeline:" },
        {
          kind: "architecture",
          nodes: [
            { id: "flipkart-topic", label: "order-events", sublabel: "Kafka topic, key = order_id", col: 1, row: 0, entityType: "kafka" },
            { id: "flipkart-inventory", label: "inventory-service", sublabel: "reserve items, in order per order_id", col: 0, row: 1, entityType: "api" },
            { id: "flipkart-payment", label: "payment-service", sublabel: "initiate payment", col: 1, row: 1, entityType: "api" },
            { id: "flipkart-notification", label: "notification-service", sublabel: "SMS + email", col: 2, row: 1, entityType: "api" },
            { id: "flipkart-analytics", label: "analytics", sublabel: "GMV dashboard, conversion funnel", col: 3, row: 1, entityType: "api" },
          ],
          edges: [
            { from: "flipkart-topic", to: "flipkart-inventory" },
            { from: "flipkart-topic", to: "flipkart-payment" },
            { from: "flipkart-topic", to: "flipkart-notification" },
            { from: "flipkart-topic", to: "flipkart-analytics" },
          ],
        },
      ],
    },
    {
      id: "configuration",
      heading: "Kafka configuration that matters in interviews",
      blocks: [
        { kind: "paragraph", text: "Producer Configuration:" },
        {
          kind: "code",
          code: "acks = 0   : Fire and forget (fastest, data loss possible)\nacks = 1   : Leader confirms (good balance)\nacks = all : All replicas confirm (slowest, no data loss) ← for critical data\n\ncompression.type = snappy  : compress messages (saves bandwidth)\nbatch.size = 16384         : batch up to 16KB before sending\nlinger.ms = 5              : wait up to 5ms to build a batch",
        },
        { kind: "paragraph", text: "Consumer Configuration:" },
        {
          kind: "code",
          code: "auto.offset.reset = earliest : start from beginning of topic\nauto.offset.reset = latest   : start from new messages only\n\nenable.auto.commit = true    : auto-commit offsets (simpler, risk of loss)\nenable.auto.commit = false   : manual commit (safer, must commit after processing)\n\nmax.poll.records = 500       : max messages per poll() call",
        },
        { kind: "paragraph", text: "Topic Configuration:" },
        {
          kind: "code",
          code: "retention.ms = 604800000       : retain 7 days\nretention.bytes = 107374182400 : retain up to 100GB\nreplication.factor = 3         : 3 replicas per partition\nmin.insync.replicas = 2        : need 2 replicas to confirm write",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        {
          kind: "paragraph",
          text: "Kafka appears in almost every HLD interview for companies like Flipkart, Uber, Microsoft, and Atlassian.",
        },
        {
          kind: "qa",
          question: "\"Why would you use Kafka instead of RabbitMQ?\"",
          answer:
            "\"Kafka for event streaming at scale — when I need message replay, multiple independent consumer groups processing the same events, high throughput (millions/sec), and long retention. RabbitMQ for task queues with complex routing and lower throughput requirements.\"",
        },
        {
          kind: "qa",
          question: "\"How does Kafka guarantee ordering?\"",
          answer:
            "\"Ordering is guaranteed within a partition. By partitioning by a meaningful key — like order_id or user_id — all events for the same entity go to the same partition and are processed in order. Across partitions there's no ordering guarantee.\"",
        },
        {
          kind: "qa",
          question: "\"What happens if a consumer is slow?\"",
          answer:
            "\"Consumer lag increases — the difference between the latest offset and the consumer's current offset. Kafka retains messages so nothing is lost. Solution: add more consumers (up to partition count) to parallelize processing, or increase partition count for more parallelism headroom.\"",
        },
        {
          kind: "qa",
          question: "\"How does Kafka handle a broker failure?\"",
          answer:
            "\"With replication factor 3, Kafka maintains 3 copies of each partition. When a broker fails, Kafka elects a new leader from in-sync replicas within ~30 seconds. Producers and consumers automatically reconnect to the new leader. No data loss if ISR is maintained.\"",
        },
      ],
    },
  ],
  summary:
    "Kafka is a distributed, partitioned, replicated commit log that achieves millions of messages per second through sequential writes, zero-copy transfers, and batching — and its core differentiators from traditional queues are durable message retention enabling replay, consumer groups enabling multiple independent consumers per topic, and partition-based ordering guarantees for related events.",
  keyTakeaways: [
    "Partitions are the unit of parallelism — more partitions = more consumers = more throughput. Partition by a key that groups related events.",
    "Consumer groups enable fan-out — each group gets all messages independently. Multiple services consume the same topic without interfering.",
    "Retention enables replay — unlike queues, Kafka keeps messages. Slow/crashed consumers catch up when they recover.",
    "Ordering is per-partition — guarantee order for related events by using the same partition key (order_id, user_id).",
    "Kafka vs RabbitMQ — Kafka for event streaming, replay, high throughput, multiple consumers. RabbitMQ for task queues with complex routing and lower throughput.",
  ],
  exercise: {
    prompt:
      "You're designing the real-time data pipeline for Zomato. Events generated per second at peak: order_placed (500/sec), order_status_update (2,000/sec — placed → confirmed → preparing → delivered), restaurant_viewed (50,000/sec), search_performed (30,000/sec), payment_processed (500/sec), driver_location (10,000/sec — every 5 seconds from 50,000 active drivers). Consumers that need these events: A. Notification Service needs order_placed and order_status_update; B. Analytics Dashboard needs ALL events; C. Fraud Detection needs payment_processed and order_placed; D. Search Personalization needs search_performed and restaurant_viewed; E. ETA Calculator needs driver_location and order_status_update; F. Revenue Reporting needs payment_processed. How many topics would you create? Name them and justify why you grouped events that way. For the \"order-events\" topic — how many partitions would you choose and what would be the partition key? Justify. Consumer F (Revenue Reporting) runs a daily batch job and was down for 48 hours — when it recovers, what happens, and what Kafka configuration ensures it can catch up? Search Personalization (Consumer D) needs to process events in real-time but is currently processing only 20,000 events/second when it receives 80,000/second combined — what are your two options to scale it up?",
  },
  relatedEntitySlugs: ["kafka"],
};
