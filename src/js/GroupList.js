
class GroupList {
  constructor(app) {
    this.app = app;
    this.contract = new this.app.web3.eth.Contract(
      this.app.abi.GroupList, window.config.contracts.GroupList.address);
  }
  async createGroup(params) {
    if(params.length !== 12)
      throw new Error('Invalid parameter count');

    const retval = await this.app.send(this.contract.methods.createGroup(
      window.config.contracts.MockVerification.address, params));

    return new VerifiedGroup(this.app, retval.events.NewGroup.returnValues.group);
  }
  async fetchList() {
    const groups = [];
    let fetchError = false;
    while(!fetchError) {
      try {
        groups.push(new VerifiedGroup(this.app,
          await this.contract.methods.groups(groups.length).call()));
      } catch(error) {
        fetchError = true;
      }
    }
    return groups;
  }
}
