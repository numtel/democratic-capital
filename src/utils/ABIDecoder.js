export default class AbiDecoder {
  constructor(abiArray) {
    this.methodIDs = {};

    for(let abi of abiArray) {
      if (abi.name) {
        const signature = app.web3.utils.sha3(
          `${abi.name}(${abi.inputs.map(_typeToString).join(",")})`);
        if (abi.type === "event") {
          this.methodIDs[signature.slice(2)] = abi;
        } else {
          this.methodIDs[signature.slice(2, 10)] = abi;
        }
      }
    }
  }
  decodeMethod(data) {
    const methodID = data.slice(2, 10);
    const abiItem = this.methodIDs[methodID];
    if (abiItem) {
      let decoded = app.web3.eth.abi.decodeParameters(abiItem.inputs, data.slice(10));

      let retData = {
        name: abiItem.name,
        params: [],
      };

      for (let i = 0; i < decoded.__length__; i++) {
        let param = decoded[i];
        let parsedParam = param;
        const isUint = abiItem.inputs[i].type.indexOf("uint") === 0;
        const isInt = abiItem.inputs[i].type.indexOf("int") === 0;
        const isAddress = abiItem.inputs[i].type.indexOf("address") === 0;

        if (isUint || isInt) {
          const isArray = Array.isArray(param);

          if (isArray) {
            parsedParam = param.map(val => new app.web3.utils.BN(val).toString());
          } else {
            parsedParam = new app.web3.utils.BN(param).toString();
          }
        }

        // Addresses returned by web3 are randomly cased so we need to standardize and lowercase all
        if (isAddress) {
          const isArray = Array.isArray(param);

          if (isArray) {
            parsedParam = param.map(_ => _.toLowerCase());
          } else {
            parsedParam = param.toLowerCase();
          }
        }

        retData.params.push({
          name: abiItem.inputs[i].name,
          value: parsedParam,
          type: abiItem.inputs[i].type,
        });
      }

      return retData;
    }
  }
}

function _typeToString(input) {
  if (input.type === "tuple") {
    return `(${input.components.map(_typeToString).join(",")})`;
  }
  return input.type;
}

