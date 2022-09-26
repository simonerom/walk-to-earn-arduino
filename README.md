# MachineFi - Getting started

Get started with a minimal MachineFi architecture including an MQTT broker, Postgres database, Hasura engine and a basic Layer-2 service to implement the data logic based on data received from devices and blockchain smart contracts that manage the authorization and tokenomics part. A simple data simulator script is also included to facilitate prototyping.  

**Note:** ⚠️ this is only boilerplate code to facilitate MachineFi Dapps prototyping. However, it's not intended for production applications as this architecture is not scalable or composable.  
A full tutorial is available at https://developers.iotex.io/posts/deploy-a-machinefi-dapp.  

Please stay tuned on next releases of the IoTeX MachineFi architecture.  

## Requirements

- NodeJS: tested using version 14
- Python 3
- Npm
- Docker and docker-compose

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

Edit `src/projects/app/project.yaml` and change `startHeight` and `DataSourceRegistry` to match your contract details.  

Register a device:  
```shell
cd blockchain
npm install
npx hardhat registerDevice --deviceaddress <DEVICE_ADDRESS> --contractaddress <CONTRACT_ADDRESS> --network <NETWORK>
```

Run the simulator:  
```shell
cd simulator
python3 simulator.py
```

Build the data layer app and initialize the database:  
```shell
npm run build
npm run initdb
```

Start the data layer app:  
```shell
npm run app
```

## Modifying the app

You can monitor other contracts just by adding them to `src/projects/app/project.yaml`. For each contract, you should define your event handlers based on your application.  
Edit `handlers.ts` to add additional handlers for contract events and MQTT data received events.  
You can add more tables to the database by modifying the files inside `src/project/app/models`.  

## Debugging in VSCode

Open the folder in VS Code and use the provided launch configuration to launch the app in debug mode.  
