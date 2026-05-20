# Sentry Integration

This workspace contains the configuration and integration details for Sentry exception monitoring inside `apps/web`.

## Features
- **Global Error Boundaries**: Captures uncaught client-side and server-side exceptions using Next.js 14 App Router `error.tsx` boundary.
- **Web3 / Contract Exception Logging**: Deep contextual logging of smart contract interaction failures, transaction reverts, and wallet signature rejections.
- **Source Map Uploads**: Integrated with `withSentryConfig` in `next.config.js` to automatically upload source maps for clean stack traces in production without exposing maps to users.

## Configured Files
- `sentry.client.config.ts` - Client-side Sentry initialization.
- `sentry.server.config.ts` - Server-side Sentry initialization.
- `sentry.edge.config.ts` - Edge and middleware Sentry initialization.
- `next.config.js` - Sentry Webpack and routing configuration wrapper.
- `src/app/error.tsx` - Root-level React error boundary displaying a clean fallback interface while submitting errors.
- `src/lib/sentry-web3.ts` - Specialized utility function (`captureWeb3Error`) mapping smart contract, ABI, and simulation contexts.

## Usage
For normal code, standard uncaught errors are reported automatically.
For Web3 and wallet transactions, wrap operations in `try-catch` blocks and invoke:
```typescript
import { captureWeb3Error } from "@/lib/sentry-web3";

try {
  // contract call or simulation
} catch (error) {
  captureWeb3Error(error, {
    chain: "celo",
    contractAddress: "...",
    functionName: "...",
    arguments: [...],
    account: "...",
  });
}
```

## Production Credentials
Configure the following in your deployment environment or server keys:
```env
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
SENTRY_AUTH_TOKEN=your_sentry_auth_token_here
```
