
class VerifiedGroup {
  constructor(app, address) {
    this.app = app;
    this.address = address;
    this.contract = new this.app.web3.eth.Contract(this.app.abi.VerifiedGroup, address);
  }
  async registeredCount() {
    return Number(await this.contract.methods.registeredCount().call());
  }
  async isRegistered(account) {
    if(!account) account = this.app.accounts[0];
    return await this.contract.methods.isRegistered(account).call();
  }
  async register(params) {
    if(params.length !== 12)
      throw new Error('Invalid parameter count');
    return await this.app.send(this.contract.methods.register(params));
  }
  async unregister() {
    return await this.app.send(this.contract.methods.unregister(this.app.accounts[0]));
  }
  async allowedContracts() {
    const out = [];
    const count = Number(await this.contract.methods.allowedContractCount().call());
    for(let i = 0; i < count; i++) {
      out.push(await this.contract.allowedContractIndex(i).call());
    }
    return out;
  }
  async allowanceElections() {
  }
}
