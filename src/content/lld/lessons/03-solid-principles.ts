import type { LLDLesson } from "../types";

/**
 * Drafted from general LLD/OOD interview-prep knowledge — see this
 * module's own source note in `01-what-is-lld.ts`. Each principle gets a
 * bad example first, then the fix — matching this project's own house
 * style of showing consequence before naming the rule (`docs/philosophy.md`
 * — "Instead of saying 'Use a Cache,' it asks 'What happens if you
 * don't?'"), applied to code instead of a running simulation.
 */
export const SOLID_PRINCIPLES: LLDLesson = {
  slug: "solid-principles",
  number: 3,
  category: "fundamentals",
  title: "SOLID Principles",
  tagline:
    "Five rules, one shared goal: a change to one requirement should touch as little existing code as possible.",
  estimatedMinutes: 35,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "SOLID isn't five unrelated rules to memorize. It's five different angles on the same worry: requirements change, and a good design contains the blast radius of that change to as few classes as possible.",
        },
        {
          kind: "paragraph",
          text: "Every one of the five examples below follows the same shape — a design that technically works today, and a specific new requirement that reveals why it was fragile.",
        },
      ],
    },
    {
      id: "srp",
      heading: "S — Single Responsibility Principle",
      blocks: [
        {
          kind: "paragraph",
          text: "A class should have exactly one reason to change. Not \"one method\" — one *responsibility*, which can span several methods, but all in service of the same job.",
        },
        {
          kind: "code",
          language: "java",
          code: '// Violates SRP: this class has THREE reasons to change —\n// business rules, storage format, and notification channel\nclass Order {\n    void calculateTotal() { /* pricing logic */ }\n    void saveToDatabase() { /* SQL, connection handling */ }\n    void sendConfirmationEmail() { /* SMTP, email templating */ }\n}',
        },
        {
          kind: "code",
          language: "java",
          code: '// Each responsibility gets its own class\nclass Order {\n    void calculateTotal() { /* pricing logic only */ }\n}\nclass OrderRepository {\n    void save(Order order) { /* persistence only */ }\n}\nclass OrderNotifier {\n    void sendConfirmation(Order order) { /* notification only */ }\n}',
        },
        {
          kind: "insight",
          text: "The test in an interview: can you describe the class's job in one sentence without using the word \"and\"? \"Handles order pricing and saves it to the database and emails the customer\" is three responsibilities wearing one class.",
        },
      ],
    },
    {
      id: "ocp",
      heading: "O — Open/Closed Principle",
      blocks: [
        {
          kind: "paragraph",
          text: "A class should be open for extension, closed for modification — you should be able to add new behavior without editing code that already works and is already tested.",
        },
        {
          kind: "code",
          language: "java",
          code: '// Violates OCP: every new discount type means editing this method\nclass DiscountCalculator {\n    double calculate(String customerType, double amount) {\n        if (customerType.equals("REGULAR")) return amount * 0.95;\n        if (customerType.equals("PREMIUM")) return amount * 0.85;\n        // adding "VIP" means opening this file and editing tested code\n        return amount;\n    }\n}',
        },
        {
          kind: "code",
          language: "java",
          code: 'interface DiscountStrategy {\n    double apply(double amount);\n}\nclass RegularDiscount implements DiscountStrategy {\n    public double apply(double amount) { return amount * 0.95; }\n}\nclass PremiumDiscount implements DiscountStrategy {\n    public double apply(double amount) { return amount * 0.85; }\n}\n// Adding VIP later: one new class, zero changes to existing ones\nclass VipDiscount implements DiscountStrategy {\n    public double apply(double amount) { return amount * 0.75; }\n}',
        },
        {
          kind: "paragraph",
          text: "This is the exact shape Lesson 2's polymorphism example already showed, and it's the same shape Strategy (Lesson 6) formalizes as a pattern — OCP is the principle, Strategy is one common way to satisfy it.",
        },
      ],
    },
    {
      id: "lsp",
      heading: "L — Liskov Substitution Principle",
      blocks: [
        {
          kind: "paragraph",
          text: "Anywhere a superclass is expected, a subclass must be usable without the caller noticing a difference in correctness. If substituting a subclass in breaks something that worked with the superclass, the subclass isn't really honoring the \"is-a\" relationship.",
        },
        {
          kind: "paragraph",
          text: "This is precisely the Square/Rectangle problem from Lesson 2 — worth reading again here as the formal name for that mistake, not a new example.",
        },
        {
          kind: "code",
          language: "java",
          code: '// Violates LSP: Ostrich can\'t honor Bird\'s fly() contract\nclass Bird {\n    void fly() { /* ... */ }\n}\nclass Ostrich extends Bird {\n    @Override\n    void fly() { throw new UnsupportedOperationException("Ostriches can\'t fly"); }\n}\n\n// Any code written against Bird that calls fly() now has a landmine in it\nvoid letBirdsFly(List<Bird> birds) {\n    for (Bird b : birds) b.fly(); // crashes if an Ostrich sneaks in\n}',
        },
        {
          kind: "code",
          language: "java",
          code: '// Fix: fly() only belongs on birds that actually can\ninterface Bird { void eat(); }\ninterface FlyingBird extends Bird { void fly(); }\n\nclass Sparrow implements FlyingBird {\n    public void eat() { /* ... */ }\n    public void fly() { /* ... */ }\n}\nclass Ostrich implements Bird {\n    public void eat() { /* ... */ } // no fly() to violate at all\n}',
        },
        {
          kind: "insight",
          text: "The tell: a subclass that overrides a method to throw an exception, return a dummy/no-op value, or silently do nothing is very likely an LSP violation — it's substitutable in the type system but not in behavior.",
        },
      ],
    },
    {
      id: "isp",
      heading: "I — Interface Segregation Principle",
      blocks: [
        {
          kind: "paragraph",
          text: "No class should be forced to implement methods it doesn't use. A large, all-purpose interface quietly forces every implementer to either support everything or fake support for the parts it doesn't need — the same LSP-style landmine, caused by the interface being too broad rather than the class hierarchy being wrong.",
        },
        {
          kind: "code",
          language: "java",
          code: '// Violates ISP: a basic printer is forced to implement scan() and fax()\ninterface Machine {\n    void print(Document d);\n    void scan(Document d);\n    void fax(Document d);\n}\nclass BasicPrinter implements Machine {\n    public void print(Document d) { /* real work */ }\n    public void scan(Document d) { throw new UnsupportedOperationException(); }\n    public void fax(Document d) { throw new UnsupportedOperationException(); }\n}',
        },
        {
          kind: "code",
          language: "java",
          code: '// Split into focused interfaces — implement only what you actually do\ninterface Printer { void print(Document d); }\ninterface Scanner { void scan(Document d); }\ninterface Fax { void fax(Document d); }\n\nclass BasicPrinter implements Printer {\n    public void print(Document d) { /* real work */ }\n}\nclass AllInOnePrinter implements Printer, Scanner, Fax {\n    public void print(Document d) { /* ... */ }\n    public void scan(Document d) { /* ... */ }\n    public void fax(Document d) { /* ... */ }\n}',
        },
      ],
    },
    {
      id: "dip",
      heading: "D — Dependency Inversion Principle",
      blocks: [
        {
          kind: "paragraph",
          text: "High-level modules (business logic) shouldn't depend on low-level modules (specific implementations) — both should depend on abstractions. This is easy to say and easy to violate without noticing, because \"it compiles fine either way.\"",
        },
        {
          kind: "code",
          language: "java",
          code: '// Violates DIP: OrderService is welded to one concrete database\nclass MySqlOrderRepository {\n    void save(Order order) { /* MySQL-specific code */ }\n}\nclass OrderService {\n    private final MySqlOrderRepository repository = new MySqlOrderRepository();\n    void placeOrder(Order order) { repository.save(order); }\n}\n// Switching databases, or writing a test with a fake repository,\n// means editing OrderService itself',
        },
        {
          kind: "code",
          language: "java",
          code: '// Both sides depend on an abstraction instead\ninterface OrderRepository {\n    void save(Order order);\n}\nclass MySqlOrderRepository implements OrderRepository {\n    public void save(Order order) { /* MySQL-specific code */ }\n}\nclass OrderService {\n    private final OrderRepository repository; // depends on the interface\n    OrderService(OrderRepository repository) { this.repository = repository; } // injected\n    void placeOrder(Order order) { repository.save(order); }\n}',
        },
        {
          kind: "insight",
          text: "This is the same pattern Lesson 2's `CheckoutService`/`PaymentProcessor` example already used — DIP is what makes that design testable: a unit test can inject a fake `OrderRepository` with no real database at all.",
        },
      ],
    },
    {
      id: "summary-table",
      heading: "All five, side by side",
      blocks: [
        {
          kind: "table",
          headers: ["Letter", "Principle", "One-line test"],
          rows: [
            ["S", "Single Responsibility", "Can you describe the class's job without saying \"and\"?"],
            ["O", "Open/Closed", "Does adding a new case mean a new class, or editing an existing one?"],
            ["L", "Liskov Substitution", "Does every subclass honor every promise the superclass makes?"],
            ["I", "Interface Segregation", "Is any implementer forced to fake-implement a method it doesn't use?"],
            ["D", "Dependency Inversion", "Does business logic depend on a concrete class, or an interface?"],
          ],
        },
        {
          kind: "insight",
          text: "In practice these overlap constantly — fixing an OCP violation with polymorphism often also fixes an SRP violation, and DIP is close to unusable without ISP (a huge injected interface is barely better than a concrete dependency). Don't treat them as five independent checkboxes to tick in order.",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        {
          kind: "qa",
          question: "\"Can you over-apply SOLID?\"",
          answer:
            "\"Yes, and interviewers watch for this too. Splitting a two-line class into three interfaces because 'SOLID says so' when there's no second implementation and no evidence of change is over-engineering — the same mistake as reaching for a design pattern nothing requires. SOLID earns its cost when there's a real, likely-to-change requirement behind it.\"",
        },
        {
          kind: "qa",
          question: "\"Which SOLID principle do you find yourself applying most in practice?\"",
          answer:
            "\"Single Responsibility and Dependency Inversion, because they're the two that pay off immediately in testability — small classes with injected dependencies are trivial to unit test. Open/Closed and Liskov tend to matter most once a codebase actually has multiple implementations of something, which isn't always true on day one.\"",
        },
      ],
    },
  ],
  summary:
    "SOLID is five angles on one goal: contain the blast radius of a change. SRP keeps one class focused on one job. OCP lets new behavior arrive as new code, not edits to tested code. LSP makes sure a subclass never breaks a contract the superclass promised. ISP keeps interfaces small enough that no implementer fakes support it doesn't have. DIP makes business logic depend on abstractions instead of concrete classes, which is also what makes it unit-testable. Applied without a real reason behind it, all five become over-engineering — the same failure mode as reaching for a pattern nothing requires.",
  keyTakeaways: [
    "SRP: a class should have one reason to change — test it by describing the class's job without the word 'and'.",
    "OCP: new behavior should mean new code (a new class), not edits to existing, already-tested code.",
    "LSP: a subclass must honor every promise its superclass makes — an overridden method that throws or no-ops is the classic violation.",
    "ISP: interfaces should be small enough that no implementer is forced to fake-implement a method it doesn't use.",
    "DIP: business logic should depend on abstractions, not concrete classes — this is also what makes it possible to unit test with a fake dependency.",
  ],
  exercise: {
    prompt:
      "A `ReportGenerator` class has one method, `generate(String format)`, with an if/else inside for \"PDF\", \"CSV\", and \"HTML\" — each branch containing that format's full generation logic (50+ lines per branch). Name every SOLID principle this design violates, and briefly describe the fix for each.",
    guidance: [
      {
        kind: "list",
        items: [
          "**SRP** — the class has three responsibilities (PDF/CSV/HTML generation) bundled into one; split each into its own class.",
          "**OCP** — adding a new format (e.g. JSON) means editing this method; fix by extracting a `ReportFormatter` interface with `generate()`, one implementation per format, so a new format is a new class.",
          "**LSP** — isn't really in play here since there's no inheritance yet, but once you introduce the interface above, make sure every implementation genuinely supports `generate()` fully (no throwing 'not supported' for a format that's supposedly implemented).",
          "**DIP** — whatever calls `ReportGenerator.generate()` should depend on the `ReportFormatter` interface, not on `ReportGenerator`'s internal if/else, so a caller (or a test) can inject a fake formatter.",
        ],
      },
    ],
  },
};
