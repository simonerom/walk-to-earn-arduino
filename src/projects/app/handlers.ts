import _ from 'lodash'
import { deviceDataRepository, deviceRepository } from './models'
import { ProjectContext } from '../interface'
import { EthHelper } from "@helpers/index"
import { ETH_ENDPOINT } from '@config/env'
import {sha256, ecrecover, keccak256, stripHexPrefix} from 'ethereumjs-util'
var secp256r1 = require('secp256r1')
const { Op } = require("sequelize");


const ethHelper = new EthHelper(ETH_ENDPOINT)
const web3 = ethHelper.web3
const toBN = web3.utils.toBN

// This handler gets called when a new deviceRegistered event is emitted
// by the deviceRegistry contract
async function onDeviceRegistered(context: ProjectContext, event: any,) {
  if (event)
  {
    // Obtain the device id from the event topics
    const { _deviceId } = event.returnValues;
    const strippedId = stripHexPrefix(_deviceId).toLowerCase();
    console.log("New device registered new device with id: ", strippedId);
    // Ad the device id to the db table of authorized devices
    await deviceRepository.upsert({ device_id: strippedId}) 
    console.log("Device id added to the authorized devices database.\n"); 
  }
}

// This handler gets called when a device owner attempts to claim his rewards
async function onActivityRequested(context: ProjectContext, event: any,) {
  if (event)
  {
    // Obtain the device owner address
    const { _requestId, _userAddress, _deviceId, _fromTime, _toTime } 
      = event.returnValues;
    
    console.log("Activity requested by user: ", _userAddress);
    console.log("Activity requested for device: ", _deviceId);
    console.log("Request id: ", _requestId);
    console.log("From time: ", _fromTime);
    console.log("To time: ", _toTime);

    // TODO: We should just ignore almost-expired requests

    // Process the device data from the db (incomplete!!)
    const { totalSteps, success, error } = 
      await processDataRequest(_deviceId, _fromTime, _toTime); 
    
    console.log("Total steps: ", totalSteps);
    if (!success) { 
      return console.log("[WARNING] " + error); 
    }

    // Call the contract to claim the rewards
    console.log("Calling back the contract...")
     await replyWithActivity(
      context, 
      { 
        _requestId: _requestId,         
        _totalSteps: totalSteps,
        _success: success,
        _error: error
      });
    console.log("[OK] Claim activity reply sent.\n");
  }
}

async function replyWithActivity(context: ProjectContext, replyData: any) {
  const { _requestId, _totalSteps, _success, _error } = replyData;
  
  const contract = context.getContract('WalkToEarn')
  if (!contract) {
    console.log(`contract WalkToEarn not found`)
    return
  }

  const method = contract.methods.claimActivityReply(_requestId, _totalSteps, _success, _error)
  
  let gasLimit: string = ''
  try {
    gasLimit = await method.estimateGas({ from: context.host })
  } catch (e) {
    console.log(e)
    return
  }
  const gasPrice = await web3.eth.getGasPrice();
  const gasFee = toBN(gasLimit).mul(toBN(gasPrice));
  const signedTx = await web3.eth.accounts.signTransaction({
    gas: gasLimit,
    gasPrice,
    to: contract.options.address,
    data: method.encodeABI()
  }, context.privatekey)

  try {
    await web3.eth.sendSignedTransaction(signedTx.rawTransaction || '')
  } catch (e) {
    console.log(e)
  }
}

async function processDataRequest(
  _deviceId: string, _fromTime: string, _toTime: string): 
    Promise<{ totalSteps: number, success: boolean, error: string }> {
  
  let _totalSteps = 0;
  try {
    const deviceData = await deviceDataRepository.findAll({
      attributes: ['steps', 'timestamp'],
      order: [['timestamp', 'ASC']],
      where: {
        device_id: stripHexPrefix(_deviceId).toLowerCase(),
        timestamp: {
          [Op.gte]: parseInt(_fromTime),
          [Op.lte]: parseInt(_toTime)
        }
    }});

    if (deviceData.length <2) { 
      return { 
        totalSteps:0, 
        success:false, 
        error: "W3bStream: No data found" }
    }

    let firstRecord = deviceData[0];
    let lastRecord = deviceData[deviceData.length - 1];
    _totalSteps = lastRecord.steps - firstRecord.steps;

    console.log("Steps records found ", deviceData.length);
  } 
  catch (error) {
    console.log("Error processing data request: ", error);
    return { 
      totalSteps:0, 
      success:false, 
      error: "W3bStream: error processing data request" }
  } 

  return { 
    totalSteps:_totalSteps, 
    success:true, 
    error: "" 
  }
}

// This handler gets called when a new message is received by the mqtt broker
// on a topic of the format specified in project.yaml: "device/<device_id>/message"
async function onMqttData(context: ProjectContext, topic: string, payload: Buffer) {

  console.log("\nReceived a message on topic: ", topic);

  let mqttPayloadObj = eval('(' + payload.toString() + ')');
  
  console.log("Payload: ", JSON.stringify(mqttPayloadObj, null, 2));

  // Verify that the device's public key is registered
  let signerPubKey = await verifyDeviceIdentity(mqttPayloadObj);
  if (!signerPubKey) { return console.log("[WARNING] Device identity check failed. Dropping data.\n"); }
  
  /*
     ... Any custom logic on the data
  */

  // If all good, we store device data in the db
  await storeDeviceData(mqttPayloadObj);
}

// Customize this function based on your device data message model
async function storeDeviceData(mqttPayloadObj: any) {
 
  const deviceData = {
    device_id: mqttPayloadObj.deviceId,
    steps: mqttPayloadObj.message.steps,
    timestamp: mqttPayloadObj.message.timestamp,
    signature: mqttPayloadObj.signature
  }
  await deviceDataRepository.upsert(deviceData);
  console.log("[OK] Data signature verified added to the database.\n");
}

// We assume the device id is the first 20 bytes of the public key
function getDeviceId(publicKey: string) {
  return Buffer.from(publicKey,"hex").slice(0,20).toString('hex').toLowerCase();
}

/* ******* Helper functions ******* */

// Recovers and returns the message signer public key
// Expected fromat for the mqtt payload:
// {
//   "message": {
//     some: "data",
//     someMore: "data"
//   },
//   "signature": <signature(message)>
//   "cryptography": "ECC" | ... // Type of crypto used for signature
//   "curve": "secp256r1" | "secp256k1" | ... // If ECC, what curve?
//   "hash": "sha256" | "keccak256" | ... // type of hash used for signature
// }
async function verifyDeviceIdentity(mqttPayloadObj: any): Promise<string> {
   // Decode the payload in a JSON object
  const messageStr = JSON.stringify(mqttPayloadObj.message)
  const messageHash = mqttPayloadObj.hash === "sha256" 
   ? sha256(Buffer.from(messageStr,"utf8"))
   : keccak256(Buffer.from(messageStr,"utf8"));

  const sigBuffer = mqttPayloadObj.base64Encoding 
    ? Buffer.from(mqttPayloadObj.signature, 'base64')
    : Buffer.from(mqttPayloadObj.signature, 'hex');
  
  var recoveredPubKey_0, recoveredPubKey_1;
  switch (mqttPayloadObj.curve) {
    case "secp256r1": 
      recoveredPubKey_0 = secp256r1.recover(messageHash, sigBuffer, 0, false).toString('hex');
      recoveredPubKey_1 = secp256r1.recover(messageHash, sigBuffer, 1, false).toString('hex');
      break;
    case "secp256k1": 
      recoveredPubKey_0 = '04' + ecrecover(messageHash, 0, sigBuffer.slice(0, 32), sigBuffer.slice(32, 64), 0).toString("hex");
      recoveredPubKey_1 = '04' + ecrecover(messageHash, 1, sigBuffer.slice(0, 32), sigBuffer.slice(32, 64), 0).toString("hex");
      break;
  }

  if (!(recoveredPubKey_0 || recoveredPubKey_1)) { 
    console.log("Invalid message signature"); 
    return ""; 
  };
  
  // Check if the device id is authorized (we assume device id is the first 
  // 20 bytes of the public key)
  let deviceId0 = getDeviceId(recoveredPubKey_0);
  const device_0 = await deviceRepository.findByPk(deviceId0, { raw: true });
  let deviceId1 =  getDeviceId(recoveredPubKey_1);
  const device_1 = await deviceRepository.findByPk(deviceId1);

  const messageHashStr = messageHash.toString('hex');
  const recoveredPubKeyStr = device_0 
    ? recoveredPubKey_0.toString("hex") 
    : recoveredPubKey_1.toString("hex");

  const deviceId = device_0 ? deviceId0 : deviceId1;

  if (!(device_0 || device_1)) {
    console.log(`Device with id ${mqttPayloadObj.deviceId} is not registered.`);
    console.log("Recovered pub keys:");
    console.log(recoveredPubKey_0);
    console.log(recoveredPubKey_1);

    return "";
  }

  console.log(`Message hash is: ${messageHashStr}`)
  console.log(`Signer public key: ${recoveredPubKeyStr}`)
  
  return recoveredPubKeyStr;
}

const handlers = {
  onDeviceRegistered,
  onActivityRequested,
  onMqttData,
}

export default handlers