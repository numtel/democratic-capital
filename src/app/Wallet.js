import {delay} from '/utils/index.js';

export default class Wallet {
  constructor() {
    this.init();
  }
  async init() {
    await delay(0);
    app.web3.eth.handleRevert = true;
    this.accounts = this.fetchAccounts();
  }
  async fetchAccounts() {
    return await new Promise((resolve, reject) => {
      app.web3.eth.getAccounts((error, accounts) => {
        if(error) reject(error);
        else resolve(accounts);
      });
    });
  }
  async send(method) {
    let retval;
    const accounts = await this.accounts;
    try {
      const gas = await method.estimateGas({ from: accounts[0] });
      retval = await method.send({ from: accounts[0], gas });
    } catch(error) {
      const internalPrefix = 'Internal JSON-RPC error.\n';
      if(error.message.startsWith(internalPrefix)) {
        const parsed = JSON.parse(error.message.slice(internalPrefix.length));
        error.reason = parsed.reason || (parsed.data && parsed.data.reason);
      }
      if(error.reason === 'Not Verified'
          || error.message.indexOf('Not Verified') !== -1
          || (error.data && error.data.reason === 'Not Verified')) {
        app.router.goto('/verify');
        throw error;
      } else {
        throw error;
      }
    }
    return retval;
  }
}
