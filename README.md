# Democratic Capital

Contract manager for groups of unique humans verified by [Coinpassport](https://coinpassport.net)

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

## Development Chain

The development chain script runs Ganache on port 8545 as well as aiding in managing mocked verifications and block timing while developing the application locally.

It also deploys the relevant factory contracts to the development chain and outputs their addresses to `build/config.json` for consumption by the frontend.

```
# Contracts must be built before running the development chain
$ npm run build-dev

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

## Development Frontend

Start [Parcel](https://parceljs.org/) with the following command:

```
$ npm run dev
```

Vim users may need to set the following in order to use Parcel's Hot Module Reloading:

```
:set backupcopy=yes
```

## Testing Contracts

```
# Build contracts before running tests
$ npm run build-dev

$ npm test
```

## License

MIT
