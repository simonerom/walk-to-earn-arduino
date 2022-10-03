#include <FlashStorage.h>
#include <FlashAsEEPROM.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <WiFiNINA.h>

// Configure your Wifi and MQTT endpoint
#include "secrets.h"

// Send messages with the MQTT protocol
#include <ArduinoMqttClient.h>

// Use accelerometer as a pedometer
#include <SparkFunLSM6DS3.h>
#include "Wire.h"
#include "SPI.h"

// Use the integrated secure crypto chip
#include <ArduinoECCX08.h>


LSM6DS3Core myIMU(I2C_MODE, 0x6A);

WiFiClient wifiClient;

MqttClient mqttClient(wifiClient);

WiFiUDP ntpUDP;

NTPClient timeClient(ntpUDP);

// The slot to use in the ATECC608A secure chip.
const int slot = 0;

// For the device Id we picked the first 20 bytes of the ATECC608 public key
// but it can be anything. Just these are easier to manage in Solidity using
// the "address" type
String deviceId = "04b687e298ad52eec4fe32b27af45247f3659062";

// Store the public key of the secure chip
byte publicKey[64] = {0};

// The MQTT topic where this device is supposed to publish data.
String topic = "";

// Stores the total steps taken, it's permanently stored in flash on every change
int steps;

// Variable synced with the steps provided by the IMU (i.e. since device power on)
int IMUSteps;

// We store the accumulated steps in flash on every steps read.
FlashStorage(steps_storage, int);


void setup() {
  // Let's use the led to signal when the device is communicating
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);

  Serial.begin(9600);
  while (!Serial);

  Serial.println(".....::::: APP STARTED :::::......");
  Serial.println("Verifiable pedometer with Arduino nano 33 IoT");

  Serial.println("Initialize the pedometerr...");
  if (!setupIMU()) {
    Serial.println("Failed to initialize the pedometer.");
    while(1);
  }

  Serial.print("Read total steps from flash...");
  steps = steps_storage.read();
  Serial.println(steps); 
  
  Serial.println("Initialize the secure chip...");
  if (!ECCX08.begin()) {
    Serial.println("Failed to communicate with ECC508/ECC608!");
    while (1);
  }

  // Verify the crypto chip is locked (ie. configured.).
  if (!ECCX08.locked()) {
    Serial.println("The ECC508/ECC608 is not locked!");
    Serial.println("ECC508/ECC608 needs to be configured and locked before proceeding");
    while (1);
  }

  Serial.print("Connecting to wifi: ");
  Serial.println(wifiSsid);
  initWiFi();

  Serial.print("Syncing time...");
  timeClient.begin();
  timeClient.update();
  Serial.print(timeClient.getFormattedTime() + "- ");
  Serial.println(timeClient.getEpochTime());


  Serial.print("Connecting to the MQTT broker on " + String(mqttBroker) + ":");
  Serial.print(mqttPort);
  if (!initMqtt()) {
    Serial.println("Failed to connect to the MQTT broker.");
    while (1);
  }

  // Retrieve the public key for the corresponding slot in the ECC508/ECC608.
  ECCX08.generatePublicKey(slot, publicKey);
  String pubKey = BufferHexToStr(publicKey, sizeof(publicKey));
  
  Serial.print("Device's public key: " + pubKey);
  
  topic = "/device/" + pubKey + "/data";
  Serial.print("MQTT Topic: " + topic);
}

void loop() {
  // Update steps taken
  digitalWrite(LED_BUILTIN, LOW); 
  while (!readSteps()) { 
     delay(3000);
  };

  delay(3000);
  readSteps();

  digitalWrite(LED_BUILTIN, HIGH); 

  // Build a message using data from the accelerometer.
  Serial.println("\n---- NEW MESSAGE ----");
  
  // Get timestamp from Internet
  String timestamp = String(timeClient.getEpochTime()); 
  // Build the data message { "steps": "123", "timestamp": "12345678" }
  String message = buildMessage(steps, timestamp);

  // Hash the message using sha256.
  byte hash[32] = {0};
  ECCX08.beginSHA256();
  ECCX08.endSHA256((byte*)message.c_str(), message.length(), hash);
  Serial.println("Message hash is: "+ BufferHexToStr(hash, sizeof(hash)));

  // Sign the message.
  byte signature[64];
  ECCX08.ecSign(slot, hash, signature);
  Serial.println("Signature is " + BufferHexToStr(signature, sizeof(signature)));

  // Build the full message including digital signature
  String mqttMessage = buildSignedMessage(message, signature, sizeof(signature));
  // Sending the message over MQTT protocol
  Serial.print("Sending mqtt message: ");
  Serial.println(mqttMessage);
  mqttClient.beginMessage(topic);
  mqttClient.print(mqttMessage);
  mqttClient.endMessage();

  delay(3000);
  
  //while(1);
}

String BufferHexToStr(const byte input[], int inputLength) {
  String hexString = "";
  for (int i = 0; i < inputLength; i++) {
    hexString+=String(input[i] >> 4, HEX);
    hexString+=String(input[i] & 0x0f, HEX);
  }
  return hexString;
}

// Connects to the wifi network.
void initWiFi() 
{
    #if defined(ESP8266) || defined(ESP32)
    WiFi.mode(WIFI_STA);
    #endif
    WiFi.begin(wifiSsid, wifiPass);
    Serial.print(F("Connecting to WiFi .."));
    while (WiFi.status() != WL_CONNECTED) {
        Serial.print('.');
        delay(1000);
    }
    Serial.println(F("\r\nConnected. IP: "));
    Serial.println(WiFi.localIP());
}

// Connects to the MQTT broker.
bool initMqtt()
{
  if (!mqttClient.connect(mqttBroker, mqttPort)) {
    Serial.print("MQTT connection failed! Error code = ");
    Serial.println(mqttClient.connectError());
    return false;
  }
  Serial.println("OK");
  return true;
}

bool readSteps() {
  uint8_t readDataByte = 0;
  int stepsTaken;
  
  // Read the number of steps stored in the pedometer (16bit value by two 8bit operations)
  myIMU.readRegister(&readDataByte, LSM6DS3_ACC_GYRO_STEP_COUNTER_H);
  stepsTaken = ((uint16_t)readDataByte) << 8;
  
  myIMU.readRegister(&readDataByte, LSM6DS3_ACC_GYRO_STEP_COUNTER_L);
  stepsTaken |= readDataByte;

  if (stepsTaken == IMUSteps) return false;
  
  steps += (stepsTaken - IMUSteps);
  IMUSteps = stepsTaken;

  // Store current total steps in ase of power off 
  steps_storage.write(steps);
  return true;
}


// Constructs a signed message from a message and a signature.
String buildSignedMessage(String message, byte* signature, int signatureSize)
{
  String messageWithSignature = "{\"message\":";
  messageWithSignature += message;
  messageWithSignature += ",\"signature\":\"";
  messageWithSignature += BufferHexToStr(signature, signatureSize);

  /* Add some device details like S/N, IMEI etc... */
  messageWithSignature += "\",\"deviceId\":\"";
  messageWithSignature += deviceId;
  
  // Add some specs about the cryptography used
  messageWithSignature += "\",\"cryptography\":\"ECC\"";
  messageWithSignature += ",\"curve\":\"secp256r1\"";
  messageWithSignature += ",\"hash\":\"sha256\"";

  // close the message
  messageWithSignature += "}";

  return messageWithSignature;
}

// Builds a data message given steps taken and timestamp.
String buildMessage(int steps, String timestamp)
{
  Serial.println("Building message:");
  String message = "{\"steps\":";
  message += String(steps);
  message += ",\"timestamp\":";
  message += timestamp;
  message += "}";
  return message;
}

bool setupIMU()
{
  //Call .beginCore() to configure the IMU
  if( myIMU.beginCore() != 0 )
  {
    Serial.println("Error at beginCore() configure the IMU.");
    return false;
  }

  //Error accumulation variable
  uint8_t errorAccumulator = 0;

  uint8_t dataToWrite = 0;  //Temporary variable

  //Setup the accelerometer******************************
  dataToWrite = 0; //Start Fresh!
  dataToWrite |= LSM6DS3_ACC_GYRO_BW_XL_200Hz;
  dataToWrite |= LSM6DS3_ACC_GYRO_FS_XL_2g;
  dataToWrite |= LSM6DS3_ACC_GYRO_ODR_XL_26Hz;

  // //Now, write the patched together data
  errorAccumulator += myIMU.writeRegister(LSM6DS3_ACC_GYRO_CTRL1_XL, dataToWrite);

  //Set the ODR bit
  errorAccumulator += myIMU.readRegister(&dataToWrite, LSM6DS3_ACC_GYRO_CTRL4_C);
  dataToWrite &= ~((uint8_t)LSM6DS3_ACC_GYRO_BW_SCAL_ODR_ENABLED);

  // Enable embedded functions -- ALSO clears the pdeo step count
  errorAccumulator += myIMU.writeRegister(LSM6DS3_ACC_GYRO_CTRL10_C, 0x3E);
  // Enable pedometer algorithm
  errorAccumulator += myIMU.writeRegister(LSM6DS3_ACC_GYRO_TAP_CFG1, 0x40);
  // Step Detector interrupt driven to INT1 pin
  errorAccumulator += myIMU.writeRegister( LSM6DS3_ACC_GYRO_INT1_CTRL, 0x10 );
  
  if( errorAccumulator )
  {
    Serial.println("Problem configuring the IMU.");
    return false;
  }
    
  Serial.println("IMU OK");
  return true;  
}
