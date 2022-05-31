
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
    console.log(this);
    const configCount = await this.proposalConfigCount();
    const proposalConfig = this.proposalConfigView(await this.getProposalConfigMedians());
    const myProposalConfig = this.proposalConfigView(await this.getProposalConfig());

    const configure = async () => {
      const duration = Number(prompt('Duration: 1-16 (days)'));
      if(duration < 1 || duration > 16) return;
      const threshold = Number(prompt('Threshold: 1-16'));
      if(threshold < 1 || threshold > 16) return;
      const minParticipation = Number(prompt('Min Participation: 1-16'));
      if(minParticipation < 1 || minParticipation > 16) return;

      try {
        await this.setProposalConfig(duration, threshold, minParticipation);
        await this.app.init();
      } catch(error) {
        alert(error.reason);
      }
    };

    return lit.html`
      <dl>
        <dt>Number of Users with Configured Parameters</dt>
        <dd>${configCount}</dd>
        <dt>Median Proposal Configuration Parameters</dt>
        <dd>
          ${configCount > 0 ? lit.html`
            <ul>
              <li>Duration: ${proposalConfig.duration} days</li>
              <li>Threshold: ${proposalConfig.threshold}%</li>
              <li>Minimum Participation: ${proposalConfig.minParticipation}%</li>
            </ul>
          ` : lit.html`
            No Proposal Configuration Set
          `}
        </dd>
        <dt>My Proposal Configuration Parameters</dt>
        <dd>
          ${myProposalConfig.duration > 0 ? lit.html`
            <ul>
              <li>Duration: ${myProposalConfig.duration} days</li>
              <li>Threshold: ${myProposalConfig.threshold}%</li>
              <li>Minimum Participation: ${myProposalConfig.minParticipation}%</li>
            </ul>
          ` : lit.html`
            No Proposal Configuration Set
          `}
          <button @click="${configure}">Configure my Parameters</button>
        </dd>
      </dl>
    `;
  }
  proposalConfigView(raw) {
    const rawThreshold = Number(raw._threshold);
    return {
      duration: Number(raw._duration),
      threshold: rawThreshold === 16 ? 100 : 50 + (rawThreshold - 1) * (50/15),
      minParticipation: ((Number(raw._minParticipation) - 1) / 15) * 100,
    }
  }
  async proposalConfigCount() {
    return await this.contract.methods.proposalConfigCount().call();
  }
  async getProposalConfigMedians() {
    return await this.contract.methods.getProposalConfig().call();
  }
  async getProposalConfig(address) {
    if(!address) address = this.app.accounts[0];
    return await this.contract.methods.getProposalConfig(address).call();
  }
  async setProposalConfig(duration, threshold, minParticipation) {
    return await this.app.send(this.contract.methods.setProposalConfig(
      duration, threshold, minParticipation));
  }

}
