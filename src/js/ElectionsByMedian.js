
class ElectionsByMedian {
  constructor(app, abi, address) {
    this.app = app;
    // Optional parameters
    this.abi = abi;
    this.address = address;

    if(address) {
      this.contract = new this.app.web3.eth.Contract(abi, address);
    } else {
      this.contract = null;
    }

    this.bytecode = null;
  }
  async deployNew(groupAddress, allowedInvokePrefixes) {
    if(this.contract)
      throw new Error('already deployed');
    if(typeof groupAddress !== 'string' || !groupAddress.match(/^0x[a-f0-9]{40}$/i))
      throw new Error('invalid group address');

    allowedInvokePrefixes = allowedInvokePrefixes || [];

    this.abi = await this.app.contracts.ElectionsByMedian.abi();
    this.bytecode = await this.app.contracts.ElectionsByMedian.bytecode();

    const contract = new this.app.web3.eth.Contract(this.abi);
    this.contract = await this.app.send(contract.deploy({
      data: this.bytecode,
      arguments: [ groupAddress, allowedInvokePrefixes ],
    }));
    this.address = this.contract.options.address;

  }
  async render() {
    return lit.html`<h2>heyo!</h2>`;
  }

}
