import type { LLDLesson } from "../types";

/**
 * Drafted from general LLD/OOD interview-prep knowledge — see this
 * module's own source note in `01-what-is-lld.ts`. Second of the Design
 * Patterns group: structural patterns solve "how do I compose objects
 * into a larger structure without that structure depending on details it
 * shouldn't have to know about."
 */
export const STRUCTURAL_PATTERNS: LLDLesson = {
  slug: "structural-patterns",
  number: 7,
  category: "patterns",
  title: "Structural Design Patterns",
  tagline:
    "Where creational patterns control how objects get made, structural patterns control how they're wired together — without one side of the wiring depending on details that should stay hidden.",
  estimatedMinutes: 35,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "Structural patterns share one shape: a class that sits between two other things, changing how they relate to each other without either side needing to change. What differs is exactly what relationship each one is fixing.",
        },
        {
          kind: "table",
          headers: ["Pattern", "Fixes..."],
          rows: [
            ["Adapter", "An incompatible interface between two things that otherwise both work fine"],
            ["Decorator", "Needing to add behavior to an object without subclass explosion"],
            ["Facade", "A complex subsystem being awkward for most callers to use directly"],
            ["Proxy", "Needing to control or defer access to an object without changing its interface"],
            ["Composite", "Treating a single object and a group of them through the same interface"],
          ],
        },
      ],
    },
    {
      id: "adapter",
      heading: "Adapter",
      blocks: [
        {
          kind: "paragraph",
          text: "Converts one interface into another that calling code expects, without modifying either side. The textbook real-world analogy is a power plug adapter — neither the socket nor the appliance changes, something sits between them.",
        },
        {
          kind: "code",
          language: "java",
          code: '// Existing, working code your app doesn\'t control (a third-party library)\nclass LegacyPaymentGateway {\n    void makePayment(String amountInPaise) { /* expects paise as a string */ }\n}\n\n// Your app\'s own interface, already used everywhere else\ninterface PaymentProcessor {\n    boolean pay(double amountInRupees);\n}\n\n// Adapter bridges the mismatch — your code never needs to know the legacy shape exists\nclass LegacyGatewayAdapter implements PaymentProcessor {\n    private final LegacyPaymentGateway legacy = new LegacyPaymentGateway();\n\n    public boolean pay(double amountInRupees) {\n        String paise = String.valueOf((int) (amountInRupees * 100));\n        legacy.makePayment(paise);\n        return true;\n    }\n}',
        },
        {
          kind: "insight",
          text: "Adapter's defining trait: you didn't write, and can't change, at least one of the two sides. That's what separates it from just refactoring an interface — Adapter exists specifically for integrating with code you don't own.",
        },
      ],
    },
    {
      id: "decorator",
      heading: "Decorator",
      blocks: [
        {
          kind: "paragraph",
          text: "Adds behavior to an individual object at runtime by wrapping it, instead of creating a new subclass for every combination of behaviors.",
        },
        {
          kind: "code",
          language: "java",
          code: '// Without Decorator: a subclass per combination — explodes combinatorially\nclass Coffee {}\nclass CoffeeWithMilk extends Coffee {}\nclass CoffeeWithMilkAndSugar extends Coffee {}\nclass CoffeeWithMilkAndSugarAndCaramel extends Coffee {} // ...',
        },
        {
          kind: "code",
          language: "java",
          code: 'interface Beverage {\n    double cost();\n    String description();\n}\n\nclass Espresso implements Beverage {\n    public double cost() { return 150; }\n    public String description() { return "Espresso"; }\n}\n\nabstract class BeverageDecorator implements Beverage {\n    protected final Beverage wrapped;\n    BeverageDecorator(Beverage wrapped) { this.wrapped = wrapped; }\n}\n\nclass MilkDecorator extends BeverageDecorator {\n    MilkDecorator(Beverage wrapped) { super(wrapped); }\n    public double cost() { return wrapped.cost() + 20; }\n    public String description() { return wrapped.description() + " + Milk"; }\n}\n\nclass SugarDecorator extends BeverageDecorator {\n    SugarDecorator(Beverage wrapped) { super(wrapped); }\n    public double cost() { return wrapped.cost() + 5; }\n    public String description() { return wrapped.description() + " + Sugar"; }\n}\n\n// Any combination, composed at runtime — no new class needed per combination\nBeverage order = new SugarDecorator(new MilkDecorator(new Espresso()));\norder.cost(); // 150 + 20 + 5 = 175\norder.description(); // "Espresso + Milk + Sugar"',
        },
        {
          kind: "insight",
          text: "This is the pattern behind Java's own `BufferedReader(new FileReader(...))` — each layer wraps the one before it, adding one capability, implementing the same interface the thing it wraps implements.",
        },
      ],
    },
    {
      id: "facade",
      heading: "Facade",
      blocks: [
        {
          kind: "paragraph",
          text: "Provides a single, simplified interface in front of a complex subsystem with many moving parts, for callers who don't need — and shouldn't have to know about — that internal complexity.",
        },
        {
          kind: "code",
          language: "java",
          code: '// Without a facade: every caller needs to know all four steps, in order\ninventoryService.reserve(items);\npaymentService.charge(customer, amount);\nshippingService.schedulePickup(order);\nnotificationService.sendConfirmation(customer);\n\n// With a facade: one call, internal complexity hidden\nclass OrderFacade {\n    void placeOrder(Customer customer, List<Item> items, double amount) {\n        inventoryService.reserve(items);\n        paymentService.charge(customer, amount);\n        shippingService.schedulePickup(new Order(customer, items));\n        notificationService.sendConfirmation(customer);\n    }\n}\n\norderFacade.placeOrder(customer, items, amount); // one call',
        },
        {
          kind: "paragraph",
          text: "Facade doesn't remove any capability — the underlying services are still there, still individually callable for the (presumably rare) caller that genuinely needs finer control. It just gives the common case one clean entry point instead of forcing every caller to know the full sequence.",
        },
      ],
    },
    {
      id: "proxy",
      heading: "Proxy",
      blocks: [
        {
          kind: "paragraph",
          text: "Provides a stand-in for another object, implementing the same interface, to control access to it — lazy loading, access checks, caching, or logging, all without the real object or its callers needing to change.",
        },
        {
          kind: "code",
          language: "java",
          code: 'interface Image {\n    void display();\n}\n\nclass RealImage implements Image {\n    private final String filename;\n    RealImage(String filename) {\n        this.filename = filename;\n        loadFromDisk(); // expensive — happens immediately on construction\n    }\n    public void display() { /* render */ }\n    private void loadFromDisk() { /* slow I/O */ }\n}\n\n// Proxy defers the expensive load until display() is actually called\nclass ProxyImage implements Image {\n    private final String filename;\n    private RealImage real; // not created yet\n\n    ProxyImage(String filename) { this.filename = filename; }\n\n    public void display() {\n        if (real == null) {\n            real = new RealImage(filename); // loaded only on first real use\n        }\n        real.display();\n    }\n}',
        },
        {
          kind: "table",
          headers: ["", "Decorator", "Proxy"],
          rows: [
            ["Intent", "Add new behavior/responsibility", "Control access to the same behavior"],
            ["Typical use", "Stacking optional features (Coffee + Milk + Sugar)", "Lazy loading, access control, caching, logging"],
            ["Relationship to wrapped object", "Usually many decorators can stack", "Usually one proxy, standing directly in front of one real object"],
          ],
        },
      ],
    },
    {
      id: "composite",
      heading: "Composite",
      blocks: [
        {
          kind: "paragraph",
          text: "Lets a single object and a group of objects be treated through the same interface — useful for tree-shaped data where a leaf and a branch should respond to the same operations.",
        },
        {
          kind: "code",
          language: "java",
          code: 'interface FileSystemItem {\n    long size();\n}\n\nclass File implements FileSystemItem {\n    private final long sizeInBytes;\n    File(long sizeInBytes) { this.sizeInBytes = sizeInBytes; }\n    public long size() { return sizeInBytes; }\n}\n\nclass Folder implements FileSystemItem {\n    private final List<FileSystemItem> children = new ArrayList<>();\n    void add(FileSystemItem item) { children.add(item); }\n\n    public long size() {\n        long total = 0;\n        for (FileSystemItem child : children) {\n            total += child.size(); // works whether child is a File or another Folder\n        }\n        return total;\n    }\n}\n\n// Caller doesn\'t care whether it\'s holding a File or a Folder full of Folders\nFileSystemItem root = buildFileTree();\nroot.size(); // recurses through the whole tree transparently',
        },
        {
          kind: "insight",
          text: "The recursion in `Folder.size()` is the payoff — it doesn't need to know whether each child is a leaf (File) or another branch (Folder); both answer `.size()` the same way. This is the standard shape for any real tree structure: a UI's component tree, an org chart, a file system.",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        {
          kind: "qa",
          question: "\"What's the difference between Adapter and Facade? Both simplify how you interact with something.\"",
          answer:
            "\"Adapter converts one specific interface into another so it fits code that already expects that shape — it's about compatibility with code you don't control. Facade simplifies a complex subsystem you usually DO control, by giving it one clean entry point. Adapter fixes a mismatch; Facade fixes complexity.\"",
        },
        {
          kind: "qa",
          question: "\"Could you use Decorator instead of Proxy for lazy loading?\"",
          answer:
            "\"Structurally, they look almost identical — both wrap an object behind the same interface. The distinction is intent: Decorator is meant to add or stack genuinely new behavior, and it's normal to have several decorators layered. Lazy loading isn't adding behavior, it's controlling access to existing behavior — that's Proxy's job, and using the name that matches intent is what an interviewer is actually listening for.\"",
        },
      ],
    },
  ],
  summary:
    "Structural patterns all change how objects relate to each other without changing the objects themselves. Adapter bridges an interface mismatch with code you don't control. Decorator stacks new behavior onto an object at runtime instead of exploding subclasses. Facade gives a complex subsystem one simple entry point without removing its finer-grained access. Proxy stands in for an object to control access to it — lazy loading, caching, permissions — without changing its interface. Composite lets a single item and a group of them respond to the same interface, the standard shape for any tree-structured data.",
  keyTakeaways: [
    "Adapter fixes an interface mismatch with code you don't own — its defining trait is that you can't change at least one side.",
    "Decorator stacks behavior onto an object at runtime, avoiding a combinatorial explosion of subclasses for every feature combination.",
    "Facade gives a complex subsystem one simple entry point for the common case, without removing finer-grained access for callers that need it.",
    "Proxy and Decorator look structurally identical (both wrap the same interface) — the difference is intent: Proxy controls access, Decorator adds behavior.",
    "Composite lets a leaf and a branch of a tree respond to the same interface — the standard pattern for any recursive, tree-shaped data.",
  ],
  exercise: {
    prompt:
      "Your app's `Logger` interface has one method, `log(String message)`. A new requirement: log messages should be written to disk, but only after checking whether the current user has 'debug' permissions enabled — if not, log() should silently do nothing. You must not modify the existing `FileLogger` class (it's used elsewhere and is well-tested). Which structural pattern fits, and sketch the class shape.",
    guidance: [
      { kind: "paragraph", text: "**Pattern** — Proxy." },
      {
        kind: "code",
        language: "java",
        code: "class PermissionCheckedLogger implements Logger {\n  private final Logger real;\n  private final PermissionService permissions;\n\n  public void log(String message) {\n    if (permissions.hasDebugAccess()) {\n      real.log(message);\n    }\n  }\n}",
      },
      {
        kind: "list",
        items: [
          "**Why it fits** — it implements the same `Logger` interface, wraps the existing `FileLogger` unmodified, and controls access to it based on a condition.",
          "**Why Proxy, not Decorator** — the intent here is controlling access (a permission check), not adding a new capability to what logging does.",
        ],
      },
    ],
  },
};
