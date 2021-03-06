# Democratic Capital

Contract manager for groups of unique humans verified by [Coinpassport](https://coinpassport.net)

## Concepts

* [Self-Describing Contracts](contracts.md)
* [Contract Hierarchy](hierarchy.md)

## Installation

```
$ git clone https://github.com/numtel/democratic-capital.git
$ cd democratic-capital
$ npm install
```

Download the `solc` compiler. This is used instead of `solc-js` because it is much faster. Binaries for other systems can be found in the [Ethereum foundation repository](https://github.com/ethereum/solc-bin/).
```
$ curl -o solc https://binaries.soliditylang.org/linux-amd64/solc-linux-amd64-v0.8.13+commit.abaa5c0e
$ chmod +x solc
```

## Development Frontend

Start the development frontend server, connecting to the contracts on Optimism using the settings in `src/config.js` with the following command:

```
$ npm run dev
```

## Development Chain

The development chain script runs Ganache on port 8545 as well as aiding in managing mocked verifications and block timing while developing the application locally.

It also deploys the relevant factory contracts to the development chain and outputs their addresses to `build/config.js` for consumption by the frontend. For the frontend to read this file, the other configuration file at `src/config.js` must be removed.

```
# Contracts must be built before running the development chain
$ npm run build-dev
# Contract metadata must be generated and build too
$ npm run build-meta

$ npm run dev-chain

...

Democratic Capital Development Chain CLI
Type "help" for commands, ctrl+c to exit
> help
help 
accounts 
verify [address] [expiration]
expiration [address]
nextday
> accounts
0: 0x6e43ed02ca36db68917a853405b566b5d16a329d
...
> verify 0
# Verify account number 0 for the next year
> nextday
# Increment block timestamp by 24 hours (useful for testing proposals)
```

## Testing Contracts

```
# Build contracts before running tests
$ npm run build-dev

$ npm test
```

## License

MIT
