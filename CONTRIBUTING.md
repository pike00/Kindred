# Contributing to Kindred

First off, thank you for considering contributing to Kindred! We appreciate your time and effort in helping build a better personal CRM.

## Development Environment

We use Docker Compose and [`just`](https://just.systems/) as a command runner for development.

1. **Start the dev environment:**
   Bring up the full worktree stack (API, database, Redis, Meilisearch, and frontend dev server) by running:
   ```bash
   just dev
   ```

2. **Stop the dev environment:**
   ```bash
   just down
   ```

## Running Tests

Tests are integrated with our `just` runner for ease of use.

- **Backend tests:**
  ```bash
  just test-backend
  ```
- **Frontend tests:**
  ```bash
  just test-frontend
  ```
- **E2E tests (Puppeteer):**
  ```bash
  just test-e2e
  ```
- **Run all tests:**
  ```bash
  just test-all
  ```

## Code Style

To keep the codebase clean and consistent, please ensure your code follows these formatting standards:

- **Python:** We use [ruff](https://docs.astral.sh/ruff/) and [black](https://github.com/psf/black) expectations.
- **JS/TS:** We use [prettier](https://prettier.io/) expectations.

Ensure your code is properly formatted before opening a pull request.

## Pull Request Process

1. **Fork the repository** to your own GitHub account.
2. **Create a new branch** for your feature or bugfix (e.g., `git checkout -b feature/awesome-new-thing`).
3. **Commit your changes** with clear and descriptive commit messages.
4. **Push your branch** to your fork.
5. **Open a Pull Request** against the `main` branch of the Kindred repository.

## Reporting Issues and Feature Requests

If you find a bug or have a suggestion for a new feature, please open an issue on GitHub.
Include as much detail as possible, such as steps to reproduce a bug, expected behavior, and any relevant context or screenshots.

Welcome to the Kindred community! We look forward to your contributions.
