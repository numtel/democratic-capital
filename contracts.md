# Self-Describing Contracts

At its core, Democratic Capital is a frontend for self-describing contracts.

Most Smart Contracts on Ethereum-based chains are opaque blobs of bytecode useless without the matching ABI specification that describes the function signatures that exist within the contract.

Contracts on Democratic Capital always supply a meta contract address which contains (on chain) ABI specification as well as any other custom JSON metadata GZipped.

```solidity
// All contracts conform to this IHasMeta interface
interface IHasMeta {
  function meta() external view returns(address);
}

// The meta address points to a contract containing static data
interface IMeta {
  function name() external view returns(string);
  function getABI() external view returns(bytes);
  function getCustom() external view returns(bytes);
}
```

With this metadata available for each contract, there is no need to verify contract bytecode as is required on other explorers. New contracts can be read by the interface immediately, without The one-time gas overhead of deploying the meta contract is a small fraction of the cost of deploying the base contract.

Related: [github.com/rebeccajae/SelfDescribing](https://github.com/rebeccajae/SelfDescribing)

## How Metadata Contracts are Generated

Democratic Capital includes a script for generating meta contracts for all contracts in the `build` directory:

```
# Must build the source contracts first
$ npm run build-dev
# Then the metadata can be built
$ npm run build-meta
```

Custom metadata JSON is extracted from a single multi-line commment in the Solidity source code that matches the `/*{` at the start and `}*/` at the end. The content must be valid JSON.

## How Democratic Capital Reads custom metadata

The custom metadata determines how a contract is displayed and which methods are given interaction forms on the frontend.

```js
{
  "name": "<Human readable type name>",
  "overview": {
    // Specify which values to display on the item details page for contracts of this type
    "<external view method name>": {
      // Optionally, specify a module for displaying this value
      // invokeFilter: Decode election allowed invoke prefixes
      // seconds: Convert a number of seconds into days, hours, minutes
      // percentage: Value is used as percentage of max value for the given type
      // token: Display token name, symbol, decimals
      // timestamp: Convert timestamp to human-readable date time
      "display": "<invokeFilter|seconds|percentage|token|timestamp>",
      // Optionally, apply decimals to the result
      // this: Read the decimal number from this contract
      // method: The ERC20 address for this value is at this method on this contract
      "decimals": <"this"|["method",...args]|"method">
    }
  },
  // Methods described in this section will be given buttons underneath the overview
  "methods": {
    "<external method name>": {
      // Only show the button to members of the group
      "onlyMember": boolean,
      // Only show the button to accounts who are allowed administrators of the group
      "onlyAllowed": boolean,
      // Custom metadata to augment each field's display
      "fields": [
        // These item indexes correspond to the method argument indexes
        {
          // Optionally, display a specific input widget for this field
          // txs: Transaction builder for new proposals
          // invokeFilter: Allowed invoke prefix builder for new election contracts
          // percentage: Show a range slider with percentage of max value for type
          // range: Show a range slider
          "input": "<txs|invokeFilter|percentage|range>",
          // Optional for percentage/range inputs, instead of 0
          "min": <number>,
          // Optional for percentage/range inputs, instead of max of uint type
          "max": <number>,
          // Optional for percentage input, percent value at min
          "minPercent": <number>,
          // Optional for percentage input, percent value at max
          "maxPercent": <number>,
          // Optionally, make this input hidden and fill it with a fixed value
          // parent: the parent contract, i.e. the group address
          // Verification: the Coinpassport verification contract address
          "hidden": "<parent|Verification>",
          // Optionally, display a input-sensitive preview of the value
          // seconds: Preview seconds input as days, hours, minutes
          // token: Preview ERC20 name, symbol, decimals from address input
          // quadratic: Preview vote power from amount input
          "preview": "<seconds|token|quadratic>",
          // Display a select element to aid filling input
          "select": ["<Factories|Children|Allowed>"]
          // Optionally, display a help text string below the input
          "hint": "<value>"
        }
      ]
    }
  },
  // Modules specified in this section will be displayed below the main details
  "display": {
    // Only used on VerifiedGroup to display allowed contracts
    "Allowed": {},
    // Only used on VerifiedGroup and VerifiedGroupFactory contracts
    "FactoryBrowser": {
      "root": boolean
    },
    // Only on VerifiedGroup to enable token swaps within child ERC20LiquidityPool contracts
    "Swap": {}
  }
}
```

## Opportunities for Expansion

* Deploy your own factories and contracts that interact with your groups
* Deploy your own `VerifiedGroupFactory` and create another list of groups inaccessible from the main list linked on Democratic Capital, but available by specifying its address in the URL.

