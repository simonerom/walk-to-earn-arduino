# W3bstream data source simulator

Simulates a w3bstream heart rate monitor data source.  
It sends a message periodically with randomly generated values to the MQTT broker.  

Here's an example of some data published by the simulator:

```bash
mosquitto_sub -t '#' -v
/device/0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A/data {"message": {"address": "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A", "heartRate": 77.8, "atRest": false, "timestamp": 1651168777}, "signature": "MBmIISr3UlF+07wWF8Q80yAjGwhmZzfmR7wp5yfF9a9oiPixVNpCbLTmDxSf9jNX/BiJxGArB6Kr8VF1DIZgpRw="}
/device/0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A/data {"message": {"address": "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A", "heartRate": 78.43, "atRest": false, "timestamp": 1651168779}, "signature": "HcGm4QgCR/Q9+UhKoOOHxl8mpTlcQfUuwlbZ5/vjk11auEPKXNxPZd5u8HYDDfxX/8agYacv/dDaP4GevG6xNRw="}
/device/0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A/data {"message": {"address": "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A", "heartRate": 69.8, "atRest": true, "timestamp": 1651168781}, "signature": "ZNoM3fDFqRAd+8ITPpGuKP/jU1vOoaw3+dcFFm7kUlhWBCy92xbZj6E4Sym2MDJ+Jy2qt0NqT9H4ExnxYDfWwBw="}
/device/0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A/data {"message": {"address": "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A", "heartRate": 144.13, "atRest": false, "timestamp": 1651168783}, "signature": "njhKNBnIWu4oRgTGHTNLi1NKaTBDQDdQ5ucrdvKCJm55Ouu6w7G/zzfUXlcPDzVdaamOGOpWPjbNgVm0UBVhoxw="}
/device/0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A/data {"message": {"address": "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A", "heartRate": 105.27, "atRest": false, "timestamp": 1651168785}, "signature": "QyJz7gy+4j1m2Y0y2cYWXQZ6Q2yBfxkv9XAs5bZVP9Jbqjhx94YAK8td4/VIb8RVuzvK7mRe4PM93FCxJAtBohw="}
```

## Requirements

- Python 3
- Paho MQTT: `pip3 install paho-mqtt`
- Web3: `pip3 install web3`
- python-dotenv: `pip3 install python-dotenv`

## Configuration

Configure the values in the .env file or ensure they are defined as environment variables in the system where the script runs.
