#include <Arduino_LSM6DS3.h>

#include <FlashStorage.h>
#include <FlashAsEEPROM.h>

#include <ArduinoMqttClient.h>
#include <WiFiNINA.h>
#include <ArduinoECCX08.h>
#include <Arduino_LSM6DS3.h>

// User configuration
// ------------------------------------------------ 
// MQTT broker, eg. "test.mosquitto.org".
const char mqttBroker[] = "<YOUR_MQTT_BROKER>";
// MQTT port, eg. 1883. 
const int mqttPort = 5332;
// Wifi ssid.
const char wifiSsid[] = "<YOUR_WIFI_SSID>";
// Wifi password.
const char wifiPass[] = "<YOUR_WIFI_PASSWORD>";
// ------------------------------------------------ 

WiFiClient wifiClient;
MqttClient mqttClient(wifiClient);

// The slot to use in the ATECC608A chip.
const int slot = 0;

// Variables to store the deviceId and public key.
String deviceId = "";
byte publicKey[64] = {0};

// Variable to store the MQTT topic.
String topic = "";

// Variable to store accelerometer data
float x, y, z;

void setup() {
  Serial.begin(9600);
  while (!Serial);

  Serial.println("Verifiable IoT data from Arduino");
  Serial.println();

  // Init the ATECC608A crypto chip.
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

  // Connect to the WiFi network.
  initWiFi();

  // Connect to the MQTT broker
  initMqtt();

  // Init the onboard accelerometer
  initIMU();

  // Retrieve the public key for the corresponding slot in the ECC508/ECC608.
  ECCX08.generatePublicKey(slot, publicKey);
  Serial.print("Public key of slot ");
  Serial.print(slot);
  Serial.print(" is:   ");
  printBufferHex(publicKey, sizeof(publicKey));

  // Generate the device id from the public key.
  deviceId = getDeviceId(publicKey);
  Serial.println  ("Device id: " + deviceId);
  topic = "/device/" + deviceId + "/data";
  Serial.print("Topic: ");
  Serial.println(topic);
}

void loop() {
  // Wait until some relevant accelerometer data is available
  readAccelerometer(x,y,z);

  // Build a message using data from the accelerometer.
  IMU.readAcceleration(x, y, z);
  // TODO Sync the RTC using WiFi and get the real epoch. Using a hardcoded one for now.
  String timestamp = "1655543438"; 
  String message = buildMessage(x, y, z, timestamp);

  // Hash the message using sha256.
  byte hash[64] = {0};
  ECCX08.beginSHA256();
  ECCX08.endSHA256((byte*)message.c_str(), message.length(), hash);
  Serial.print("Hash is:   ");
  printBufferHex(hash, sizeof(hash));

  // Sign the message.
  byte signature[64];
  ECCX08.ecSign(slot, hash, signature);
  Serial.print("Signature is ");
  printBufferHex(signature, sizeof(signature));

  // Publish the message over MQTT.
  String mqttMessage = buildSignedMessage(message, signature, sizeof(signature));
  Serial.print("Sending mqtt message: ");
  Serial.println(mqttMessage);
  mqttClient.beginMessage(topic);
  mqttClient.print(mqttMessage);
  mqttClient.endMessage();

  // Wait for a while before sending the next message.
  delay(15000);
}

String printBufferHex(const byte input[], int inputLength) {
  String hexString = "";
  for (int i = 0; i < inputLength; i++) {
    hexString+=String(input[i] >> 4, HEX);
    hexString+=String(input[i] & 0x0f, HEX);
  }
  Serial.println(hexString);
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
void initMqtt()
{
  Serial.print("Attempting to connect to the MQTT broker: ");
  Serial.println(mqttBroker);
  if (!mqttClient.connect(mqttBroker, mqttPort)) {
    Serial.print("MQTT connection failed! Error code = ");
    Serial.println(mqttClient.connectError());
    while (1);
  }
  Serial.println("You're connected to the MQTT broker!");
}

void initIMU()
{
  if (!IMU.begin()) {
      Serial.println("Failed to initialize IMU!");
      while (1);
  }
  
  Serial.print("Accelerometer sample rate = ");
  Serial.print(IMU.accelerationSampleRate());
  Serial.println("Hz");
}

// Gets the device id from the public key.
String getDeviceId(const byte publicKey[64])
{
  byte hash[64] = {0};
  ECCX08.beginSHA256();
  ECCX08.endSHA256(publicKey, 64, hash);
  Serial.print("Hash of public key is:   ");
  printBufferHex(hash, sizeof(hash));
  return (char*)hash;
}

// Wait until some relevant acceleration is detected
// Note that we assume the z axis to be pointing up so it will 
// read 1g by default
void readAccelerometer(float &x, float &y, float &z) {
  bool accelerationDetected;
  // TODO: configure the IMU to wakeup the board only when acceleration 
  // is over a certain threshold, instead of polling.
  while (!accelerationDetected) { 
  delay(1000); 
  if (!IMU.accelerationAvailable()) continue; 
  IMU.readAcceleration(x, y, z);
  if (abs(x) > 0.1 || abs(y) > 0.1 || abs(z - 1) > 0.1)
    accelerationDetected = true;
  }
}

// Constructs a signed message from a message and a signature.
String buildSignedMessage(String message, byte* signature, int signatureSize)
{
  String messageWithSignature = "{\"message\":";
  messageWithSignature += message;
  messageWithSignature += ",\"signature\":\"";
  messageWithSignature += printBufferHex(signature, signatureSize);
  
  // Add some specs about the cryptography used
  messageWithSignature += "\",\"cryptography\":\"ECC\"";
  messageWithSignature += ",\"curve\":\"secp256r1\"";
  messageWithSignature += ",\"hashing\":\"sha256\"";

  // close the message
  messageWithSignature += "}";

  return messageWithSignature;
}

// Builds a data message given x,y,z accelerations and timestamp.
String buildMessage(float x, float y, float z, String timestamp)
{
  Serial.println("Buildong message:");
  String message = "{\"ax\":";
  message += String(x);
  message += ",\"ay\":";
  message += String(y);
  message += ",\"az\":";
  message += String(z);
  message += ",\"timestamp\":";
  message += timestamp;
  message += "}";
  return message;
}