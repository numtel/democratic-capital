import ABIDecoder from '/utils/ABIDecoder.js';
import {selfDescribingContract} from '/utils/index.js';


const web3 = new Web3(config.rpc);
(async function() {
const test1 = await selfDescribingContract(web3, config.contracts.Test1.address);
const val = await test1.methods.test().call();
console.log('foo', val);
})();



