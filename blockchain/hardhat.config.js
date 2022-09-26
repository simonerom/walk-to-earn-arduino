require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-web3");
require('dotenv').config()
const fs = require('fs');
 
const IOTEX_PRIVATE_KEY = process.env.IOTEX_PRIVATE_KEY;
 
task("registerDevice", "Authorize a new device by adding it to the DevicesRegistry contract")
  .addParam("deviceid", "The device id (can be anything of the size of an EVM address)")
  .addParam("registrycontract", "The DevicesRegistry contract address.")
  .setAction(async ({deviceid,registrycontract}) => {
    console.log("Registering device:", deviceid, ", to registry contract: ", registrycontract);
 
    const DevicesRegistry = await ethers.getContractFactory("DevicesRegistry");
    const devicesRegistry = await DevicesRegistry.attach(registrycontract);
    let ret = await devicesRegistry.registerDevice(deviceid);
    console.log ("registerDevice:", ret);
  });
 
task("bindDevice", "Binding device to an owner's account")
  .addParam("deviceid", "The device id")
  .addParam("owneraddress", "The device owner address.")
  .addParam("contractaddress", "The DevicesRegistry contract address.")
  .setAction(async ({deviceid,owneraddress, contractaddress}) => {
    console.log("Binding device:", deviceid, ",to owner: ", owneraddress);
 
    const DeviceBinding = await ethers.getContractFactory("DeviceBinding");
    const deviceBinding = await DeviceBinding.attach(contractaddress);
    let ret = await deviceBinding.bindDevice(deviceid, owneraddress );
    console.log ("bindingDevice:", ret);
  });
 
  task("claimActivityRequest", "Query W3bStream for my activity")
  .addParam("deviceid", "The device to request activity for. Must be owned by the caller..")
  .addParam("contractaddress", "The WalkToEarn contract address.")
  .setAction(async ({deviceid, contractaddress}) => {
    console.log("Requesting walking activity");
 
    const WalkToEarn = await ethers.getContractFactory("WalkToEarn");
    const walkToEarn = await WalkToEarn.attach(contractaddress);
    let ret = await walkToEarn.claimActivityRequest(deviceid);
    console.log ("claimRewards:", ret);
  });
 
  task("claimRewards", "Claim rewards for a device owner")
  .addParam("owneraddress", "The device owner address.")
  .addParam("contractaddress", "The WalkToEarn contract address.")
  .setAction(async ({owneraddress, contractaddress}) => {
    console.log("Claiming rewards for:", owneraddress,);
 
    const WalkToEarn = await ethers.getContractFactory("WalkToEarn");
    const walkToEarn = await WalkToEarn.attach(contractaddress);
    let ret = await walkToEarn.claimRewards();
    console.log ("claimRewards:", ret);
  });
 
  task("getUserSteps", "Chek the steps of a user")
  .addParam("owneraddress", "The device owner address.")
  .addParam("contractaddress", "The WalkToEarn contract address.")
  .setAction(async ({owneraddress, contractaddress}) => {
    console.log("Querying steps for user:", owneraddress);
 
    const WalkToEarn = await ethers.getContractFactory("WalkToEarn");
    const walkToEarn = await WalkToEarn.attach(contractaddress);
    let ret = await walkToEarn.getUserSteps(owneraddress);
    console.log ("STEPS:", ret);
  });
 
 
module.exports = {
  solidity: "0.8.4",
  networks: {
    hardhat: {
      gas: 8500000,
    },
    testnet: {
      // These are the official IoTeX endpoints to be used by Ethereum clients
      // Testnet https://babel-api.testnet.iotex.io
      // Mainnet https://babel-api.mainnet.iotex.io
      url: `https://babel-api.testnet.iotex.io`,
 
      // Input your Metamask testnet account private key here
      accounts: [`${IOTEX_PRIVATE_KEY}`],
    },
  },
}; 