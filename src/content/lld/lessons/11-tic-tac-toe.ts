import type { LLDLesson } from "../types";

/**
 * Drafted from general LLD/OOD interview-prep knowledge — see this
 * module's own source note in `01-what-is-lld.ts`. Third case study —
 * deliberately generalized to an N×N board with a K-in-a-row win
 * condition, since "now make it work for a 5×5 board" is the single most
 * common live follow-up on this exact problem, and a design that treats
 * 3×3 as a special case rather than the general shape fails that follow-up.
 */
export const TIC_TAC_TOE: LLDLesson = {
  slug: "tic-tac-toe",
  number: 11,
  category: "case-study",
  title: "Case Study: Tic-Tac-Toe",
  tagline:
    "The follow-up every interviewer asks — 'now make it an N×N board' — is a design test in disguise: does your win-checking logic assume 3×3, or did you build the general case from the start?",
  estimatedMinutes: 30,
  sections: [
    {
      id: "requirements",
      heading: "Step 1 — Requirements",
      blocks: [
        {
          kind: "paragraph",
          text: "In scope, built as the general case from the start rather than retrofitted later: an N×N board, two players, symbols placed alternately, a win condition of K symbols in a row (horizontal, vertical, or diagonal), and detecting a draw when the board fills with no winner.",
        },
        {
          kind: "paragraph",
          text: "Classic 3×3 tic-tac-toe is just N=3, K=3 — a special case of the general design, never a separate code path.",
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
            "Two Players — take turns placing their symbol on an empty cell.",
            "The Game — validates each move, checks for a win or draw after each move, reports the result.",
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
            { from: "Game", to: "Board", kind: "composition", fromMultiplicity: "1", toMultiplicity: "1", label: "has" },
            { from: "Board", to: "Cell", kind: "composition", fromMultiplicity: "1", toMultiplicity: "N×N", label: "has" },
            { from: "Game", to: "Player", kind: "association", fromMultiplicity: "1", toMultiplicity: "2", label: "turn order" },
            { from: "Game", to: "WinningStrategy", kind: "association", fromMultiplicity: "1", toMultiplicity: "1", label: "uses" },
          ],
        },
        {
          kind: "paragraph",
          text: "Game composes Board (a board with no game to belong to is meaningless here), Board composes its Cells. Game associates with two Players and delegates win-checking to a WinningStrategy — a genuine Strategy candidate, covered next.",
        },
      ],
    },
    {
      id: "board-and-players",
      heading: "Steps 5 — Board, Cell, Player",
      blocks: [
        {
          kind: "code",
          language: "java",
          code: 'enum Symbol { X, O, EMPTY }\n\nclass Cell {\n    private Symbol symbol = Symbol.EMPTY;\n    Symbol symbol() { return symbol; }\n    void set(Symbol symbol) {\n        if (this.symbol != Symbol.EMPTY) throw new IllegalStateException("Cell already occupied");\n        this.symbol = symbol;\n    }\n}\n\nclass Board {\n    private final int size;\n    private final Cell[][] cells;\n\n    Board(int size) {\n        this.size = size;\n        cells = new Cell[size][size];\n        for (int r = 0; r < size; r++)\n            for (int c = 0; c < size; c++)\n                cells[r][c] = new Cell();\n    }\n\n    int size() { return size; }\n    Cell cellAt(int row, int col) { return cells[row][col]; }\n    boolean isFull() {\n        for (Cell[] row : cells)\n            for (Cell cell : row)\n                if (cell.symbol() == Symbol.EMPTY) return false;\n        return true;\n    }\n}\n\nrecord Player(String name, Symbol symbol) {}',
        },
      ],
    },
    {
      id: "winning-strategy",
      heading: "Step 6 — WinningStrategy: the pattern that actually matters here",
      blocks: [
        {
          kind: "paragraph",
          text: "This is where the N×N/K-in-a-row generalization lives — and the part of the design an interviewer is specifically probing when they ask the follow-up. A naive implementation hardcodes 8 win conditions for a 3×3 board (3 rows, 3 columns, 2 diagonals). The general version checks, after every move, only the lines that pass through the cell that just changed — far cheaper than rescanning the whole board, and correct for any N and any K.",
        },
        {
          kind: "code",
          language: "java",
          code: 'interface WinningStrategy {\n    boolean checkWin(Board board, int row, int col, Symbol symbol, int k);\n}\n\nclass LineCheckStrategy implements WinningStrategy {\n    // Checks the 4 directions that pass through the just-played cell:\n    // horizontal, vertical, and both diagonals — not the whole board.\n    private static final int[][] DIRECTIONS = {{0, 1}, {1, 0}, {1, 1}, {1, -1}};\n\n    public boolean checkWin(Board board, int row, int col, Symbol symbol, int k) {\n        for (int[] dir : DIRECTIONS) {\n            int count = 1; // the cell just played\n            count += countInDirection(board, row, col, dir[0], dir[1], symbol);\n            count += countInDirection(board, row, col, -dir[0], -dir[1], symbol);\n            if (count >= k) return true;\n        }\n        return false;\n    }\n\n    private int countInDirection(Board board, int row, int col, int dRow, int dCol, Symbol symbol) {\n        int count = 0;\n        int r = row + dRow, c = col + dCol;\n        while (r >= 0 && r < board.size() && c >= 0 && c < board.size()\n                && board.cellAt(r, c).symbol() == symbol) {\n            count++;\n            r += dRow;\n            c += dCol;\n        }\n        return count;\n    }\n}',
        },
        {
          kind: "insight",
          text: "The interview-visible payoff: this same `LineCheckStrategy` class, unmodified, correctly plays 3×3 tic-tac-toe (K=3), a 5×5 variant (K=4, say), or Connect-Four-style rules (K=4 on a wider board) — because N and K were never hardcoded assumptions, they were parameters from the start. If you find yourself writing separate methods for `checkRows()`, `checkColumns()`, `checkDiagonals()`, that's the version that breaks the moment N changes.",
        },
      ],
    },
    {
      id: "core-flow",
      heading: "Step 7 — Core flow: Game.play",
      blocks: [
        {
          kind: "code",
          language: "java",
          code: 'enum GameResult { IN_PROGRESS, WIN, DRAW }\n\nclass Game {\n    private final Board board;\n    private final Player[] players;\n    private final WinningStrategy winningStrategy;\n    private final int k;\n    private int currentPlayerIndex = 0;\n\n    Game(int boardSize, int k, Player p1, Player p2, WinningStrategy winningStrategy) {\n        this.board = new Board(boardSize);\n        this.players = new Player[]{p1, p2};\n        this.winningStrategy = winningStrategy;\n        this.k = k;\n    }\n\n    GameResult makeMove(int row, int col) {\n        Player current = players[currentPlayerIndex];\n        board.cellAt(row, col).set(current.symbol());\n\n        if (winningStrategy.checkWin(board, row, col, current.symbol(), k)) {\n            return GameResult.WIN; // current player just won\n        }\n        if (board.isFull()) {\n            return GameResult.DRAW;\n        }\n        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;\n        return GameResult.IN_PROGRESS;\n    }\n}',
        },
        {
          kind: "paragraph",
          text: "Notice `makeMove` checks win before draw — a full board on the winning move should report WIN, not DRAW, since the win happened on the same move that filled the board.",
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
            ["Undo the last move", "A natural Command pattern fit (Lesson 8) — wrap each move as a `MoveCommand` with `execute()`/`undo()`, pushed onto a history stack in `Game`. `Board`/`Cell` need an `unset()` counterpart to `set()`."],
            ["3+ players", "`players` is already an array, and `currentPlayerIndex` already cycles modulo its length — this requirement is close to free given how turn order was modeled, not a redesign."],
            ["A different board shape (hexagonal, 3D)", "This would genuinely strain `LineCheckStrategy`'s 2D direction vectors — worth naming as a real limit of this design rather than claiming it's free. A 3D board would need its own `WinningStrategy` implementation with 3D direction vectors, which the `WinningStrategy` interface itself would still comfortably support — only the implementation changes, not the contract."],
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
          question: "\"Your board is N×N — what if rows and columns need different sizes?\"",
          answer:
            "\"Board's constructor would take separate `rows`/`cols` instead of one `size`, and `cellAt` bounds-checking in `LineCheckStrategy.countInDirection` would check each axis against its own bound instead of one shared `size` — a small, contained change, not a redesign, because the win-checking logic already treats row and column bounds as two separate checks rather than assuming they're equal.\"",
        },
        {
          kind: "qa",
          question: "\"Why check only the 4 lines through the last move instead of rescanning the whole board after every move?\"",
          answer:
            "\"Because a win can only ever involve the cell that was just played — rescanning every row, column, and diagonal on the whole board is strictly wasted work confirming something that couldn't have changed. It's also the more scalable choice: full-board rescanning is O(N²) per move, checking 4 lines through one cell is O(N) at worst.\"",
        },
      ],
    },
  ],
  summary:
    "Tic-Tac-Toe's real lesson is generalization: building for N×N and K-in-a-row from the start, rather than hardcoding 3×3's 8 win conditions, is what survives the 'now make it bigger' follow-up every interviewer eventually asks. WinningStrategy checks only the 4 lines through the just-played cell — correct and efficient for any N and K, with zero hardcoded assumptions about board size. Board composes Cells (composition), Game associates with Players and delegates to a WinningStrategy (Strategy, earning its place because win-checking is a genuinely swappable, board-shape-dependent algorithm) — a small design that still cleanly absorbs undo (Command), more players, or a different board shape as separate, contained changes.",
  keyTakeaways: [
    "Generalize to N×N and K-in-a-row from the start — hardcoding 3×3's 8 win conditions is the version that breaks on the near-universal 'make it bigger' interview follow-up.",
    "Check only the 4 lines through the just-played cell after each move, not the whole board — correct for any N/K and strictly less work than a full rescan.",
    "WinningStrategy earns Strategy because win-checking is a genuinely swappable, board-shape-dependent algorithm — not applied by default.",
    "Check win before checking draw on a move that both wins and fills the board — the win should be reported, not a draw.",
    "Undo is a clean Command pattern fit once you need it — but isn't built until a requirement actually asks for it, per Lesson 5's step-6 discipline.",
  ],
  exercise: {
    prompt:
      "A new requirement: instead of alternating turns strictly, the game should support a 'skip a turn' power-up a player can use once per game. Sketch the smallest change to Game.makeMove (or a new method) that supports this without breaking the existing turn-alternation logic for players who never use it.",
    guidance: [
      {
        kind: "list",
        items: [
          "**Add state** — a `skipsRemaining` count per Player (or a boolean `hasUsedSkip`).",
          "**Add behavior** — a new `Game.skipTurn()` method that checks the current player's remaining skips, decrements it, and advances `currentPlayerIndex` — the same advancement line already at the end of `makeMove`, just without placing a symbol first.",
          "**What doesn't change** — no change needed to `WinningStrategy`, `Board`, or `Cell` at all, since skipping a turn never touches the board; it's purely a turn-order concern.",
          "**Why it's this easy** — keeping turn order as its own simple field (`currentPlayerIndex`) rather than folding it into board state paid off here.",
        ],
      },
    ],
  },
};
