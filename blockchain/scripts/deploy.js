async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  let balanceRau = await deployer.getBalance();
  let balanceIOTX = balanceRau / Math.pow(10,18);
  console.log("Account balance:", balanceIOTX, " IOTX");

  // DeviceBinding Contract
  const DeviceBinding = await ethers.getContractFactory("DeviceBinding");
  console.log("\nDeploying DeviceBinding contract");
  const deviceBinding = await DeviceBinding.deploy();

  console.log("DeviceBinding Contract")
  console.log("address:", deviceBinding.address);
  console.log("block:", deviceBinding.deployTransaction.blockNumber);

  // DevicesRegistry Contract
  const DevicesRegistry = await ethers.getContractFactory("DevicesRegistry");
  console.log("\nDeploying DevicesRegistry contract");
  const devicesRegistry = await DevicesRegistry.deploy();

  console.log("DevicesRegistry Contract")
  console.log("address:", devicesRegistry.address);
  console.log("block:", devicesRegistry.deployTransaction.blockNumber);

  // STP Rewards token
  const StepToken = await ethers.getContractFactory("StepToken");
  console.log("\nDeploying StepToken contract");
  const stepToken = await StepToken.deploy();

  console.log("StepToken Contract")
  console.log("address:", stepToken.address);
  console.log("block:", stepToken.deployTransaction.blockNumber);

  // WalkToEarn Contract
  const WalkToEarn = await ethers.getContractFactory("WalkToEarn");
  console.log("\nDeploying WalkToEarn contract");
  const walkToEarn = await WalkToEarn.deploy(deviceBinding.address, stepToken.address);

  console.log("WalkToEarn Contract")
  console.log("address:", walkToEarn.address);
  console.log("block:", walkToEarn.deployTransaction.blockNumber);

  console.log("Funding the WalkToEran contract");
  await stepToken.transfer(walkToEarn.address, await stepToken.totalSupply());
  let b = await walkToEarn.getBalance();
  console.log("Balance: ", b, " STP");
  console.log("\n");
  console.log("************* NEXT STEPS **************")
  console.log("* 1. update W3bStream ABIs            *")
  console.log("* 2. configure project.yaml           *")
  console.log("* 3. npm run build                    *")
  console.log("* 4. node dist/projects/app/initdb.js *")
  console.log("***************************************")
  console.log("* Nr. 4 is always required when       *")
  console.log("* editing project.yaml or ABI files   *")
  console.log("***************************************")

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });