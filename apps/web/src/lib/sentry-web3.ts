import * as Sentry from "@sentry/nextjs";

interface Web3Context {
  chain: "celo" | "stacks";
  contractAddress: string;
  functionName: string;
  arguments?: any[];
  account?: string;
  value?: string;
}

/**
 * Captures custom Web3/smart contract exception monitoring details inside Sentry.
 * Ensures all simulation parameters and transaction reverts are recorded with high context.
 */
export function captureWeb3Error(error: any, context: Web3Context) {
  Sentry.withScope((scope) => {
    scope.setLevel("error");
    scope.setTag("blockchain.chain", context.chain);
    scope.setTag("blockchain.contract", context.contractAddress);
    scope.setTag("blockchain.function", context.functionName);

    if (context.account) {
      scope.setUser({ id: context.account });
    }

    scope.setContext("web3_details", {
      contractAddress: context.contractAddress,
      functionName: context.functionName,
      arguments: context.arguments ? JSON.parse(JSON.stringify(context.arguments, (_, v) => typeof v === "bigint" ? v.toString() : v)) : [],
      value: context.value || "0",
      rawError: {
        message: error?.message || String(error),
        name: error?.name || "UnknownError",
        stack: error?.stack,
        code: error?.code,
      }
    });

    // Detect Viem contract revert details
    if (error?.shortMessage) {
      scope.setExtra("revert_short_message", error.shortMessage);
    }
    if (error?.details) {
      scope.setExtra("revert_details", error.details);
    }
    if (error?.reason) {
      scope.setExtra("revert_reason", error.reason);
    }

    Sentry.captureException(error);
  });
}
