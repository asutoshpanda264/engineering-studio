import type { LLDLesson } from "../types";

/**
 * Drafted from general LLD/OOD interview-prep knowledge — see this
 * module's own source note in `01-what-is-lld.ts`. Opens the Design
 * Patterns group: five patterns, each justified by the specific object-
 * creation problem it solves, not presented as trivia to memorize (see
 * `01-what-is-lld.ts`'s own framing of what this track is for).
 */
export const CREATIONAL_PATTERNS: LLDLesson = {
  slug: "creational-patterns",
  number: 6,
  category: "patterns",
  title: "Creational Design Patterns",
  tagline:
    "Every creational pattern answers the same question — how do I create an object without the calling code being welded to one concrete class — for a different flavor of that problem.",
  estimatedMinutes: 35,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "Plain `new SomeClass()` calls are fine until they aren't — until you need exactly one instance system-wide, or the exact class to create depends on a runtime condition, or the object takes twelve optional parameters, or creating it is expensive and most copies are near-identical to one already built. Each of the five patterns below is the standard answer to one of those specific situations.",
        },
        {
          kind: "table",
          headers: ["Pattern", "Use when..."],
          rows: [
            ["Singleton", "Exactly one instance should ever exist, accessed from many places"],
            ["Factory Method", "The exact class to instantiate depends on a condition, and you want that decision in one place"],
            ["Abstract Factory", "You need to create a whole family of related objects that must stay consistent with each other"],
            ["Builder", "An object has many optional parameters or must be constructed step by step"],
            ["Prototype", "Creating an object from scratch is expensive, but cloning an existing one is cheap"],
          ],
        },
      ],
    },
    {
      id: "singleton",
      heading: "Singleton",
      blocks: [
        {
          kind: "paragraph",
          text: "Ensures a class has exactly one instance, with a single global access point. The most over-used pattern in interviews precisely because it's the easiest to reach for — and the one most likely to draw a pointed follow-up question about thread safety.",
        },
        {
          kind: "code",
          language: "java",
          code: '// Naive — breaks under concurrent access\nclass ConfigManager {\n    private static ConfigManager instance;\n    private ConfigManager() {}\n\n    public static ConfigManager getInstance() {\n        if (instance == null) {\n            instance = new ConfigManager(); // two threads can both pass this check\n        }\n        return instance;\n    }\n}',
        },
        {
          kind: "code",
          language: "java",
          code: '// Thread-safe, lazy, and without a lock on every call\nclass ConfigManager {\n    private ConfigManager() {}\n\n    private static class Holder {\n        static final ConfigManager INSTANCE = new ConfigManager();\n    }\n\n    public static ConfigManager getInstance() {\n        return Holder.INSTANCE; // JVM guarantees this is created lazily and thread-safely\n    }\n}',
        },
        {
          kind: "insight",
          text: "This project's own ParkingLot case study (Lesson 9) uses Singleton for exactly the reason it's actually justified — there should be exactly one ParkingLot instance tracking spot availability, and two accidental instances would silently double-book spots.",
        },
        {
          kind: "paragraph",
          text: "The honest caveat interviewers want to hear: Singleton makes unit testing harder (global state persists across tests, and swapping in a fake for testing is awkward) and can hide a dependency that should have been passed in explicitly. Reach for it because a requirement demands exactly one instance, not as a default way to avoid passing an object around.",
        },
      ],
    },
    {
      id: "factory-method",
      heading: "Factory Method",
      blocks: [
        {
          kind: "paragraph",
          text: "Delegates object creation to a method, so the calling code depends on an interface/abstract type rather than a concrete class. This is the direct code-level continuation of Lesson 2's polymorphism example and Lesson 3's Open/Closed Principle — Factory Method is the standard name for using a method (instead of a raw `new`) to get that same benefit at the point of construction.",
        },
        {
          kind: "code",
          language: "java",
          code: 'interface NotificationChannel {\n    void send(String message);\n}\nclass EmailChannel implements NotificationChannel { public void send(String m) { /* ... */ } }\nclass SmsChannel implements NotificationChannel { public void send(String m) { /* ... */ } }\n\nclass NotificationFactory {\n    static NotificationChannel create(String type) {\n        return switch (type) {\n            case "EMAIL" -> new EmailChannel();\n            case "SMS" -> new SmsChannel();\n            default -> throw new IllegalArgumentException("Unknown channel: " + type);\n        };\n    }\n}\n\n// Calling code never names a concrete class\nNotificationChannel channel = NotificationFactory.create(userPreference);\nchannel.send("Your order shipped");',
        },
        {
          kind: "insight",
          text: "Notice the switch statement is still here — Factory Method doesn't eliminate the if/else-on-type decision, it contains it to exactly one place instead of scattering it across every call site. Adding a new channel means editing this one factory, not every place `NotificationChannel` gets created.",
        },
      ],
    },
    {
      id: "abstract-factory",
      heading: "Abstract Factory",
      blocks: [
        {
          kind: "paragraph",
          text: "One level above Factory Method: creates a whole *family* of related objects that need to stay consistent with each other, without the calling code knowing which family it's using.",
        },
        {
          kind: "code",
          language: "java",
          code: 'interface Button { void render(); }\ninterface Checkbox { void render(); }\n\n// One family: consistent with each other\nclass DarkButton implements Button { public void render() { /* dark-themed */ } }\nclass DarkCheckbox implements Checkbox { public void render() { /* dark-themed */ } }\n\n// Another family\nclass LightButton implements Button { public void render() { /* light-themed */ } }\nclass LightCheckbox implements Checkbox { public void render() { /* light-themed */ } }\n\ninterface UIFactory {\n    Button createButton();\n    Checkbox createCheckbox();\n}\nclass DarkThemeFactory implements UIFactory {\n    public Button createButton() { return new DarkButton(); }\n    public Checkbox createCheckbox() { return new DarkCheckbox(); }\n}\nclass LightThemeFactory implements UIFactory {\n    public Button createButton() { return new LightButton(); }\n    public Checkbox createCheckbox() { return new LightCheckbox(); }\n}\n\n// Calling code gets a whole consistent family from one factory\nUIFactory factory = darkMode ? new DarkThemeFactory() : new LightThemeFactory();\nButton button = factory.createButton();\nCheckbox checkbox = factory.createCheckbox(); // guaranteed to match button\'s theme',
        },
        {
          kind: "table",
          headers: ["", "Factory Method", "Abstract Factory"],
          rows: [
            ["Creates", "One product", "A family of related products"],
            ["Mechanism", "One method, one decision", "An interface with several creation methods, one implementation per family"],
            ["Risk if confused", "Consistency isn't the concern, so Abstract Factory is overkill", "A single Factory Method can't guarantee two separately-created objects match"],
          ],
        },
      ],
    },
    {
      id: "builder",
      heading: "Builder",
      blocks: [
        {
          kind: "paragraph",
          text: "Constructs a complex object step by step, solving the \"telescoping constructor\" problem — a class with many optional parameters where every combination would need its own constructor overload.",
        },
        {
          kind: "code",
          language: "java",
          code: '// Without Builder: which boolean is which at the call site?\nnew PizzaOrder("Large", true, false, true, false, true, "extra cheese");\n\n// With Builder: self-documenting, and optional fields are truly optional\nPizzaOrder order = new PizzaOrder.Builder()\n    .size("Large")\n    .withPepperoni()\n    .withExtraCheese()\n    .notes("well done")\n    .build();',
        },
        {
          kind: "code",
          language: "java",
          code: 'class PizzaOrder {\n    private final String size;\n    private final boolean pepperoni;\n    private final boolean extraCheese;\n    private final String notes;\n\n    private PizzaOrder(Builder b) {\n        this.size = b.size;\n        this.pepperoni = b.pepperoni;\n        this.extraCheese = b.extraCheese;\n        this.notes = b.notes;\n    }\n\n    static class Builder {\n        private String size = "Medium"; // sensible default\n        private boolean pepperoni = false;\n        private boolean extraCheese = false;\n        private String notes = "";\n\n        Builder size(String size) { this.size = size; return this; }\n        Builder withPepperoni() { this.pepperoni = true; return this; }\n        Builder withExtraCheese() { this.extraCheese = true; return this; }\n        Builder notes(String notes) { this.notes = notes; return this; }\n        PizzaOrder build() { return new PizzaOrder(this); }\n    }\n}',
        },
        {
          kind: "insight",
          text: "The tell that Builder is worth reaching for: a constructor with 4+ parameters, especially several of the same type (three booleans in a row is a classic bug source — easy to pass them in the wrong order and have it compile fine).",
        },
      ],
    },
    {
      id: "prototype",
      heading: "Prototype",
      blocks: [
        {
          kind: "paragraph",
          text: "Creates new objects by cloning an existing instance rather than building from scratch — useful when construction is expensive (a database read, a network call, heavy computation) but most needed copies differ only slightly from one already in memory.",
        },
        {
          kind: "code",
          language: "java",
          code: 'class GameCharacter implements Cloneable {\n    String name;\n    int health, mana;\n    List<String> inventory; // needs deep copy — see caveat below\n\n    @Override\n    public GameCharacter clone() {\n        GameCharacter copy = new GameCharacter();\n        copy.name = this.name;\n        copy.health = this.health;\n        copy.mana = this.mana;\n        copy.inventory = new ArrayList<>(this.inventory); // deep copy the mutable list\n        return copy;\n    }\n}\n\n// Cloning a pre-configured "enemy template" is cheaper than rebuilding one from scratch\nGameCharacter goblinTemplate = loadFromDatabase("goblin"); // expensive\nGameCharacter goblin1 = goblinTemplate.clone(); // cheap\nGameCharacter goblin2 = goblinTemplate.clone(); // cheap',
        },
        {
          kind: "insight",
          text: "The caveat that separates a correct Prototype implementation from a subtle bug: shallow vs. deep copy. Copying a reference field (like `inventory` above) without cloning the object it points to means both the original and the clone share the same underlying list — mutating one mutates both.",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        {
          kind: "qa",
          question: "\"When would you NOT use Singleton, even though it seems to fit?\"",
          answer:
            "\"When the 'exactly one instance' constraint isn't a real requirement of the problem, just a convenience for accessing something from many places. If I actually need testability — swapping in a fake for a unit test — I'd inject the dependency explicitly instead, even if in practice only one instance is ever created.\"",
        },
        {
          kind: "qa",
          question: "\"How is Builder different from just using a constructor with default parameter values?\"",
          answer:
            "\"Java doesn't have default parameters the way some languages do, so Builder is partly filling that gap — but even in languages that do, Builder still wins once you have many optional combinations, because method names at the call site (`.withPepperoni()`) are self-documenting in a way that positional arguments never are.\"",
        },
      ],
    },
  ],
  summary:
    "Creational patterns all solve some version of 'how do I create an object without the caller being welded to one concrete class or one constructor signature.' Singleton guarantees exactly one instance. Factory Method contains a type-decision to one place. Abstract Factory extends that to a whole family of objects that must stay consistent. Builder replaces telescoping constructors with a readable step-by-step API. Prototype clones instead of rebuilding when construction is expensive. Each earns its place from a specific requirement — reaching for one without that requirement is the over-engineering Lesson 5 already warned about.",
  keyTakeaways: [
    "Singleton guarantees exactly one instance — reach for it when a requirement demands that, not as a default way to avoid passing a dependency around.",
    "Factory Method contains a type-decision (an if/else or switch) to one place, so calling code depends on an interface, never a concrete class.",
    "Abstract Factory is Factory Method extended to a family of related objects that must stay consistent with each other — the consistency guarantee is the whole point.",
    "Builder replaces a telescoping/many-parameter constructor with a readable, step-by-step, self-documenting API — the tell is 4+ constructor parameters, especially same-typed ones in a row.",
    "Prototype clones an existing instance instead of rebuilding from scratch — watch for shallow-copy bugs on any mutable reference field.",
  ],
  exercise: {
    prompt:
      "A codebase has a `Document` class with a constructor taking (title, author, content, isPublished, isEncrypted, watermarkText, fontFamily, fontSize) — 8 parameters, most of them optional with sensible defaults. Which creational pattern fits, and sketch the API a caller would use after the fix (method-chain calls only, no full implementation).",
    guidance: [
      { kind: "paragraph", text: "**Pattern** — Builder." },
      {
        kind: "code",
        language: "java",
        code: 'Document doc = new Document.Builder()\n    .title("Q3 Report")\n    .author("A. Sharma")\n    .content(text)\n    .encrypted()\n    .watermark("CONFIDENTIAL")\n    .build();',
      },
      {
        kind: "paragraph",
        text: "Only the fields that need non-default values appear at the call site, each one is named (no ambiguous positional booleans), and fields left unset silently take their defaults (isPublished=false, fontFamily/fontSize at whatever the Builder's own defaults are).",
      },
    ],
  },
};
