import {isAddress} from '/utils/index.js';

export default class ERC20 {
  constructor(address) {
    this.address = address;
  }
  async name() {
    if(!isAddress(this.address)) return null;
    try {
      return app.web3.eth.abi.decodeParameter('string',
        await app.web3.eth.call({
          to: this.address,
          data: app.web3.eth.abi.encodeFunctionSignature('name()')
        }));
    } catch(error) { return null; }
  }
  async symbol() {
    if(!isAddress(this.address)) return null;
    try {
      return app.web3.eth.abi.decodeParameter('string',
        await app.web3.eth.call({
          to: this.address,
          data: app.web3.eth.abi.encodeFunctionSignature('symbol()')
        }));
    } catch(error) { return null; }
  }
  async decimals() {
    if(!isAddress(this.address)) return null;
    try {
      return app.web3.eth.abi.decodeParameter('uint256',
        await app.web3.eth.call({
          to: this.address,
          data: app.web3.eth.abi.encodeFunctionSignature('decimals()')
        }));
    } catch(error) { return null; }
  }
  async balanceOf(account) {
    try {
      return app.web3.eth.abi.decodeParameter('uint256',
        await app.web3.eth.call({
          to: this.address,
          data: app.web3.eth.abi.encodeFunctionCall({
            name: 'balanceOf', type: 'function',
            inputs: [{type: 'address', name: 'account'}]
          }, [account])
        }));
    } catch(error) { return null; }
  }
  async allowance(account, spender) {
    try {
      return app.web3.eth.abi.decodeParameter('uint256',
        await app.web3.eth.call({
          to: this.address,
          data: app.web3.eth.abi.encodeFunctionCall({
            name: 'allowance', type: 'function',
            inputs: [
              {type: 'address', name: 'account'},
              {type: 'address', name: 'spender'}
            ]
          }, [account, spender])
        }));
    } catch(error) { return null; }
  }
  async approve(spender, amount) {
    const accounts = await app.wallet.accounts;
    const tx = {
      to: this.address,
      from: accounts[0],
      data: app.web3.eth.abi.encodeFunctionCall({
        name: 'approve', type: 'function',
        inputs: [
          {type: 'address', name: 'spender'},
          {type: 'uint256', name: 'amount'}
        ]
      }, [spender, amount])
    };
    tx.gas = await app.web3.eth.estimateGas(tx);
    return await app.web3.eth.sendTransaction(tx);
  }
}
