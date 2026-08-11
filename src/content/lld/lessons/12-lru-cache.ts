import type { LLDLesson } from "../types";

/**
 * Drafted from general LLD/OOD interview-prep knowledge — see this
 * module's own source note in `01-what-is-lld.ts`. Fourth case study —
 * the one Lesson 1 used as its running DSA-vs-LLD example ("the algorithm
 * is DSA, the class design around it is LLD"); this lesson is that
 * distinction paid off in full. Cross-links this project's own Cache
 * entity, which simulates the eviction-policy choice this lesson designs.
 */
export const LRU_CACHE: LLDLesson = {
  slug: "lru-cache",
  number: 12,
  category: "case-study",
  title: "Case Study: LRU Cache",
  tagline:
    "The algorithm — hashmap plus doubly linked list for O(1) get and put — is DSA. The class design around it, and how cleanly it extends to a different eviction policy, is the actual LLD question.",
  estimatedMinutes: 35,
  sections: [
    {
      id: "requirements",
      heading: "Step 1 — Requirements",
      blocks: [
        {
          kind: "paragraph",
          text: "A fixed-capacity cache supporting `get(key)` and `put(key, value)`, both in O(1) time. When the cache is full and a new key needs to be inserted, evict the least-recently-used entry — the one that hasn't been read or written the longest.",
        },
        {
          kind: "paragraph",
          text: "\"Recently used\" means either a `get` or a `put` on that key — both count as a use, not just writes.",
        },
      ],
    },
    {
      id: "why-this-data-structure",
      heading: "Step 3 — Why hashmap + doubly linked list, and not one alone",
      blocks: [
        {
          kind: "paragraph",
          text: "A hashmap alone gives O(1) `get`/`put` by key, but has no notion of recency order — finding the least-recently-used entry would mean scanning every entry, O(n).",
        },
        {
          kind: "paragraph",
          text: "A linked list alone gives O(1) recency tracking (move a node to the front on every use, evict from the back) — but finding a node by key to move it means scanning the list, O(n).",
        },
        {
          kind: "insight",
          text: "Combining them fixes both: the hashmap maps key → the linked list node directly (no scan needed to find it), and the linked list maintains recency order (no scan needed to find the eviction candidate). Each structure covers the other's weakness — this is the actual DSA insight; everything from here is the LLD question of how to wrap it in a clean, extensible class.",
        },
      ],
    },
    {
      id: "classes",
      heading: "Steps 4-5 — Classes",
      blocks: [
        {
          kind: "uml",
          relationships: [
            { from: "LRUCache", to: "Node (doubly linked list)", kind: "composition", fromMultiplicity: "1", toMultiplicity: "0..capacity", label: "has" },
            { from: "LRUCache", to: "Map<Key, Node>", kind: "association", fromMultiplicity: "1", toMultiplicity: "1", label: "uses" },
          ],
        },
        {
          kind: "code",
          language: "java",
          code: 'class Node<K, V> {\n    K key;\n    V value;\n    Node<K, V> prev, next;\n    Node(K key, V value) { this.key = key; this.value = value; }\n}',
        },
      ],
    },
    {
      id: "implementation",
      heading: "Steps 6-7 — Full implementation",
      blocks: [
        {
          kind: "paragraph",
          text: "Two sentinel nodes (`head`/`tail`) simplify every insert/remove — no null-checking a genuinely empty list, since head and tail always exist and always point at each other when the cache is empty.",
        },
        {
          kind: "code",
          language: "java",
          code: 'class LRUCache<K, V> {\n    private final int capacity;\n    private final Map<K, Node<K, V>> map = new HashMap<>();\n    private final Node<K, V> head = new Node<>(null, null); // most-recently-used side\n    private final Node<K, V> tail = new Node<>(null, null); // least-recently-used side\n\n    LRUCache(int capacity) {\n        this.capacity = capacity;\n        head.next = tail;\n        tail.prev = head;\n    }\n\n    V get(K key) {\n        Node<K, V> node = map.get(key);\n        if (node == null) return null;\n        moveToFront(node);\n        return node.value;\n    }\n\n    void put(K key, V value) {\n        Node<K, V> existing = map.get(key);\n        if (existing != null) {\n            existing.value = value;\n            moveToFront(existing);\n            return;\n        }\n        if (map.size() == capacity) {\n            Node<K, V> lru = tail.prev;\n            remove(lru);\n            map.remove(lru.key);\n        }\n        Node<K, V> node = new Node<>(key, value);\n        map.put(key, node);\n        insertAfterHead(node);\n    }\n\n    private void moveToFront(Node<K, V> node) {\n        remove(node);\n        insertAfterHead(node);\n    }\n    private void remove(Node<K, V> node) {\n        node.prev.next = node.next;\n        node.next.prev = node.prev;\n    }\n    private void insertAfterHead(Node<K, V> node) {\n        node.next = head.next;\n        node.prev = head;\n        head.next.prev = node;\n        head.next = node;\n    }\n}',
        },
        {
          kind: "insight",
          text: "Every operation here — `map.get`, `remove`, `insertAfterHead` — is genuinely O(1). No traversal exists anywhere in this class. Confirming that out loud, operation by operation, is exactly what an interviewer wants to hear when they ask 'is this actually O(1)?'",
        },
      ],
    },
    {
      id: "extensibility",
      heading: "Extensibility — the actual LLD question this problem hides",
      blocks: [
        {
          kind: "paragraph",
          text: "The interview follow-up that separates a DSA answer from an LLD answer: \"now make the eviction policy swappable — LRU today, LFU tomorrow.\" A design that hardwired `tail.prev` eviction logic throughout the class fails this cleanly; a design that isolated eviction behind an interface doesn't.",
        },
        {
          kind: "code",
          language: "java",
          code: 'interface EvictionPolicy<K> {\n    void onAccess(K key);      // called on every get/put touching an existing key\n    void onInsert(K key);      // called when a new key is added\n    K evictionCandidate();     // which key should be evicted next\n}\n\nclass Cache<K, V> {\n    private final int capacity;\n    private final Map<K, V> store = new HashMap<>();\n    private final EvictionPolicy<K> evictionPolicy; // swappable — LRU, LFU, FIFO, whatever fits\n\n    Cache(int capacity, EvictionPolicy<K> evictionPolicy) {\n        this.capacity = capacity;\n        this.evictionPolicy = evictionPolicy;\n    }\n\n    V get(K key) {\n        if (!store.containsKey(key)) return null;\n        evictionPolicy.onAccess(key);\n        return store.get(key);\n    }\n\n    void put(K key, V value) {\n        if (!store.containsKey(key) && store.size() == capacity) {\n            K evicted = evictionPolicy.evictionCandidate();\n            store.remove(evicted);\n        }\n        store.put(key, value);\n        evictionPolicy.onInsert(key);\n    }\n}',
        },
        {
          kind: "insight",
          text: "This is this lesson's own case: `Cache` no longer knows anything about linked lists, frequency counts, or insertion order — that's entirely the `EvictionPolicy` implementation's problem. An `LRUEvictionPolicy` wraps the doubly-linked-list logic above; an `LFUEvictionPolicy` would track access counts instead. This project's own Cache entity ships exactly this comparison as a real, simulated config choice — LRU, LFU, FIFO, and MRU, selectable and comparable side by side — see `docs/Entities.md`'s Cache section for the HLD framing of the identical idea this lesson builds at the code level.",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        {
          kind: "qa",
          question: "\"How would you make this thread-safe?\"",
          answer:
            "\"The simplest correct approach is a single lock (e.g. `synchronized` on `get`/`put`, or a `ReentrantLock` wrapping the same critical sections) — both the map mutation and the linked-list pointer updates need to be atomic together, since a `get` that reads the map but races with a `put`'s list update could observe an inconsistent state. A more advanced answer would mention that fine-grained locking here is genuinely hard, because moving a node touches its neighbors' pointers too — I'd rather give an honestly simple, correct answer than an unproven fine-grained one.\"",
        },
        {
          kind: "qa",
          question: "\"Why not just use LinkedHashMap, which already has LRU built in?\"",
          answer:
            "\"In production Java code, I would — `LinkedHashMap` with `accessOrder=true` and an overridden `removeEldestEntry` gives you this for free. But an LLD interview is specifically testing whether I understand the mechanism underneath a library call, so I'd build it from the hashmap-plus-doubly-linked-list primitives unless told the library solution is acceptable.\"",
        },
      ],
    },
  ],
  summary:
    "LRU Cache's DSA half is the hashmap-plus-doubly-linked-list combination — each structure's O(1) strength covers the other's O(n) weakness (the map finds a node without scanning, the list finds the eviction candidate without scanning). Its LLD half, the part an interviewer is actually probing with the eviction-policy follow-up, is whether that mechanism stays hidden behind an `EvictionPolicy` interface Cache doesn't know the internals of — the same Strategy shape this project's own Cache entity ships as a real, comparable LRU/LFU/FIFO/MRU config choice.",
  keyTakeaways: [
    "Hashmap + doubly linked list combine because each covers the other's O(n) weakness — the map avoids scanning to find a node, the list avoids scanning to find the LRU candidate.",
    "Two sentinel head/tail nodes eliminate null-checking an empty list — insert/remove logic stays uniform whether the cache is empty, full, or in between.",
    "Confirm O(1) operation by operation out loud in an interview — every method here (`get`, `put`, `moveToFront`, `remove`, `insertAfterHead`) does genuinely constant work, no hidden traversal.",
    "The real LLD test on this problem is the eviction-policy follow-up — isolating eviction behind an `EvictionPolicy` interface makes LRU→LFU a new class, not a rewrite.",
    "This project's own Cache entity simulates exactly this eviction-policy comparison (LRU/LFU/FIFO/MRU) as a real, observable config choice — the HLD counterpart to this lesson's LLD design.",
  ],
  exercise: {
    prompt:
      "Sketch (interface + key method signatures, not full implementation) an `LFUEvictionPolicy` that satisfies the `EvictionPolicy<K>` interface from this lesson — evicting the least-frequently-used key, with ties broken by least-recently-used among equally-frequent keys.",
    guidance: [
      {
        kind: "code",
        language: "java",
        code: "class LFUEvictionPolicy<K> implements EvictionPolicy<K> {\n  Map<K, Integer> frequency;\n  Map<Integer, LinkedHashSet<K>> freqToKeys;\n  int minFreq;\n  ...\n}",
      },
      {
        kind: "list",
        items: [
          "**`frequency`** — tracks each key's access count.",
          "**`freqToKeys`** — groups keys by frequency, using a `LinkedHashSet` per frequency bucket specifically because insertion order within a `LinkedHashSet` gives the tie-break (least-recently-used among equally-frequent keys) for free, iterating from the front.",
          "**`onAccess` / `onInsert`** — increment a key's frequency and move it to the next bucket.",
          "**`evictionCandidate()`** — looks at `freqToKeys.get(minFreq)`'s first (oldest) entry.",
          "**`minFreq`** — needs updating on every insert (starts at 1) and potentially on every access if the old bucket empties out.",
        ],
      },
    ],
  },
  relatedEntitySlugs: ["cache"],
};
