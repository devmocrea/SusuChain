const { SUSUCHAIN_CELO_ADDRESS, STACKS_CONTRACT_NAME } = require("./dist/index.cjs");

if (SUSUCHAIN_CELO_ADDRESS !== "0x20B421Db767D3496E4489Db5C3122C1fD4625525") {
  throw new Error("Invalid Celo contract address exported in CommonJS module");
}
if (STACKS_CONTRACT_NAME !== "susuchain") {
  throw new Error("Invalid Stacks contract name exported in CommonJS module");
}

console.log("CommonJS exports validated successfully.");
