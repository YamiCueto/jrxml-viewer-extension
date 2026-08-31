# Contributing to JRXML Viewer & Editor

Thank you for your interest in contributing to **JRXML Viewer & Editor**! We welcome contributions of all kinds: bug fixes, new JasperReports elements support, performance improvements, documentation, and automated tests.

This guide outlines our issue-driven Gitflow workflow, development setup, coding standards, and pull request process.

---

## 📋 Table of Contents
- [Issue-Driven Workflow](#issue-driven-workflow)
- [Prerequisites](#prerequisites)
- [Development Setup](#development-setup)
- [Project Architecture](#project-architecture)
- [Available Scripts](#available-scripts)
- [Testing Guidelines](#testing-guidelines)
- [Coding Standards](#coding-standards)
- [Branching & Gitflow](#branching--gitflow)
- [Commit Message Conventions](#commit-message-conventions)
- [Pull Request Process](#pull-request-process)

---

## 🎯 Issue-Driven Workflow

All development in this repository follows a strict **Issue-Driven Gitflow** model:

```text
1. GitHub Issue (#N)
        ↓
2. Feature/Fix/Chore Branch (from main)
        ↓
3. Code + Unit & E2E Tests + Lint
        ↓
4. Push Branch to Origin
        ↓
5. Pull Request (PR → main) with "Fixes #N"
        ↓
6. CI Validation + Review
        ↓
7. Merge to main & Issue #N automatically closes
```

- **Every change starts with an Issue**: Before writing code, ensure an issue exists (or create one using our issue templates) describing the problem, scope, and acceptance criteria.
- **Single responsibility**: Each PR should address exactly one issue.

---

## 📜 Prerequisites

- **Node.js**: `>= 20.x` (LTS recommended)
- **npm**: `>= 9.x`
- **VS Code**: `1.85.0` or later

---

## 🛠️ Development Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/jrxml-viewer-extension.git
   cd jrxml-viewer-extension
   ```

2. **Install exact dependencies:**
   ```bash
   npm ci
   ```

3. **Compile TypeScript (both extension source and webview media):**
   ```bash
   npm run compile
   ```

4. **Launch Extension in Development Mode:**
   - Open the workspace in VS Code.
   - Press `F5` to start a new **Extension Development Host** instance.
   - Open any sample `.jrxml` file (e.g. from `tests/fixtures/complex-report.jrxml` or `tests/fixtures/barcode-report.jrxml`) to test custom editors, canvas rendering, zoom controls, and sidebars.

---

## 🏛️ Project Architecture

```text
src/
├── model/        # Strongly-typed AST and XML parser (JrxmlDocument)
├── layout/       # Multi-layer layout engine & geometry calculations
├── render/       # SVG charts, barcode generators, and canvas renderer
│   ├── barcodes/ # Pure-math SVG generators (QR Code, Code 128, EAN-13, Code 39)
│   └── charts/   # Pure SVG statistical charts (Bar, Pie, Line)
├── expression/   # Lexical expression evaluator, aggregations, and preview dataset
├── style/        # Cascading styles, conditional styles, box pens, and inheritance
├── editing/      # AST-driven element mutations and XML serializer
├── export/       # Standalone high-fidelity self-contained HTML exporter
└── extension.ts  # Extension activation, commands, and provider wiring

media/            # Webview client-side scripts (preview.ts) and styling (preview.css)
tests/            # Deterministic unit test suites (12 suites, 150+ tests) and Playwright E2E
├── fixtures/     # Sample JRXML files for testing
├── e2e/          # Playwright test specs and workbench harness
└── [suites]/     # Domain-specific unit test runners
```

---

## ⚡ Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run compile` | Compiles extension source and webview media (`tsc -p ./ && tsc -p ./tsconfig.media.json`) |
| `npm run compile:src` | Compiles extension backend source only |
| `npm run compile:media` | Compiles webview client script (`media/preview.ts`) |
| `npm run watch` | Runs TypeScript compiler in watch mode for development |
| `npm test` | Runs all 12 deterministic test suites (150+ tests) |
| `npm run test:e2e` | Runs Playwright visual evidence generator and captures screenshots |
| `npx playwright test` | Runs Playwright browser integration specs |
| `npm run lint` | Runs ESLint over TypeScript source files (`eslint src --ext ts`) |
| `npm run package` | Builds clean `.vsix` package locally |

---

## 🧪 Testing Guidelines

All PRs must maintain **100% passing tests** with 0 regressions.

Run the full test suite before committing:
```bash
npm run compile
npm test
npm run lint
npx playwright test
```

### Writing New Tests
- Place unit tests in the appropriate domain folder: `tests/<module>/run-<module>-tests.js`.
- Use pure, deterministic assertions with `assert`.
- Ensure tests run cleanly in standalone Node.js.
- For new elements or layout changes, verify round-trip serialization preservation.

---

## 📐 Coding Standards

- **Strict TypeScript**: Maintain strong typing. Avoid `any` where AST model types (`JrxmlElement`, `JrxmlBand`, `JrxmlStyle`, etc.) exist.
- **Zero Comments in Source Code**: Do not include explanatory, transitional, or commented-out code in TypeScript or JavaScript files. Code must be clean and self-documenting.
- **Zero Heavy Runtime Dependencies**: Visual elements (charts, barcodes, geometries) must be rendered using pure mathematical SVG generation without adding external NPM runtime libraries.
- **Round-Trip XML Integrity**: Modifications to the AST must preserve non-edited attributes, custom tags, CDATA expressions, and comments.

---

## 🌿 Branching & Gitflow

Always branch off the latest `main`:

```bash
git checkout main
git pull origin main
git checkout -b <type>/<descriptive-name>
```

### Branch Naming Conventions:
- `feat/<feature-name>`: New functionality or JasperReports component support
- `fix/<bug-name>`: Bug fixes and edge-case corrections
- `chore/<task-name>`: Tooling, dependencies, or configuration updates
- `docs/<doc-name>`: Documentation, guides, or README updates
- `test/<test-name>`: Adding or improving test suites

---

## 💬 Commit Message Conventions

We adhere to [Conventional Commits](https://www.conventionalcommits.org/):

- `feat(scope): add support for X`
- `fix(scope): resolve issue with Y`
- `docs(scope): update Z guide`
- `test(scope): add tests for W`
- `chore(scope): update build script`

---

## 🚀 Pull Request Process

1. **Verify all checks locally:**
   ```bash
   npm run compile && npm test && npm run lint
   ```
2. **Push your branch to GitHub:**
   ```bash
   git push -u origin <type>/<descriptive-name>
   ```
3. **Open a Pull Request targeting `main`:**
   - Fill in the PR template completely.
   - Reference the related issue using `Fixes #<issue-number>`.
4. **CI Workflow:**
   - GitHub Actions will run `npm run compile`, `npm test`, and `npm run lint`.
5. **Code Review:**
   - Address any reviewer feedback on the branch.
   - Once approved and CI passes, the PR will be merged into `main` and the linked issue will be closed automatically.
