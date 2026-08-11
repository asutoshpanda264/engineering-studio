import type { LLDLesson } from "../types";

/**
 * Drafted from general LLD/OOD interview-prep knowledge — see this
 * module's own source note in `01-what-is-lld.ts`. Fifth case study —
 * combines two behavioral patterns from Lesson 8 in one problem (Strategy
 * for how an expense splits, Observer for who gets notified), the way a
 * real 40-minute round rarely tests exactly one pattern in isolation.
 */
export const SPLITWISE: LLDLesson = {
  slug: "splitwise",
  number: 13,
  category: "case-study",
  title: "Case Study: Splitwise",
  tagline:
    "Splitting a bill three different ways (equally, by exact amount, by percentage) is Strategy. Telling every affected user their balance changed is Observer. Real problems usually need more than one pattern at once.",
  estimatedMinutes: 35,
  sections: [
    {
      id: "requirements",
      heading: "Step 1 — Requirements",
      blocks: [
        {
          kind: "paragraph",
          text: "Users belong to groups. Any user can add an expense to a group, specifying who owes what — split equally among participants, by exact amounts, or by percentage. The system tracks each pair of users' net balance and can show \"who owes whom, how much.\"",
        },
        {
          kind: "paragraph",
          text: "Out of scope for this pass: actual payment settlement (marking a debt as paid is a state change, not a payment transaction), and debt simplification across a whole group (a genuinely separate graph problem, discussed briefly at the end as an extension, not designed in full).",
        },
      ],
    },
    {
      id: "actors-use-cases",
      heading: "Step 2 — Actors and use cases",
      blocks: [
        {
          kind: "list",
          items: [
            "User — adds an expense to a group, specifying the split; views their net balance with each other user.",
            "The system — validates a split's numbers actually add up, updates every affected balance, notifies participants.",
          ],
        },
      ],
    },
    {
      id: "classes-relationships",
      heading: "Steps 3-4 — Classes and relationships",
      blocks: [
        {
          kind: "uml",
          relationships: [
            { from: "Group", to: "Expense", kind: "composition", fromMultiplicity: "1", toMultiplicity: "0..*", label: "has" },
            { from: "Expense", to: "ExpenseSplitStrategy", kind: "association", fromMultiplicity: "1", toMultiplicity: "1", label: "uses" },
            { from: "Expense", to: "Split", kind: "composition", fromMultiplicity: "1", toMultiplicity: "1..*", label: "has, one per participant" },
            { from: "Group", to: "User", kind: "association", fromMultiplicity: "1", toMultiplicity: "1..*", label: "members" },
          ],
        },
        {
          kind: "paragraph",
          text: "An Expense composes its Splits — a Split (\"user X owes ₹200 for this expense\") has no meaning outside the specific Expense it belongs to. Expense delegates to an ExpenseSplitStrategy to compute those Splits from whatever input the payer gave (equal shares, exact amounts, or percentages).",
        },
      ],
    },
    {
      id: "split-strategy",
      heading: "Step 6a — ExpenseSplitStrategy: three genuinely different algorithms",
      blocks: [
        {
          kind: "paragraph",
          text: "This qualifies as real Strategy, not an over-application, because the requirements explicitly name three split types the user chooses between — the same bar Lesson 5 set for when a pattern earns its place.",
        },
        {
          kind: "code",
          language: "java",
          code: 'record Split(User user, double amountOwed) {}\n\ninterface ExpenseSplitStrategy {\n    List<Split> computeSplits(double totalAmount, List<User> participants, Map<User, Double> input);\n}\n\nclass EqualSplitStrategy implements ExpenseSplitStrategy {\n    public List<Split> computeSplits(double totalAmount, List<User> participants, Map<User, Double> input) {\n        double share = totalAmount / participants.size();\n        return participants.stream().map(u -> new Split(u, share)).toList();\n    }\n}\n\nclass ExactSplitStrategy implements ExpenseSplitStrategy {\n    public List<Split> computeSplits(double totalAmount, List<User> participants, Map<User, Double> input) {\n        double sum = input.values().stream().mapToDouble(Double::doubleValue).sum();\n        if (Math.abs(sum - totalAmount) > 0.01) {\n            throw new IllegalArgumentException("Exact amounts must sum to the total");\n        }\n        return participants.stream().map(u -> new Split(u, input.get(u))).toList();\n    }\n}\n\nclass PercentageSplitStrategy implements ExpenseSplitStrategy {\n    public List<Split> computeSplits(double totalAmount, List<User> participants, Map<User, Double> input) {\n        double totalPercent = input.values().stream().mapToDouble(Double::doubleValue).sum();\n        if (Math.abs(totalPercent - 100.0) > 0.01) {\n            throw new IllegalArgumentException("Percentages must sum to 100");\n        }\n        return participants.stream()\n            .map(u -> new Split(u, totalAmount * input.get(u) / 100.0))\n            .toList();\n    }\n}',
        },
        {
          kind: "insight",
          text: "Each strategy validates its own input shape — ExactSplitStrategy checks amounts sum to the total, PercentageSplitStrategy checks percentages sum to 100. This validation genuinely belongs to each strategy, not to a shared `Expense` method, since what 'valid input' even means differs per split type.",
        },
      ],
    },
    {
      id: "balance-sheet",
      heading: "Step 5 — Tracking net balances",
      blocks: [
        {
          kind: "paragraph",
          text: "The core bookkeeping problem: after \"Alice paid ₹900 for dinner, split equally among Alice, Bob, Carol,\" the system needs to know Bob owes Alice ₹300 and Carol owes Alice ₹300 — and if Bob later pays for something Alice and Carol share, those balances should net against each other, not stack as separate unrelated debts.",
        },
        {
          kind: "code",
          language: "java",
          code: 'class BalanceSheet {\n    // balances.get(A).get(B) = amount A owes B (negative means B owes A)\n    private final Map<User, Map<User, Double>> balances = new HashMap<>();\n\n    void recordExpense(User paidBy, List<Split> splits) {\n        for (Split split : splits) {\n            if (split.user().equals(paidBy)) continue; // payer doesn\'t owe themselves\n            adjust(split.user(), paidBy, split.amountOwed()); // split.user() owes paidBy\n        }\n    }\n\n    private void adjust(User debtor, User creditor, double amount) {\n        double current = balances.getOrDefault(debtor, Map.of()).getOrDefault(creditor, 0.0);\n        setBalance(debtor, creditor, current + amount);\n        setBalance(creditor, debtor, -(current + amount)); // kept symmetric and consistent\n    }\n\n    private void setBalance(User a, User b, double amount) {\n        balances.computeIfAbsent(a, k -> new HashMap<>()).put(b, amount);\n    }\n\n    double netBalance(User a, User b) {\n        return balances.getOrDefault(a, Map.of()).getOrDefault(b, 0.0);\n    }\n}',
        },
      ],
    },
    {
      id: "notification-observer",
      heading: "Step 6b — Observer: a separate concern from splitting",
      blocks: [
        {
          kind: "paragraph",
          text: "\"Notify participants when an expense affects their balance\" is a distinct requirement from how the split is computed, and folding notification logic into `ExpenseSplitStrategy` or `BalanceSheet` would violate Single Responsibility — each already has one clear job. Observer keeps it a third, independent concern.",
        },
        {
          kind: "code",
          language: "java",
          code: 'interface BalanceChangeObserver {\n    void onBalanceChanged(User user, User other, double newBalance);\n}\n\nclass PushNotifier implements BalanceChangeObserver {\n    public void onBalanceChanged(User user, User other, double newBalance) { /* send push */ }\n}\nclass EmailDigestQueue implements BalanceChangeObserver {\n    public void onBalanceChanged(User user, User other, double newBalance) { /* queue for daily digest */ }\n}\n\nclass Group {\n    private final BalanceSheet balanceSheet = new BalanceSheet();\n    private final List<BalanceChangeObserver> observers = new ArrayList<>();\n\n    void subscribe(BalanceChangeObserver observer) { observers.add(observer); }\n\n    void addExpense(double amount, User paidBy, List<User> participants,\n                     ExpenseSplitStrategy strategy, Map<User, Double> input) {\n        List<Split> splits = strategy.computeSplits(amount, participants, input);\n        balanceSheet.recordExpense(paidBy, splits);\n        for (Split split : splits) {\n            double newBalance = balanceSheet.netBalance(split.user(), paidBy);\n            observers.forEach(o -> o.onBalanceChanged(split.user(), paidBy, newBalance));\n        }\n    }\n}',
        },
      ],
    },
    {
      id: "extensibility",
      heading: "Extensibility — what if a new requirement arrived?",
      blocks: [
        {
          kind: "table",
          headers: ["New requirement", "What changes"],
          rows: [
            ["A new split type (e.g. by shares/weight, not raw percentage)", "One new `ExpenseSplitStrategy` implementation — `Group.addExpense` and `BalanceSheet` don't change at all."],
            ["A new notification channel (in-app banner)", "One new `BalanceChangeObserver` implementation, subscribed alongside the existing two — `Group` doesn't change."],
            ["Debt simplification (\"Bob owes Alice ₹300, Alice owes Carol ₹300\" → \"Bob owes Carol ₹300\" directly, minimizing total transactions)", "Genuinely a separate algorithm over the whole `BalanceSheet` graph — not a Strategy swap on an existing interface, since it operates on the aggregate, not on one expense at a time. Worth naming as out of this design's current scope rather than claiming it's a small addition — it's closer to a min-cash-flow graph problem than a pattern application."],
          ],
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        {
          kind: "qa",
          question: "\"Why is Observer justified here but you didn't use it in the Parking Lot case study?\"",
          answer:
            "\"Because this requirement explicitly needs multiple independent things to react to one event — the balance changing — without the thing that changed (Group/BalanceSheet) needing to know what they are. Parking Lot never had a requirement shaped like that. Reaching for Observer without a real fan-out-of-reactions requirement would be the same over-application this track has warned about with every other pattern.\"",
        },
        {
          kind: "qa",
          question: "\"How would you handle floating-point rounding errors in an equal split that doesn't divide evenly (₹100 split 3 ways)?\"",
          answer:
            "\"₹100/3 = ₹33.33 repeating — splitting equally and rounding each share independently can lose or gain a cent depending on rounding direction, and the shares might not sum back to exactly ₹100. The standard fix: compute all shares but the last one by rounding down, then assign the last participant the remainder (`total - sum of the others`) so the splits always sum exactly to the original amount, even if one person's share is a cent or two different from the others.\"",
        },
      ],
    },
  ],
  summary:
    "Splitwise is a two-pattern problem, not a one-pattern problem: ExpenseSplitStrategy earns Strategy because the requirements name three genuinely different split algorithms a user chooses between, and BalanceChangeObserver earns Observer because notification is a separate concern from both splitting and balance bookkeeping, with a real fan-out to multiple independent reactions. Keeping split computation, balance tracking, and notification as three separate responsibilities — rather than one class doing all three — is what makes each of Splitwise's plausible extensions (a new split type, a new notification channel) a new class instead of an edit to working code.",
  keyTakeaways: [
    "ExpenseSplitStrategy earns Strategy because the requirements explicitly name three different split algorithms — the same bar every pattern in this track needs to clear.",
    "BalanceChangeObserver earns Observer because notification is genuinely a separate concern with multiple independent reactions to one event, not because 'notify someone' always means Observer.",
    "Splitting split-computation, balance-bookkeeping, and notification into three classes (not one) is what makes each extension (new split type, new channel) additive instead of an edit.",
    "Debt simplification across a whole group is a distinct graph algorithm operating on the aggregate BalanceSheet, not a Strategy swap on a per-expense interface — worth naming as separate scope, not folded in as if it were free.",
    "Rounding an equal split: compute all-but-the-last share by rounding down, assign the remainder to the last participant, so splits always sum exactly to the original amount.",
  ],
  exercise: {
    prompt:
      "A new requirement: a user should be able to 'settle up' — record a direct payment to another user that reduces their net balance, separate from any expense. Sketch how this interacts with the existing BalanceSheet and BalanceChangeObserver — new method(s), and whether settling up should also notify observers.",
    guidance: [
      {
        kind: "list",
        items: [
          "**Add `BalanceSheet.recordSettlement(User payer, User payee, double amount)`** — calls the same private `adjust(payer, payee, -amount)` that `recordExpense` already uses internally (a settlement reduces what payer owes payee, the opposite sign direction from `recordExpense`'s debt-increasing adjustment), reusing the existing symmetric-balance-update logic rather than duplicating it.",
          "**Should it notify observers? Yes.** The same `BalanceChangeObserver.onBalanceChanged` interface already fits, since a settlement is still 'this pair's balance changed,' just via a different trigger than an expense.",
          "**`Group`** — gains a `settleUp(User payer, User payee, double amount)` method mirroring `addExpense`'s shape: call `balanceSheet.recordSettlement`, then notify observers with the new balance — no new observer interface needed.",
        ],
      },
    ],
  },
};
