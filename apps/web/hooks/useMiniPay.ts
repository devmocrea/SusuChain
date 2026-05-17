"use client";
import { useEffect, useState } from "react";

export function useMiniPay() {
  const [isMiniPay, setIsMiniPay] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    const detect = async () => {
      if (
        typeof window !== "undefined" &&
        window.ethereum &&
        (window.ethereum as any).isMiniPay
      ) {
        setIsMiniPay(true);
        try {
          const accounts: string[] = await (window.ethereum as any).request({
            method: "eth_requestAccounts",
            params: [],
          });
          if (accounts.length > 0) setAddress(accounts[0]);
        } catch (err) {
          console.error("MiniPay account request failed:", err);
        }
      }
    };
    detect();
  }, []);

  return { isMiniPay, address };
}
