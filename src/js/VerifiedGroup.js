
class VerifiedGroup {
  constructor(app, abi, address) {
    this.app = app;
    this.address = address;
    this.contract = new this.app.web3.eth.Contract(abi, address);
  }
  async registeredCount() {
    return Number(await this.contract.methods.registeredCount().call());
  }
  async isRegistered(account) {
    if(!account) account = this.app.accounts[0];
    return await this.contract.methods.isRegistered(account).call();
  }
  async register(account) {
    return await this.app.send(this.contract.methods.register(account));
  }
  async unregister(account) {
    return await this.app.send(this.contract.methods.unregister(account));
  }
  async allowContract(contract) {
    return await this.app.send(this.contract.methods.allowContract(contract));
  }
  async disallowContract(contract) {
    return await this.app.send(this.contract.methods.disallowContract(contract));
  }
  async allowedContracts() {
    const out = [];
    const count = Number(await this.contract.methods.allowedContractCount().call());
    for(let i = 0; i < count; i++) {
      const address = await this.contract.methods.allowedContractIndex(i).call();
      const self = address === this.address;
      const interfaceIdContract = new this.app.web3.eth.Contract(
        await this.app.contracts.IThisInterfaceId.abi(), address);
      let interfaceId;
      try {
        interfaceId = await interfaceIdContract.methods.thisInterfaceId().call();
      } catch(error) {
      }
      let interfaceName, instance, childContract;
      if(interfaceId in window.config.interfaceIds) {
        interfaceName = window.config.interfaceIds[interfaceId];
        childContract = this.app.childContracts[interfaceName];
        instance = new childContract.klass(
          this.app,
          await this.app.contracts[interfaceName].abi(),
          address);
      }

      out.push({ address, self, interfaceId, interfaceName, instance, childContract });
    }
    return out;
  }
}
