
class ElectionsByMedian {
  constructor(app, abi, address) {
    if(!(app instanceof DemocraticCapitalApp))
      throw new Error('invalid app');
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

    this.proposalMethods = {
      register: {
        args: [
          { type: 'address', note: 'User to add' }
        ],
        note: 'Add a user to the group. (Must be verified on Coinpassport.)',
      },
      unregister: {
        args: [
          { type: 'address', note: 'User to remove' }
        ],
        note: 'Remove a user from the group.',
      },
      ban: {
        args: [
          { type: 'address', note: 'User to ban' },
          { type: 'timestamp', note: 'Ban expiration time' },
        ],
        note: 'Ban a user from the group. They will not be able to register again using the same passport until the ban expires.',
      },
      setVerifications: {
        args: [
          { type: 'address', note: 'Verification contract' },
        ],
        note: 'Change the contract address used for verification data.',
      },
      allowContract: {
        args: [
          { type: 'address', note: 'Contract to Allow' },
        ],
        note: 'Allow a new contract access to invoke functions on behalf of the group. Audit this contract thoroughly before accepting it.',
      },
      disallowContract: {
        args: [
          { type: 'address', note: 'Contract to Disallow' },
        ],
        note: 'Disallow a contract that is currently allowed to invoke functions on behalf of the group.',
      },
      invoke: {
        args: [
          { type: 'address', note: 'Contract to call' },
          { type: 'bytes', note: 'Data to send in call' },
        ],
        note: 'Invoke any contract from the group',
      },
    };
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
    let configCount;
    try {
      configCount = await this.proposalConfigCount();
    } catch(error) {
      console.error(error);
      return lit.html`<p>Not found</p>`;
    }
    const proposalConfig = this.proposalConfigView(await this.getProposalConfigMedians());
    const myProposalConfig = this.proposalConfigView(await this.getProposalConfig());
    const proposals = await this.fetchAllProposals();
    const invokePrefixes = await this.invokePrefixes();

    const vote = (key, inSupport) => {
      return async () => {
        try {
          await this.vote(key, inSupport);
          await this.app.init();
        } catch(error) {
          console.error(error);
          alert(error.reason);
        }
      };
    };

    const process = (key) => {
      return async () => {
        try {
          await this.process(key);
          await this.app.init();
        } catch(error) {
          console.error(error);
          alert(error.reason);
        }
      };
    };

    const currentTime = (await this.app.web3.eth.getBlock('latest')).timestamp;
    const proposalsTpl = [];
    for(let proposal of proposals) {
      const timeLeft = Number(proposal.endTime) - currentTime;
      const rawThreshold = proposal._threshold;
      const threshold = rawThreshold === 16 ? 100 : 50 + (rawThreshold - 1) * (50/15);
      proposalsTpl.push(lit.html`
        <li>
          <dl>
            <dt>Start Time</dt>
            <dd>${(new Date(proposal.startTime * 1000)).toString()}</dd>
            <dt>End Time</dt>
            <dd>${(new Date(proposal.endTime * 1000)).toString()}</dd>
            <dt>Time Remaining</dt>
            <dd>${timeLeft > 0 ? lit.html`
              ${remaining(timeLeft)} remaining
            ` : lit.html`
              Election Completed
            `}
            <dt>Invoke Data</dt>
            <dd>${proposal.data}</dd>
            <dt>Threshold</dt>
            <dd>${threshold}%</dd>
            <dt>Minimum Voters</dt>
            <dd>${proposal.minVoters}</dd>
            <dt>Processed</dt>
            <dd>${proposal.processed ? 'Yes' : 'No'}</dd>
            <dt>Votes Supporting</dt>
            <dd>${proposal.supporting}</dd>
            <dt>Votes Against</dt>
            <dd>${proposal.against}</dd>
            <dt>Proposal Passed</dt>
            <dd>${proposal.passed ? 'Yes' : 'No'}</dd>
            <dt>Proposal Passing</dt>
            <dd>${proposal.passing ? 'Yes' : 'No'}</dd>
          </dl>
          ${timeLeft > 0 ? lit.html`
            <button @click="${vote(proposal.key, true)}">Vote in Support</button>
            <button @click="${vote(proposal.key, false)}">Vote Against</button>
          ` : proposal.passed && !proposal.processed ? lit.html`
            <button @click="${process(proposal.key)}">Invoke Proposal Data</button>
          ` : ''}
        </li>
      `);
    }

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

    const propose = async () => {
      const invokeData = prompt('Invoke data');
      if(!invokeData) return;
      try {
        await this.propose(invokeData);
        await this.app.init();
      } catch(error) {
        alert(error.reason);
      }
    };

    const submitProposal = async event => {
      event.preventDefault();
      console.log(event);
    };

    return lit.html`
      <h2>Elections by Median</h2>
      <p>${invokePrefixes.length === 0
            ? 'Full invoke capability (no filter)'
            : JSON.stringify(invokePrefixes)}
      </p>
      <h3>Parameters</h3>
      <dl class="parameters">
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
      <h3>Proposals</h3>
      <button @click="${propose}">Create New Proposal</button>
      <form @submit="${submitProposal}">
        <fieldset>
          <legend>Submit New Proposal</legend>
          <div>
            <label>
              <span>Method to Invoke</span>
              <select>
                <option>register</option>
                <option>unregister</option>
                <option>ban</option>
                <option>setVerifications</option>
                <option>allowContract</option>
                <option>disallowContract</option>
                <option>invoke</option>
              </select>
            </label>
          </div>
          <button type="submit">Submit Proposal</button>
        </fieldset>
      </form>
      <ul class="proposals">
        ${proposalsTpl}
      </ul>
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
  async invokePrefixes() {
    return await this.contract.methods.invokePrefixes().call();
  }
  async propose(invokeData) {
    return await this.app.send(this.contract.methods.propose(invokeData));
  }
  async fetchAllProposals() {
    const count = await this.proposalCount();
    const out = [];
    for(let i = 0; i < count; i++) {
      const key = await this.getProposalKey(i);
      const details = await this.getProposalDetails(key);
      details.key = key;
      out.push(details);
    }
    return out;
  }
  async proposalCount() {
    return Number(await this.contract.methods.count().call());
  }
  async getProposalKey(index) {
    return await this.contract.methods.atIndex(index).call();
  }
  async getProposalDetails(key) {
    return await this.contract.methods.details(key).call();
  }
  async vote(key, inSupport) {
    return await this.app.send(this.contract.methods.vote(key, inSupport));
  }
  async process(key) {
    return await this.app.send(this.contract.methods.process(key));
  }

}

function remaining(seconds) {
  const units = [
    { value: 1, unit: 'second' },
    { value: 60, unit: 'minute' },
    { value: 60 * 60, unit: 'hour' },
    { value: 60 * 60 * 24, unit: 'day' },
  ];
  let remaining = seconds;
  let out = [];
  for(let i = units.length - 1; i >= 0;  i--) {
    if(remaining >= units[i].value) {
      const count = Math.floor(remaining / units[i].value);
      out.push(count.toString(10) + ' ' + units[i].unit + (count !== 1 ? 's' : ''));
      remaining = remaining - (count * units[i].value);
    }
  }
  return out.join(', ');
}
