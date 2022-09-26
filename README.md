# Walk To Earn Workshop 
## Requirements

- NodeJS: tested using version 14
- Python 3
- Npm
- Docker and docker-compose
- psql (Postgres command line client)

## Running the app

Open a terminal on the directory where you have cloned this repository.  
Install npm packages:  
```shell
npm install
```

Setup your environment variables. This can be done using an `.env` file. Copy the provided template to run use the defaults:  
```shell
cp .env.template .env
```

Launch the services using docker-compose:  
```shell
docker-compose up
```

Create the database:  
```shell
./create-db.sh
```

Deploy the contracts:  
```shell
cd blockchain
npm install
echo IOTEX_PRIVATE_KEY=<YOUR_PRIVATE_KEY> > .env
npx hardhat run scripts/deploy.js --network <NETWORK>
```
Save the output to `otput.txt` and import the STEP Token contract in Metamask.

Edit `src/projects/app/project.yaml` and 
1. Input the same private key you used to deploy the contracts above
2. change `startHeight` with the height you deployed deviceRegistry.sol
3. Update contract addresses with those you deployed

Register a device:  
```shell
# Update the deviceId and registryContract address accordingly to your device and deployment
npx hardhat registerDevice --deviceid 04b687e298ad52eec4fe32b27af45247f3659062 --registrycontract 3828fC74E1c4C57E353AB99FC5B3fF2A89ef6720  --network testnet
```

Do some steps activity moving the device...

Build the W3bstream app and initialize the database:  
```shell
npm run build
npm run initdb
```

Start W3bstream:  
```shell
npm run app
```


Bind a device to the owner's wallet to receive the rewards:  
```shell
cd blockchain
# Update the deviceId and bindingContract address and owner addressaccordingly to your device, deployment and metamask account
npx hardhat bindDevice --deviceid 04b687e298ad52eec4fe32b27af45247f3659062 --owneraddress 0x169dc1Cfc4Fd15ed5276B12D6c10CE65fBef0D11 --contractaddress 0x242688423D4DDA708642e4b32Ab72a5b23b7D86f  --network testnet
```

Claim steps rewards from W3bstream
```
# Update deviceid with your device id and contractaddress with your WalkToEarn contract address
npx hardhat claimActivityRequest --deviceid 04b687e298ad52eec4fe32b27af45247f3659062 --contractaddress 0x401677815F75026C2328E723202983D2232671c7 --network testnet
```

Withdraw your STP rewards to your metamask account
```
npx hardhat claimRewards --owneraddress 0x169dc1Cfc4Fd15ed5276B12D6c10CE65fBef0D11 --contractaddress 0x401677815F75026C2328E723202983D2232671c7 --network testnet
```

## Debugging in VSCode

Open the folder in VS Code and use the provided launch configuration to launch the app in debug mode.  
