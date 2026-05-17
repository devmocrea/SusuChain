import SusuChainJSON from "./SusuChainABI.json";

export const SUSUCHAIN_CELO_ABI = SusuChainJSON.abi;
export const SUSUCHAIN_CELO_ADDRESS =
  process.env.NEXT_PUBLIC_SUSUCHAIN_CELO_ADDRESS as `0x${string}`;
