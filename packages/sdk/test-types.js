const fs = require("fs");
const path = require("path");

const dtsPath = path.join(__dirname, "dist/index.d.ts");
if (!fs.existsSync(dtsPath)) {
  throw new Error("Type declaration file index.d.ts is missing!");
}

console.log("Declaration files verified successfully.");
