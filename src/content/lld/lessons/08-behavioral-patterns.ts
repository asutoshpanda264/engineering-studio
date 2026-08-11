import type { LLDLesson } from "../types";

/**
 * Drafted from general LLD/OOD interview-prep knowledge — see this
 * module's own source note in `01-what-is-lld.ts`. Closes the Design
 * Patterns group: behavioral patterns govern how objects communicate and
 * who's responsible for a decision — the group every remaining case study
 * (Lessons 9-15) leans on most heavily.
 */
export const BEHAVIORAL_PATTERNS: LLDLesson = {
  slug: "behavioral-patterns",
  number: 8,
  category: "patterns",
  title: "Behavioral Design Patterns",
  tagline:
    "Where structural patterns wire objects together, behavioral patterns decide who's responsible for making a decision, reacting to a change, or handling a request.",
  estimatedMinutes: 40,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "Six patterns here, more than either prior lesson, because behavioral problems are the most varied — collaboration between objects shows up in more shapes than creation or structure do. Every case study from Lesson 9 onward reaches for at least one of these.",
        },
        {
          kind: "table",
          headers: ["Pattern", "Answers..."],
          rows: [
            ["Strategy", "Which algorithm/behavior should run, chosen independently of the object using it?"],
            ["Observer", "Who needs to know when this object's state changes?"],
            ["State", "How does an object's behavior change as it moves through a lifecycle?"],
            ["Command", "How do I represent 'a request to do something' as an object I can queue, log, or undo?"],
            ["Chain of Responsibility", "Which of several possible handlers should process this, without the sender knowing which one?"],
            ["Template Method", "How do I fix an algorithm's overall steps while letting subclasses customize individual ones?"],
          ],
        },
      ],
    },
    {
      id: "strategy",
      heading: "Strategy",
      blocks: [
        {
          kind: "paragraph",
          text: "Defines a family of interchangeable algorithms behind one interface, selected at runtime. This is the formal name for the exact fix Lessons 2 and 3 already walked through twice — the payment-processor and discount-calculator examples were both Strategy, just not named yet.",
        },
        {
          kind: "code",
          language: "java",
          code: 'interface RouteStrategy {\n    int selectTarget(List<Server> servers, int currentIndex);\n}\n\nclass RoundRobinStrategy implements RouteStrategy {\n    public int selectTarget(List<Server> servers, int currentIndex) {\n        return (currentIndex + 1) % servers.size();\n    }\n}\n\nclass LeastConnectionsStrategy implements RouteStrategy {\n    public int selectTarget(List<Server> servers, int currentIndex) {\n        int best = 0;\n        for (int i = 1; i < servers.size(); i++) {\n            if (servers.get(i).activeConnections() < servers.get(best).activeConnections()) best = i;\n        }\n        return best;\n    }\n}\n\nclass LoadBalancer {\n    private RouteStrategy strategy; // swappable at runtime\n    LoadBalancer(RouteStrategy strategy) { this.strategy = strategy; }\n    void setStrategy(RouteStrategy strategy) { this.strategy = strategy; } // swap live\n}',
        },
        {
          kind: "insight",
          text: "This is, quite literally, how this project's own Load Balancer entity works — five algorithms (Round Robin, Least Connections, Weighted Round Robin, IP Hash, Least Response Time) behind one interface, swappable per node, compared side by side. See `docs/Entities.md`'s Load Balancer section for the HLD framing of the exact same idea this pattern names at the code level.",
        },
      ],
    },
    {
      id: "observer",
      heading: "Observer",
      blocks: [
        {
          kind: "paragraph",
          text: "Defines a one-to-many dependency: when one object's state changes, every registered dependent is notified automatically, without the subject needing to know anything about who or what they are.",
        },
        {
          kind: "code",
          language: "java",
          code: 'interface OrderObserver {\n    void onStatusChanged(Order order, String newStatus);\n}\n\nclass SmsNotifier implements OrderObserver {\n    public void onStatusChanged(Order order, String newStatus) { /* send SMS */ }\n}\nclass InventorySync implements OrderObserver {\n    public void onStatusChanged(Order order, String newStatus) { /* update stock */ }\n}\n\nclass Order {\n    private final List<OrderObserver> observers = new ArrayList<>();\n    private String status;\n\n    void subscribe(OrderObserver observer) { observers.add(observer); }\n\n    void setStatus(String newStatus) {\n        this.status = newStatus;\n        for (OrderObserver o : observers) {\n            o.onStatusChanged(this, newStatus); // Order doesn\'t know or care what these do\n        }\n    }\n}',
        },
        {
          kind: "paragraph",
          text: "Adding a new reaction to an order status change (e.g. a loyalty-points update) means writing one new `OrderObserver` implementation and subscribing it — `Order` itself never changes. That's Open/Closed (Lesson 3) again, applied to reacting-to-change instead of creating-objects.",
        },
      ],
    },
    {
      id: "state",
      heading: "State",
      blocks: [
        {
          kind: "paragraph",
          text: "Lets an object change its behavior when its internal state changes, by delegating to a State object instead of a large if/else or switch on a status field scattered across every method.",
        },
        {
          kind: "code",
          language: "java",
          code: '// Without State: every method repeats the same status check\nclass Order {\n    String status; // "PLACED", "SHIPPED", "DELIVERED"\n    void cancel() {\n        if (status.equals("PLACED")) { status = "CANCELLED"; }\n        else if (status.equals("SHIPPED")) { throw new IllegalStateException("Can\'t cancel a shipped order"); }\n        // ...repeated in every other method too\n    }\n}',
        },
        {
          kind: "code",
          language: "java",
          code: 'interface OrderState {\n    void cancel(Order order);\n    void ship(Order order);\n}\n\nclass PlacedState implements OrderState {\n    public void cancel(Order order) { order.setState(new CancelledState()); }\n    public void ship(Order order) { order.setState(new ShippedState()); }\n}\nclass ShippedState implements OrderState {\n    public void cancel(Order order) { throw new IllegalStateException("Can\'t cancel a shipped order"); }\n    public void ship(Order order) { throw new IllegalStateException("Already shipped"); }\n}\n\nclass Order {\n    private OrderState state = new PlacedState();\n    void setState(OrderState state) { this.state = state; }\n    void cancel() { state.cancel(this); } // delegates — no if/else here at all\n    void ship() { state.ship(this); }\n}',
        },
        {
          kind: "table",
          headers: ["", "Strategy", "State"],
          rows: [
            ["Structurally", "Identical — an interface, several implementations, swapped at runtime", "Identical to Strategy"],
            ["Intent", "Caller chooses which algorithm to use", "The object itself transitions between states as a side effect of its own behavior"],
            ["Who swaps it", "External code (`setStrategy(...)`)", "The state objects themselves (`order.setState(new ShippedState())`)"],
          ],
        },
        {
          kind: "insight",
          text: "Strategy and State are the clearest pair of same-code-shape, different-intent patterns in this whole lesson. Interviewers ask the difference specifically because getting it right proves you're reasoning about intent, not pattern-matching syntax.",
        },
      ],
    },
    {
      id: "command",
      heading: "Command",
      blocks: [
        {
          kind: "paragraph",
          text: "Encapsulates a request as an object, so it can be queued, logged, passed around, or undone — instead of being an immediate, untracked method call.",
        },
        {
          kind: "code",
          language: "java",
          code: 'interface Command {\n    void execute();\n    void undo();\n}\n\nclass AddItemCommand implements Command {\n    private final Cart cart;\n    private final Item item;\n    AddItemCommand(Cart cart, Item item) { this.cart = cart; this.item = item; }\n    public void execute() { cart.add(item); }\n    public void undo() { cart.remove(item); }\n}\n\nclass CommandHistory {\n    private final Deque<Command> history = new ArrayDeque<>();\n    void run(Command command) {\n        command.execute();\n        history.push(command); // remembered for undo\n    }\n    void undoLast() {\n        if (!history.isEmpty()) history.pop().undo();\n    }\n}',
        },
        {
          kind: "insight",
          text: "The interview tell for Command: the requirement mentions undo, redo, a queue of pending actions, or an audit log of what was requested — none of which are possible if a request is just a direct method call that already happened.",
        },
      ],
    },
    {
      id: "chain-of-responsibility",
      heading: "Chain of Responsibility",
      blocks: [
        {
          kind: "paragraph",
          text: "Passes a request along a chain of potential handlers until one handles it, without the sender knowing which handler that will be, or how many there are.",
        },
        {
          kind: "code",
          language: "java",
          code: 'abstract class SupportHandler {\n    protected SupportHandler next;\n    SupportHandler setNext(SupportHandler next) { this.next = next; return next; }\n\n    void handle(Ticket ticket) {\n        if (canHandle(ticket)) { resolve(ticket); }\n        else if (next != null) { next.handle(ticket); }\n        else { throw new IllegalStateException("No handler for this ticket"); }\n    }\n    abstract boolean canHandle(Ticket ticket);\n    abstract void resolve(Ticket ticket);\n}\n\nclass Level1Support extends SupportHandler {\n    boolean canHandle(Ticket t) { return t.severity() <= 2; }\n    void resolve(Ticket t) { /* ... */ }\n}\nclass Level2Support extends SupportHandler {\n    boolean canHandle(Ticket t) { return t.severity() <= 4; }\n    void resolve(Ticket t) { /* ... */ }\n}\n\n// Chain assembled once; sender just calls handle() on the first link\nSupportHandler chain = new Level1Support();\nchain.setNext(new Level2Support()).setNext(new ManagerEscalation());\nchain.handle(incomingTicket);',
        },
        {
          kind: "insight",
          text: "This project's own Reverse Proxy entity is a real-world (well, real-simulation) instance of a related idea: a request carries a route, and it's matched against a chain of configured targets, falling through to a catch-all if nothing else claims it — see `docs/Entities.md`'s Reverse Proxy section.",
        },
      ],
    },
    {
      id: "template-method",
      heading: "Template Method",
      blocks: [
        {
          kind: "paragraph",
          text: "Defines the skeleton of an algorithm in a base class, with individual steps deferred to subclasses — the algorithm's overall shape is fixed, only specific steps vary.",
        },
        {
          kind: "code",
          language: "java",
          code: 'abstract class DataImporter {\n    // The template — final so subclasses can\'t reorder or skip steps\n    final void importData(String source) {\n        String raw = readSource(source);\n        List<Row> parsed = parse(raw);\n        validate(parsed);\n        save(parsed);\n    }\n\n    abstract String readSource(String source);\n    abstract List<Row> parse(String raw);\n\n    void validate(List<Row> rows) { /* default: no-op, subclasses may override */ }\n    abstract void save(List<Row> rows);\n}\n\nclass CsvImporter extends DataImporter {\n    String readSource(String source) { /* read file */ return "..."; }\n    List<Row> parse(String raw) { /* split on commas */ return List.of(); }\n    void save(List<Row> rows) { /* insert into DB */ }\n}\nclass JsonImporter extends DataImporter {\n    String readSource(String source) { /* read file */ return "..."; }\n    List<Row> parse(String raw) { /* parse JSON */ return List.of(); }\n    void save(List<Row> rows) { /* insert into DB */ }\n}',
        },
        {
          kind: "insight",
          text: "The difference from Strategy: Template Method uses inheritance (subclasses override specific steps of one fixed algorithm shape), while Strategy uses composition (a whole algorithm is swapped in as one interchangeable object). If only *part* of the algorithm varies, Template Method; if the *whole* algorithm varies, Strategy.",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        {
          kind: "qa",
          question: "\"How do you tell Strategy and State apart when a candidate's code looks identical for both?\"",
          answer:
            "\"I ask who decides when to switch implementations. If it's external code choosing an algorithm for its own reasons ('use least-connections routing today'), that's Strategy. If the object switches itself as a natural consequence of its own lifecycle ('an order that just shipped can no longer be cancelled'), that's State — the transition is part of the domain logic, not an external configuration choice.\"",
        },
        {
          kind: "qa",
          question: "\"When would Chain of Responsibility be the wrong choice, even though it fits structurally?\"",
          answer:
            "\"When exactly one handler should always process a request and which one is knowable upfront — that's just a Factory Method decision, not a chain. Chain of Responsibility earns its place when the number or order of handlers can vary, or when you genuinely want the first-capable-handler-wins behavior rather than a single deterministic lookup.\"",
        },
      ],
    },
  ],
  summary:
    "Behavioral patterns govern collaboration between objects. Strategy swaps a whole interchangeable algorithm in from outside. State lets an object's own behavior change as it moves through a lifecycle, structurally identical to Strategy but with the object itself driving the transitions. Observer lets many dependents react to one object's change without that object needing to know who they are. Command turns a request into an object, enabling undo/queueing/logging. Chain of Responsibility passes a request along handlers until one claims it. Template Method fixes an algorithm's overall shape in a base class while letting subclasses customize individual steps. Every remaining case study in this track leans on at least one of these six.",
  keyTakeaways: [
    "Strategy and State share identical code structure (an interface, swappable implementations) — the difference is who decides to swap: external code (Strategy) or the object's own lifecycle (State).",
    "Observer lets a subject notify many dependents of a change without knowing what they are — adding a new reaction means one new class, zero changes to the subject.",
    "Command turns 'do this now' into an object you can queue, log, or undo — the interview tell is any requirement mentioning undo/redo or an audit trail.",
    "Chain of Responsibility passes a request along handlers until one claims it, without the sender knowing which handler that will be or how many exist.",
    "Template Method fixes an algorithm's overall shape via inheritance, varying only specific steps — use it when part of an algorithm varies; use Strategy when the whole algorithm varies.",
  ],
  exercise: {
    prompt:
      "A ride-hailing app's `Ride` object needs to: reject a `cancel()` call once the driver has already started the trip, but allow it freely before that; and separately, notify a `DriverEarningsService` and a `RiderNotificationService` whenever the ride's status changes, without `Ride` needing direct references baked in for either. Name the pattern for each requirement.",
    guidance: [
      {
        kind: "list",
        ordered: true,
        items: [
          "**Cancel allowed/rejected depending on lifecycle stage → State.** Ride delegates `cancel()` to a current `RideState` object (Requested, InProgress, Completed), and InProgress's `cancel()` throws while Requested's actually transitions state.",
          "**Notify multiple interested services on a status change, without Ride hardcoding references to them → Observer.** `DriverEarningsService` and `RiderNotificationService` both implement a `RideObserver` interface and subscribe; `Ride` calls a generic notify loop on status change, unaware of what either subscriber actually does.",
        ],
      },
    ],
  },
};
