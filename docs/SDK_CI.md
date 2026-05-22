# GitHub Actions CI Workflow for SDK Build Checks

This document details the architectural design and setup of the Continuous Integration (CI) pipeline configured to automatically validate the SDK build.

## Requirements

1. **Automation**: Run verification checks automatically on every pull request targeting the `main` branch.
2. **Path Filtering**: Trigger only when code under `packages/sdk` or the workflow configuration itself changes.
3. **Correctness**: Build the SDK using Node.js and the designated package manager (`pnpm`).
4. **Performance**: Utilize package manager cache configurations to minimize build and execution latency.

## Architecture

- **CI Runner**: `ubuntu-latest`
- **Node.js Version**: Defined in configuration to match workspace specification.
- **Package Manager**: `pnpm` (configured with lockfile checking and dependency cache store restoration).
- **Execution Script**: `pnpm --filter susuchain-sdk build`
