import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const SusuChainModule = buildModule("SusuChainModule", (m) => {
  const susuChain = m.contract("SusuChain");
  return { susuChain };
});

export default SusuChainModule;
