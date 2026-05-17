"use client";
import { useState, useCallback } from "react";
import { showConnect, disconnect } from "@stacks/connect";

export function useStacksWallet() {
  const [stacksAddress, setStacksAddress] = useState<string | null>(null);

  const connectLeather = useCallback(() => {
    showConnect({
      appDetails: {
        name: "SusuChain",
        icon: "/icon.png",
      },
      onFinish: (data) => {
        setStacksAddress(
          data.userSession.loadUserData().profile.stxAddress.mainnet
        );
      },
      onCancel: () => {
        console.log("Leather wallet connection cancelled");
      },
    });
  }, []);

  const disconnectLeather = useCallback(() => {
    disconnect();
    setStacksAddress(null);
  }, []);

  return { stacksAddress, connectLeather, disconnectLeather };
}
