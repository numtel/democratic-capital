import {html, css} from 'lit';
import {ifDefined} from 'lit/directives/if-defined.js';
import abiDecoder from 'abi-decoder';
import {BaseElement} from './BaseElement.js';
import {app} from './Web3App.js';
import {PaginatedList} from './PaginatedList.js';

export class ElectionsByMedianDetails extends BaseElement {
  static properties = {
    address: {type: String},
    _loading: {state: true},
    _details: {state: true},
    _showConfigOptions: {state: true},
    _myCurDuration: {state: true},
    _myCurThreshold: {state: true},
    _myCurMinParticipation: {state: true},
    _newProposalMethod: {state: true},
    _updateProposals: {state: true},
  };
  static proposalMethods = {
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
        { type: 'uint256', note: 'Ban expiration time' },
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
  constructor() {
    super();
    this._loading = true;
    this._showConfigOptions = false;
    this._myCurDuration = 1;
    this._myCurThreshold = 1;
    this._myCurMinParticipation = 1;
    this._newProposalMethod = null;
    this._details = {};
    this._updateProposals = 0;
    this.groupContract = null;
    this.contract = null;
    this.reverseMethods = {};
  }
  async connectedCallback() {
    super.connectedCallback();
    this._loading = true;
    this.contract = await this.loadContract('ElectionsByMedian', this.address);
    this.reverseMethods = Object.keys(ElectionsByMedianDetails.proposalMethods)
      .reduce((out, cur) => {
        const args = ElectionsByMedianDetails.proposalMethods[cur].args.map(arg => arg.type);
        const selector = app.web3.utils.sha3(`${cur}(${args.join(',')})`).slice(0, 10);
        out[selector] = cur;
        return out;
      }, {});
    await this.loadDetails();
  }
  proposalConfigView(raw) {
    const rawThreshold = Number(raw._threshold);
    return {
      duration: Number(raw._duration),
      threshold: rawThreshold === 16 ? 100 : 50 + (rawThreshold - 1) * (50/15),
      minParticipation: ((Number(raw._minParticipation) - 1) / 15) * 100,
    }
  }
  async loadDetails() {
    this._loading = true;
    const groupAbi = await this.loadAbi('IVerifiedGroup');
    abiDecoder.addABI(groupAbi);
    this._details.invokePrefixes = await this.contract.methods.invokePrefixes().call();
    this._details.configCount = await this.contract.methods.proposalConfigCount().call();
    this._details.configMedians = await this.contract.methods.getProposalConfig().call();
    this._details.myConfig = await this.contract.methods.getProposalConfig(app.accounts[0]).call();
    if(Number(this._details.myConfig._threshold) > 0) {
      this._myCurThreshold = Number(this._details.myConfig._threshold);
      this._myCurDuration = Number(this._details.myConfig._duration);
      this._myCurMinParticipation = Number(this._details.myConfig._minParticipation);
    }
    this._details.currentTime = (await app.web3.eth.getBlock('latest')).timestamp;
    this._loading = false;
  }
  async update() {
    super.update();
    this._details.currentTime = (await app.web3.eth.getBlock('latest')).timestamp;
  }
  async proposalCount() {
    return Number(await this.contract.methods.count().call());
  }
  async fetchProposal(index) {
    const key = await this.contract.methods.atIndex(index).call();
    const details = await this.contract.methods.details(key).call();
    details.key = key;
    details.dataDecoded = abiDecoder.decodeMethod(details.data);
    return details;
  }
  renderProposals(proposals) {
    const proposalsTpl = [];
    for(let proposal of proposals) {
      const timeLeft = Number(proposal.endTime) - this._details.currentTime;
      const rawThreshold = proposal._threshold;
      const threshold = rawThreshold === 16 ? 100 : 50 + (rawThreshold - 1) * (50/15);
      proposalsTpl.push(html`
        <li>
          <dl>
            <dt>Start Time</dt>
            <dd>${(new Date(proposal.startTime * 1000)).toString()}</dd>
            <dt>End Time</dt>
            <dd>${(new Date(proposal.endTime * 1000)).toString()}</dd>
            <dt>Time Remaining</dt>
            <dd>${timeLeft > 0 ? html`
              ${remaining(timeLeft)} remaining
            ` : html`
              Election Completed
            `}
            <dt>Invoke Data</dt>
            <dd>
              ${proposal.dataDecoded.name}
              <ul>
                ${proposal.dataDecoded.params.map(param => html`
                  <li>
                    <span class="name">${param.name}</span>
                    <span class="value">${param.value}</span>
                    <span class="type">${param.type}</span>
                  </li>
                `)}
              </ul>
            </dd>
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
          ${timeLeft > 0 ? html`
            <button @click="${this.vote.bind(this)}" data-key="${proposal.key}" data-supporting="true">Vote in Support</button>
            <button @click="${this.vote.bind(this)}" data-key="${proposal.key}" data-supporting="false">Vote Against</button>
          ` : proposal.passed && !proposal.processed ? html`
            <button @click="${this.process.bind(this)}" data-key="${proposal.key}">Invoke Proposal Data</button>
          ` : ''}
        </li>
      `);
    }
    return html`
      <ul class="proposals">
        ${proposalsTpl}
      </ul>
    `;
  }
  renderEmpty() {
    return html`
      <p>No Proposals Yet!</p>
    `;
  }
  renderLoading() {
    return html`
      <p>Loading...</p>
    `;
  }
  render() {
    if(this._loading) return html`
      <p>Loading...</p>
    `;

    const configMedians = this.proposalConfigView(this._details.configMedians);
    const myConfig = this.proposalConfigView(this._details.myConfig);
    const availableMethods = this._details.invokePrefixes.length > 0
      ? this._details.invokePrefixes.map(prefix => this.reverseMethods[prefix])
      : Object.keys(ElectionsByMedianDetails.proposalMethods);
    const proposalMethod = ElectionsByMedianDetails.proposalMethods[this._newProposalMethod];
    return html`
      <p>${this._details.invokePrefixes.length === 0
            ? 'Full invoke capability (no filter)'
            : 'Available Methods: ' + availableMethods.join(', ')}
      </p>
      <h3>Parameters</h3>
      <dl class="parameters">
        <dt>Number of Users with Configured Parameters</dt>
        <dd>${this._details.configCount}</dd>
        <dt>Median Proposal Configuration Parameters</dt>
        <dd>
          ${this._details.configCount > 0 ? html`
            <ul>
              <li>Duration: ${configMedians.duration} days</li>
              <li>Threshold: ${configMedians.threshold}%</li>
              <li>Minimum Participation: ${configMedians.minParticipation}%</li>
            </ul>
          ` : html`
            No Proposal Configuration Set
          `}
        </dd>
        <dt>My Proposal Configuration Parameters</dt>
        <dd>
          ${myConfig.duration > 0 ? html`
            <ul>
              <li>Duration: ${myConfig.duration} days</li>
              <li>Threshold: ${myConfig.threshold}%</li>
              <li>Minimum Participation: ${myConfig.minParticipation}%</li>
            </ul>
          ` : html`
            No Proposal Configuration Set
          `}
          ${!this._showConfigOptions ? html`
            <button @click="${this.configure}">Configure my Parameters</button>
            ${myConfig.duration > 0 ? html`
              <button @click="${this.unsetConfig}">Remove my configuration settings</button>
            ` : ''}
          ` : html`
            <form @submit="${this.setConfig}">
              <fieldset>
                <legend>My Proposal Configuration Ballot</legend>
                <div>
                  <label>
                    <span>Duration</span>
                    <input type="range" name="Duration" min="1" max="16" step="1" value="${this._myCurDuration}" @change="${this.updateMyCur}">
                  </label>
                  <span class="preview">
                    ${this._myCurDuration} ${this._myCurDuration === 1 ? 'day' : 'days'}
                  </span>
                </div>
                <div>
                  <label>
                    <span>Threshold</span>
                    <input type="range" name="Threshold" min="1" max="16" step="1" value="${this._myCurThreshold}" @change="${this.updateMyCur}">
                  </label>
                  <span class="preview">
                    ${this._myCurThreshold === 16 ? 100 : 50 + (this._myCurThreshold - 1) * (50/15)}%
                  </span>
                </div>
                <div>
                  <label>
                    <span>Minimum Participation</span>
                    <input type="range" name="MinParticipation" min="1" max="16" step="1" value="${this._myCurMinParticipation}" @change="${this.updateMyCur}">
                  </label>
                  <span class="preview">
                    ${((this._myCurMinParticipation - 1) / 15) * 100}%
                  </span>
                </div>
                <button @click="${this.configure}">Cancel</button>
                <button type="submit">Save Configuration</button>
              </fieldset>
            </form>
          `}
        </dd>
      </dl>
      <h3>Proposals</h3>
      <form @submit="${this.propose}">
        <fieldset>
          <legend>Submit New Proposal</legend>
          <div>
            <label>
              <span>Method to Invoke</span>
              <select @change="${this.setNewProposalMethod}">
                <option></option>
                ${availableMethods.map(method => html`
                  <option selected="${ifDefined(this._newProposalMethod === method ? true : undefined)}">${method}</option>
                `)}
              </select>
            </label>
          </div>
          ${proposalMethod ? html`
            <p>${proposalMethod.note}</p>
            ${proposalMethod.args.map((arg, index) => html`
              <div>
                <label>
                  <span>${arg.note}</span>
                  ${arg.type === 'address' ? html`
                    <input required name="arg_${index}" pattern="^0x[a-fA-F0-9]{40}$">
                  ` : html`
                    <input required name="arg_${index}">
                  `}
                </label>
              </div>
            `)}
          ` : ''}
          <button type="submit">Submit Proposal</button>
        </fieldset>
      </form>
      <paginated-list
        updateIndex="${this._updateProposals}"
        .count=${this.proposalCount.bind(this)}
        .fetchOne=${this.fetchProposal.bind(this)}
        .renderer=${this.renderProposals.bind(this)}
        .emptyRenderer=${this.renderEmpty.bind(this)}
        .loadingRenderer=${this.renderLoading.bind(this)}
      ></paginated-list>
    `;
  }
  async vote(event) {
    const inSupport = event.target.attributes['data-supporting'].value === 'true';
    const key = event.target.attributes['data-key'].value;
    try {
      await this.send(this.contract.methods.vote(key, inSupport));
      this._updateProposals++;
    } catch(error) {
      console.error(error);
      alert(error.reason);
    }
  }
  async propose(event) {
    event.preventDefault();
    const proposalMethod = ElectionsByMedianDetails.proposalMethods[this._newProposalMethod];
    const args = proposalMethod.args.map((arg, index) => event.target.elements['arg_' + index].value);

    const groupInterface = await this.loadContract('IVerifiedGroup');
    const invokeData = groupInterface.methods[this._newProposalMethod](...args).encodeABI();
    try {
      await this.send(this.contract.methods.propose(invokeData));
      this._updateProposals++;
    } catch(error) {
      console.error(error);
      alert(error.reason);
    }
  }
  async process(event) {
    const key = event.target.attributes['data-key'].value;
    try {
      await this.send(this.contract.methods.process(key));
      this._updateProposals++;
    } catch(error) {
      console.error(error);
      alert(error.reason);
    }
  }
  updateMyCur(event) {
    this['_myCur' + event.target.name] = Number(event.target.value);
  }
  async setConfig(event) {
    event.preventDefault();
    try {
      await this.send(this.contract.methods.setProposalConfig(
        this._myCurDuration,
        this._myCurThreshold,
        this._myCurMinParticipation));
      await this.loadDetails();
      this._showConfigOptions = false;
    } catch(error) {
      console.error(error);
      alert(error.reason);
    }
  }
  async unsetConfig(event) {
    event.preventDefault();
    try {
      await this.send(this.contract.methods.unsetProposalConfig(app.accounts[0]));
      await this.loadDetails();
    } catch(error) {
      console.error(error);
      alert(error.reason);
    }
  }
  configure(event) {
    this._showConfigOptions = !this._showConfigOptions;
  }
  setNewProposalMethod(event) {
    this._newProposalMethod = event.target.value;
  }
}
customElements.define('elections-by-median-details', ElectionsByMedianDetails);

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
