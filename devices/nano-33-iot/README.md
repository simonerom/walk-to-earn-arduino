# Verifiable data using Arduino Nano 33 IoT

A simple sketch that shows hows to send verifiable data using the Arduino Nano 33 IoT board.  

## Usage

### Install the dependencies

Install the following libraries using the Arduino library manager:  

- ArduinoMqttClient
- FlashStorage
- WiFiNINA
- ArduinoECCX08
- IoTeX-blockchain-client

### Configure the ATECC08 crypto chip

The ATECC608A needs to be configured and locked before it can be used.  
The [ArduinoECCX08 library](https://github.com/arduino-libraries/ArduinoECCX08) provides a [sketch that can be used to configure the chip](https://github.com/arduino-libraries/ArduinoECCX08/blob/master/examples/Tools/ECCX08CSR/ECCX08CSR.ino).  
In order to configure the chip, flash the [ECCX08CSR.ino](https://github.com/arduino-libraries/ArduinoECCX08/blob/master/examples/Tools/ECCX08CSR/ECCX08CSR.ino) sketch and follow the steps shown in the serial monitor. At the end, the device will produce a CSR (Certificate signing request). It is recommended to save this CSR for future use, but for the purposes of this example we will not be using certificates.  

### Send verifiable data

You can use the provided *verifiableData.ino* example sketch to send some dummy data to the data layer application over MQTT.  
You will need to replace the values inside the `User configuration` piece at the top of the sketch to suit your environment.  
Once you have done this, flash and run the sketch. By default, it will sign and send an MQTT message with a random heart rate value.  
The message will be sent to the topic `device/<deviceId>/data`.  
