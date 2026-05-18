"use client";
import { useState, useCallback } from "react";
import { connect, disconnect } from "@stacks/connect";

export function useStacksWallet() {
  const [stacksAddress, setStacksAddress] = useState<string | null>(null);

  const connectLeather = useCallback(async () => {
    try {
      const response = await connect();
      if (response && response.addresses) {
        const stxAddr = response.addresses.find(
          (a: any) => a.symbol === "STX"
        );
        if (stxAddr) {
          setStacksAddress(stxAddr.address);
        }
      }
    } catch (err) {
      console.error("Leather wallet connection failed:", err);
    }
  }, []);

  const disconnectLeather = useCallback(() => {
    disconnect();
    setStacksAddress(null);
  }, []);

  return { stacksAddress, connectLeather, disconnectLeather };
}
