
class GroupList {
  constructor(app, abi) {
    if(!(app instanceof DemocraticCapitalApp))
      throw new Error('invalid app');
    this.app = app;
    this.contract = new this.app.web3.eth.Contract(
      abi, window.config.contracts.GroupList.address);
  }
  async createGroup() {
    const retval = await this.app.send(this.contract.methods.createGroup(
      window.config.contracts.MockVerification.address));

    return new VerifiedGroup(
      this.app,
      await this.app.contracts.VerifiedGroup.abi(),
      retval.events.NewGroup.returnValues.group);
  }
  async fetchList() {
    const groups = [];
    let fetchError = false;
    while(!fetchError) {
      try {
        groups.push(new VerifiedGroup(this.app,
          await this.app.contracts.VerifiedGroup.abi(),
          await this.contract.methods.groups(groups.length).call()));
      } catch(error) {
        fetchError = true;
      }
    }
    return groups;
  }
}
