import {html, css} from 'lit';
import {ifDefined} from 'lit/directives/if-defined.js';
import {ref} from 'lit/directives/ref.js';
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
    _proposalMethodLoading: {state: true},
    _updateProposals: {state: true},
    _selInvokeMethod: {state: true},
    _invokeMethod: {state: true},
    invokeMethods: {state: true},
    firstArg: {state: true},
  };
  constructor() {
    super();
    this._loading = true;
    this._showConfigOptions = false;
    this._myCurDuration = 1;
    this._myCurThreshold = 1;
    this._myCurMinParticipation = 1;
    this._newProposalMethod = '';
    this._proposalMethodLoading = false;
    this._details = {};
    this._updateProposals = 0;
    this.groupMethods = [];
    this.groupChildren = {};
    this.contract = null;
    this.reverseMethods = {};
    this.firstArg = '';
    this.invokeMethods = [];
    this._selInvokeMethod = null;
    this._invokeMethod = '';
  }
  async connectedCallback() {
    super.connectedCallback();
    this._loading = true;
    this.contract = await this.loadContract('ElectionsByMedian', this.address);
    this.groupMethods = await this.loadAbi('VerifiedGroup', true);
    this.groupChildren = await this.allGroupChildren(this.closest('child-details').groupAddress);
    this.reverseMethods = this.groupMethods.reduce((out, method) => {
        const selector = app.web3.eth.abi.encodeFunctionSignature(method);
        out[selector] = method;
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
    this._details.invokePrefixes = await this.contract.methods.invokePrefixes().call();
    this._details.configCount = await this.contract.methods.proposalConfigCount().call();
    this._details.configMedians = await this.contract.methods.getProposalConfig().call();
    this._details.myConfig = app.connected
      ? await this.contract.methods.getProposalConfig(app.accounts[0]).call()
      : { _threshold: 0, _duration: 0, _minParticipation: 0 };
    if(Number(this._details.myConfig._threshold) > 0) {
      this._myCurThreshold = Number(this._details.myConfig._threshold);
      this._myCurDuration = Number(this._details.myConfig._duration);
      this._myCurMinParticipation = Number(this._details.myConfig._minParticipation);
    }
    this._details.currentTime = (await app.web3.eth.getBlock('latest')).timestamp;
    this._loading = false;
  }
  async update(changed) {
    super.update();
    await app.initialized;
    this._details.currentTime = (await app.web3.eth.getBlock('latest')).timestamp;
    if(changed.has('_newProposalMethod')) {
      this._proposalMethodLoading = true;
      this.firstArg = this._newProposalMethod.split(' ').length > 1
        ? this._newProposalMethod.split(' ')[1].slice(1, -1) : false;
      this.invokeMethods = [];
      if(this.firstArg) {
        const childType = await this.childType(this.firstArg);
        if(childType) {
          this.invokeMethods = await this.loadAbi(childType, true);
        }
      }
      this._proposalMethodLoading = false;
    }
  }
  async proposalCount() {
    return Number(await this.contract.methods.count().call());
  }
  async fetchProposal(index) {
    const key = await this.contract.methods.atIndex(index).call();
    const details = await this.contract.methods.details(key).call();
    details.key = key;
    details.dataDecoded = await this.decodeAbiFunction('IVerifiedGroup', details.data);
    if(details.dataDecoded.name === 'invoke') {
      details.invokeType = await this.childType(details.dataDecoded.params[0].value);
      if(details.invokeType) {
        details.invokeData = await this.decodeAbiFunction(details.invokeType, details.dataDecoded.params[1].value);
      }
    }
    details.myVote = app.connected
      ? Number(await this.contract.methods.voteValue(key, app.accounts[0]).call())
      : null;
    return details;
  }
  renderProposals(proposals) {
    const proposalsTpl = [];
    for(let proposal of proposals) {
      const timeLeft = Number(proposal.endTime) - this._details.currentTime;
      const rawThreshold = proposal._threshold;
      const totalVoters = Number(proposal.supporting) + Number(proposal.against);
      const supportLevel = totalVoters === 0 ? 0 : Number(proposal.supporting)
        / (Number(proposal.supporting)+Number(proposal.against));
      const votersRequired = Number(proposal.minVoters) - totalVoters;
      const threshold = rawThreshold === 16 ? 100 : 50 + (rawThreshold - 1) * (50/15);
      proposalsTpl.push(html`
        <li>
          <dl>
            <dt>Time Remaining</dt>
            <dd>${timeLeft > 0 ? html`
              ${remaining(timeLeft)} remaining
            ` : html`
              Election Completed
            `}
            <dt>Invoke Data</dt>
            <dd>
              ${proposal.dataDecoded.name}
              <ul class="invoke-params">
                ${proposal.dataDecoded.params.map(param => html`
                  <li>
                    ${param.name === 'data' && proposal.invokeType ? html`
                      <span class="invoke-name">${proposal.invokeData.name}</span>
                      <ul class="invoke-params">
                        ${proposal.invokeData.params.map(param => html`
                          <li>
                            <span class="name">${param.name}</span>
                            <span class="value">
                              ${param.type === 'address' ? html`
                                <a @click="${this.open}" href="${this.explorer(param.value)}">
                                  ${param.value}
                                </a>
                              ` : html`
                                ${param.value}
                              `}
                            </span>
                            <span class="type">${param.type}</span>
                          </li>
                        `)}
                      </ul>
                    ` : html`
                      <span class="name">${param.name}</span>
                      <span class="value">
                        ${param.type === 'address' ? html`
                          <a @click="${this.open}" href="${this.explorer(param.value)}">
                            ${param.value}
                          </a>
                        ` : html`
                          ${param.value}
                        `}
                      </span>
                      <span class="type">${param.type} ${proposal.invokeType}</span>
                    `}
                  </li>
                `)}
              </ul>
            </dd>
            <dt>Status</dt>
            <dd>
              ${timeLeft > 0 ?
                proposal.passing ? 'Majority and participation thresholds met'
                  : 'Proposal will not pass with current support and participation levels'
                : proposal.processed ? 'Proposal passed and already processed'
                  : proposal.passed ? 'Proposal passed and awaiting processing'
                    : 'Proposal failed'}
              ${proposal.myVote === 1 ? '(Voted in Support)' :
                proposal.myVote === 2 ? '(Voted Against)' : ''}
            </dd>
            <dt>Support Level</dt>
            <dd>
              ${Math.round(supportLevel* 10000) / 100}%
              (Minimum: ${Math.round(threshold * 100) / 100}%)
            </dd>
            <dt>Participation Level</dt>
            <dd>
              ${votersRequired > 0
                ? `${votersRequired}
                    ${votersRequired === 1
                      ? 'more voter required to me participation threshold'
                      : 'more voters required to meet participation threshold'}`
                : `${totalVoters} ${totalVoters === 1 ? 'voter' : 'voters'}`}
              (Minimum: ${proposal.minVoters})
            </dd>
            <dt>Start Time</dt>
            <dd>${(new Date(proposal.startTime * 1000)).toString()}</dd>
            <dt>End Time</dt>
            <dd>${(new Date(proposal.endTime * 1000)).toString()}</dd>
          </dl>
          ${timeLeft > 0 && proposal.myVote === 0 ? html`
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
      ? this._details.invokePrefixes.map(prefix => {
          let address;
          if(prefix.length > 10) {
            address = '0x' + prefix.slice(34);
          }
          return this.reverseMethods[prefix.slice(0, 10)].name + (address ? ` (${address})` : '');
        })
      : this.groupMethods.map(method => method.name);
    const methodName = this._newProposalMethod.split(' ')[0];
    const proposalMethod = this.groupMethods.filter(method => method.name === methodName);
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
              <li>Majority Threshold: ${configMedians.threshold}%</li>
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
              <li>Majority Threshold: ${myConfig.threshold}%</li>
              <li>Minimum Participation: ${myConfig.minParticipation}%</li>
            </ul>
          ` : html`
            No Proposal Configuration Set
          `}
          <div>
            ${!this._showConfigOptions ? html`
              <button @click="${this.configure}">Configure my Parameters</button>
              ${myConfig.duration > 0 ? html`
                <button @click="${this.unsetConfig}" class="secondary">Remove my configuration settings</button>
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
                      <span>Majority Threshold</span>
                      <input type="range" name="Threshold" min="1" max="16" step="1" value="${this._myCurThreshold}" @change="${this.updateMyCur}">
                    </label>
                    <span class="preview">
                      ${this._myCurThreshold === 16 ? 100 : Math.round((50 + (this._myCurThreshold - 1) * (50/15))* 100 )/100}%
                    </span>
                  </div>
                  <div>
                    <label>
                      <span>Minimum Participation</span>
                      <input type="range" name="MinParticipation" min="1" max="16" step="1" value="${this._myCurMinParticipation}" @change="${this.updateMyCur}">
                    </label>
                    <span class="preview">
                      ${Math.round(((this._myCurMinParticipation - 1) / 15) * 10000) / 100}%
                    </span>
                  </div>
                  <button type="submit">Save Configuration</button>
                  <button @click="${this.configure}" class="secondary">Cancel</button>
                </fieldset>
              </form>
            `}
          </div>
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
          ${this._proposalMethodLoading ? html`
            <p>Loading...</p>
          ` : html`
            ${proposalMethod.length > 0 ? html`
              ${proposalMethod[0].inputs.map((arg, index) => html`
                <div>
                  <label>
                    <span>${arg.name}</span>
                    ${index === 0 && this.firstArg ? html`
                      <input name="${arg.name}" value="${this.firstArg}" disabled>
                    ` : html`
                      ${arg.type === 'address' ? html`
                        <input required name="${arg.name}" pattern="^0x[a-fA-F0-9]{40}$">
                      ` : html`
                        <input required name="${arg.name}">
                      `}
                    `}
                  </label>
                </div>
                ${proposalMethod[0].name === 'invoke' && index === 0 ? html`
                  <div>
                    <label>
                      <span>Group Child Contracts</span>
                      <select @change="${this.selContractChange}">
                        <option value=""
                         selected="${ifDefined(this.firstArg === '' ? true : undefined)}"
                        >Select child contract...</option>
                        ${Object.keys(this.groupChildren).map(childType => html`
                          <optgroup label="${childType}">
                            ${this.groupChildren[childType].map(thisChild => html`
                              <option
                               selected="${ifDefined(this.firstArg === thisChild ? true : undefined)}"
                              >${thisChild}</option>
                            `)}
                          </optgroup>
                        `)}
                      </select>
                    </label>
                  </div>
                ` : ''}
              `)}
              ${this.invokeMethods.length > 0 ? html`
                <fieldset>
                  <legend>Invoke Data Builder</legend>
                  <div>
                    <label>
                      <span>Invoke Method</span>
                      <select ${ref(this.setSelInvokeMethod)} @change="${this.setInvokeMethod}">
                        <option value="">Choose Method...</option>
                        ${this.invokeMethods.map(method => html`
                          <option>${method.name}</option>
                        `)}
                      </select>
                    </label>
                  </div>
                  ${this._invokeMethod && this.invokeMethods.filter(method => method.name === this._invokeMethod)[0].inputs.map((arg, index) => html`
                    <div>
                      <label>
                        <span>${arg.name}</span>
                        ${arg.type === 'address' ? html`
                          <input required @change="${this.invokeParamChange}" name="invoke_${arg.name}" pattern="^0x[a-fA-F0-9]{40}$">
                        ` : arg.type === 'bool' ? html`
                          <input type="checkbox" @change="${this.invokeParamChange}" name="invoke_${arg.name}">
                        ` : html`
                          <input required @change="${this.invokeParamChange}" name="invoke_${arg.name}">
                        `}
                      </label>
                    </div>
                  `)}
                </fieldset>
              ` : ''}
            ` : ''}
          `}
          <div class="commands">
            <button type="submit">Submit Proposal</button>
          </div>
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
  async selContractChange(event) {
    this.firstArg = event.target.value;
    if(this.firstArg) {
      this._proposalMethodLoading = true;
      const childType = event.target.selectedOptions[0].parentNode.label;
      this._invokeMethod = '';
      this.invokeMethods = await this.loadAbi(childType, true);
      this._proposalMethodLoading = false;
    }
  }
  async vote(event) {
    const inSupport = event.target.attributes['data-supporting'].value === 'true';
    const key = event.target.attributes['data-key'].value;
    try {
      await this.send(this.contract.methods.vote(key, inSupport));
      this._updateProposals++;
    } catch(error) {
      this.displayError(error);
    }
  }
  async propose(event) {
    event.preventDefault();
    const methodName = this._newProposalMethod.split(' ')[0];
    const proposalMethod = this.groupMethods.filter(method => method.name === methodName);
    const inputs = event.target.querySelectorAll('input');
    const args = proposalMethod[0].inputs.map(input => event.target.querySelector(`input[name="${input.name}"]`).value);
    if(!proposalMethod) return;
    const groupInterface = await this.loadContract('IVerifiedGroup');
    const invokeData = groupInterface.methods[methodName](...args).encodeABI();
    try {
      await this.send(this.contract.methods.propose(invokeData));
      this._updateProposals++;
    } catch(error) {
      this.displayError(error);
    }
  }
  async process(event) {
    const key = event.target.attributes['data-key'].value;
    try {
      await this.send(this.contract.methods.process(key));
      this._updateProposals++;
    } catch(error) {
      this.displayError(error);
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
      this.displayError(error);
    }
  }
  async unsetConfig(event) {
    event.preventDefault();
    try {
      await this.send(this.contract.methods.unsetProposalConfig(app.accounts[0]));
      await this.loadDetails();
    } catch(error) {
      this.displayError(error);
    }
  }
  configure(event) {
    this._showConfigOptions = !this._showConfigOptions;
  }
  setNewProposalMethod(event) {
    this._newProposalMethod = event.target.value;
  }
  setSelInvokeMethod(select) {
    this._selInvokeMethod = select;
  }
  setInvokeMethod(event) {
    this._invokeMethod = event.target.value;
    this.invokeParamChange(event);
  }
  invokeParamChange(event) {
    const form = event.target.closest('form');
    const args = Array.from(form.querySelectorAll('input[name^="invoke_"]')).map(input =>
      input.type === 'checkbox' ? input.checked : input.value);
    const invokeMethod = this.invokeMethods.filter(method => method.name === this._invokeMethod)[0];
    if(args.length !== invokeMethod.inputs.length) return;
    const dataInput = form.querySelector('input[name="data"]');
    try {
      dataInput.value = app.web3.eth.abi.encodeFunctionCall(invokeMethod, args);
    } catch(error) {
      this.displayError(error);
    }
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
