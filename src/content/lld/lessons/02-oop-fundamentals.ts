import type { LLDLesson } from "../types";

/**
 * Drafted from general LLD/OOD interview-prep knowledge — see this
 * module's own source note in `01-what-is-lld.ts`. Deliberately not a
 * from-scratch OOP tutorial ("here's what a class is") — it assumes you
 * can already write a class, and focuses on the parts of OOP that
 * actually get *tested* in an LLD round: which pillar is being exercised
 * by a given design decision, and where each one quietly breaks.
 */
export const OOP_FUNDAMENTALS: LLDLesson = {
  slug: "oop-fundamentals",
  number: 2,
  category: "fundamentals",
  title: "OOP Fundamentals for Interviews",
  tagline:
    "Every LLD decision you'll ever justify traces back to one of four pillars — the useful skill isn't reciting their definitions, it's naming which one a design choice is actually protecting.",
  estimatedMinutes: 30,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "You already know what a class is. What separates a strong LLD answer from a weak one isn't whether you can define encapsulation — it's whether, when an interviewer pushes back with \"why did you design it that way?\", you can point at a specific pillar and explain what breaks without it.",
        },
        {
          kind: "paragraph",
          text: "That's the frame for this lesson: four pillars, each shown by what goes wrong in its absence, not by a dictionary definition.",
        },
        {
          kind: "table",
          headers: ["Pillar", "One-line version", "What breaks without it"],
          rows: [
            ["Encapsulation", "Hide internal state, expose behavior", "Any code anywhere can corrupt your object's state"],
            ["Abstraction", "Expose *what*, hide *how*", "Callers depend on implementation details that shouldn't be able to change"],
            ["Inheritance", "Model a genuine \"is-a\" relationship", "You end up modeling \"is-a\" where the real relationship is \"has-a\" or \"behaves-like\""],
            ["Polymorphism", "One interface, many behaviors", "Every caller needs an if/else chain to handle each concrete type"],
          ],
        },
      ],
    },
    {
      id: "encapsulation",
      heading: "Encapsulation — hide state, expose behavior",
      blocks: [
        {
          kind: "paragraph",
          text: "Encapsulation isn't \"make fields private.\" That's the mechanism. The actual goal is that an object is always in a valid state, because nothing outside the object can reach in and set it to an invalid one directly.",
        },
        {
          kind: "code",
          language: "java",
          code: '// Without encapsulation — any caller can corrupt state\nclass BankAccount {\n    public double balance;\n}\n\naccount.balance = -500; // perfectly legal, silently wrong',
        },
        {
          kind: "code",
          language: "java",
          code: '// With encapsulation — the object protects its own invariant\nclass BankAccount {\n    private double balance;\n\n    public void withdraw(double amount) {\n        if (amount > balance) {\n            throw new IllegalStateException("Insufficient funds");\n        }\n        balance -= amount;\n    }\n\n    public double getBalance() {\n        return balance;\n    }\n}',
        },
        {
          kind: "insight",
          text: "The tell in an interview: if you find yourself writing a public setter for every private field with no validation in it, you haven't encapsulated anything — you've just added ceremony around the same open access.",
        },
      ],
    },
    {
      id: "abstraction",
      heading: "Abstraction — program to an interface, not an implementation",
      blocks: [
        {
          kind: "paragraph",
          text: "Abstraction is about what a caller needs to know versus what it doesn't. A `PaymentProcessor` interface tells callers \"you can call `pay(amount)`\" without telling them whether that means hitting a card network, a UPI gateway, or a wallet balance.",
        },
        {
          kind: "code",
          language: "java",
          code: 'interface PaymentProcessor {\n    boolean pay(double amount);\n}\n\nclass CardPayment implements PaymentProcessor {\n    public boolean pay(double amount) { /* card network call */ return true; }\n}\n\nclass UpiPayment implements PaymentProcessor {\n    public boolean pay(double amount) { /* UPI gateway call */ return true; }\n}\n\n// Calling code depends only on the interface\nclass CheckoutService {\n    private final PaymentProcessor processor;\n    CheckoutService(PaymentProcessor processor) { this.processor = processor; }\n    void checkout(double amount) {\n        if (!processor.pay(amount)) throw new RuntimeException("Payment failed");\n    }\n}',
        },
        {
          kind: "paragraph",
          text: "Why this matters beyond tidiness: `CheckoutService` never has to change when a new payment method is added. That's not a side benefit of abstraction — it's the entire point, and it's the same idea Open/Closed (Lesson 3) turns into a formal rule.",
        },
      ],
    },
    {
      id: "inheritance",
      heading: "Inheritance — a real \"is-a\", or a trap",
      blocks: [
        {
          kind: "paragraph",
          text: "Inheritance is the pillar most LLD candidates reach for too eagerly, and the one interviewers most often use to test judgment rather than syntax.",
        },
        {
          kind: "paragraph",
          text: "The test: does the subclass genuinely satisfy every promise the superclass makes? The classic failure is Square extending Rectangle — a Square *is a* Rectangle geometrically, but if `Rectangle.setWidth()` and `setHeight()` are independent, a Square can't honor both without breaking the shape that made it a square in the first place.",
        },
        {
          kind: "code",
          language: "java",
          code: '// Looks reasonable at first...\nclass Rectangle {\n    protected int width, height;\n    void setWidth(int w) { width = w; }\n    void setHeight(int h) { height = h; }\n    int area() { return width * height; }\n}\n\nclass Square extends Rectangle {\n    @Override\n    void setWidth(int w) { width = w; height = w; } // silently changes height too!\n    @Override\n    void setHeight(int h) { width = h; height = h; } // silently changes width too!\n}\n\n// Code written against Rectangle now behaves surprisingly for a Square\nRectangle r = new Square();\nr.setWidth(5);\nr.setHeight(10);\nassert r.area() == 50; // fails — area is 100, because setHeight silently changed width',
        },
        {
          kind: "insight",
          text: "This exact failure has a name — it's a Liskov Substitution Principle violation, covered formally in Lesson 3. Seeing it here first as \"inheritance gone wrong\" is deliberate: LSP isn't an abstract rule to memorize, it's the precise description of this specific, common mistake.",
        },
        {
          kind: "paragraph",
          text: "The fix in this specific case: don't model Square as a Rectangle subclass at all. Model both as implementations of a `Shape` interface with a single `area()` method, and let each compute area its own way.",
        },
      ],
    },
    {
      id: "composition-over-inheritance",
      heading: "Composition over inheritance",
      blocks: [
        {
          kind: "paragraph",
          text: "A large fraction of real-world inheritance misuse is actually a \"has-a\" or \"can-do\" relationship wearing an \"is-a\" costume. The fix, in most of these cases, is composition: give the class a reference to a collaborator instead of extending it.",
        },
        {
          kind: "paragraph",
          text: "Classic example: a `Duck` class family where some ducks can fly and some can't (RubberDuck), and some can quack and some can't (RubberDuck squeaks instead). Modeling `fly()`/`quack()` as inherited methods forces every subclass to override behavior it doesn't want.",
        },
        {
          kind: "code",
          language: "java",
          code: 'interface FlyBehavior { void fly(); }\ninterface QuackBehavior { void quack(); }\n\nclass FlyWithWings implements FlyBehavior {\n    public void fly() { System.out.println("Flying with wings"); }\n}\nclass CannotFly implements FlyBehavior {\n    public void fly() { System.out.println("Can\'t fly"); }\n}\n\nclass Duck {\n    private final FlyBehavior flyBehavior;\n    private final QuackBehavior quackBehavior;\n\n    Duck(FlyBehavior flyBehavior, QuackBehavior quackBehavior) {\n        this.flyBehavior = flyBehavior;\n        this.quackBehavior = quackBehavior;\n    }\n\n    void performFly() { flyBehavior.fly(); }\n    void performQuack() { quackBehavior.quack(); }\n}\n\n// A RubberDuck is composed from behaviors, not forced to override inherited ones\nDuck rubberDuck = new Duck(new CannotFly(), new SqueakQuack());',
        },
        {
          kind: "insight",
          label: "The rule of thumb",
          text: "Ask \"is a\" honestly. A Car is a Vehicle — that's real inheritance. A Car has an Engine — that's composition. A Duck can fly — that's a behavior it has, not a type it is. This exact pattern (swap a behavior in at construction time instead of overriding a method) is Strategy, covered in Lesson 6.",
        },
      ],
    },
    {
      id: "polymorphism",
      heading: "Polymorphism — one interface, many behaviors",
      blocks: [
        {
          kind: "paragraph",
          text: "Polymorphism is what makes abstraction actually pay off at the call site. Once every payment method implements the same `PaymentProcessor` interface, `CheckoutService` can hold a *list* of them and call `.pay()` on each without knowing or caring which concrete class it's talking to.",
        },
        {
          kind: "code",
          language: "java",
          code: 'List<PaymentProcessor> processors = List.of(new CardPayment(), new UpiPayment());\nfor (PaymentProcessor p : processors) {\n    p.pay(100.0); // same call, different behavior per concrete type\n}',
        },
        {
          kind: "paragraph",
          text: "The alternative — without polymorphism — is an if/else or switch on type, repeated at every call site that needs this decision:",
        },
        {
          kind: "code",
          language: "java",
          code: '// Without polymorphism: every call site repeats this, and every new\n// payment method means editing every one of them\nif (type.equals("CARD")) { payWithCard(amount); }\nelse if (type.equals("UPI")) { payWithUpi(amount); }\nelse if (type.equals("WALLET")) { payWithWallet(amount); }',
        },
        {
          kind: "insight",
          text: "A repeated if/else-on-type chain scattered across a codebase is one of the most reliable \"tells\" in an LLD interview that polymorphism is missing. If you spot yourself writing one, stop and ask whether an interface with one method per branch would let each type answer for itself instead.",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        {
          kind: "qa",
          question: "\"When would you choose inheritance over composition?\"",
          answer:
            "\"When the relationship is genuinely 'is-a' and every method the superclass promises makes sense for the subclass too — not just some of them. If I catch myself overriding a method to throw UnsupportedOperationException or to no-op it, that's a sign the relationship isn't really inheritance and I should switch to composition instead.\"",
        },
        {
          kind: "qa",
          question: "\"What's the difference between abstraction and encapsulation? They sound similar.\"",
          answer:
            "\"Encapsulation is about protecting an object's internal state from outside interference — it's an implementation-level guarantee. Abstraction is about designing the interface a caller sees, independent of how it's implemented. A well-encapsulated class can still have a leaky abstraction if its public interface exposes implementation details it shouldn't.\"",
        },
        {
          kind: "qa",
          question: "\"Give an example where you'd deliberately break encapsulation.\"",
          answer:
            "\"Rarely, and usually only for something like a debug/inspection API, clearly named and separated from the main interface — e.g. a package-private accessor used only by tests. If it's reachable by normal application code, it's not really an exception, it's a design mistake.\"",
        },
      ],
    },
  ],
  summary:
    "The four OOP pillars aren't independent trivia — they compound. Encapsulation protects an object's state; abstraction defines what callers depend on instead of how it's implemented; polymorphism is what makes that abstraction actually replace repeated if/else-on-type logic; and inheritance is only the right tool when the relationship is a genuine 'is-a', with composition as the honest alternative for everything else. Every pattern in Lessons 6-8 is one of these four ideas applied to a specific, recurring problem shape.",
  keyTakeaways: [
    "Encapsulation's goal is a valid invariant, not just private fields — a getter/setter pair with no validation encapsulates nothing.",
    "Abstraction means callers depend on an interface, not an implementation — so implementations can change or multiply without touching callers.",
    "Inheritance should only model a real 'is-a' where every superclass method makes sense for the subclass. Square-extends-Rectangle is the canonical counterexample.",
    "Composition ('has-a'/'can-do') is the fix for most inheritance misuse — inject a behavior instead of overriding an inherited method.",
    "Polymorphism replaces repeated if/else-on-type chains scattered across a codebase with one method call resolved per concrete type — spotting that repeated chain is the interview tell that it's missing.",
  ],
  exercise: {
    prompt:
      "You're modeling notification delivery for an app that can send notifications by Email, SMS, or Push. A teammate's first draft has one `NotificationService` class with a method `send(String type, String message)` containing an if/else on `type` for each channel. Identify which OOP pillar is missing, and rewrite the design (just the class/interface shapes, not full code) to fix it.",
    guidance: [
      {
        kind: "list",
        items: [
          "**Diagnosis** — polymorphism is missing; the if/else-on-type chain is the exact tell from this lesson's Polymorphism section.",
          "**Fix** — define a `NotificationChannel` interface with a `send(String message)` method, then `EmailChannel`, `SmsChannel`, and `PushChannel` each implement it. `NotificationService` holds a `List<NotificationChannel>` (or a single one, injected) and calls `.send()` without knowing which concrete channel it's talking to.",
          "**Payoff** — adding a new channel (e.g. WhatsApp) later means adding one new class, zero existing code changes — the same benefit Lesson 3's Open/Closed Principle names formally.",
        ],
      },
    ],
  },
};
