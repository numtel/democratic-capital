import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';
import {app} from './Web3App.js';
import {ProposalList} from './ProposalList.js';

export class ElectionsByMedianDetails extends BaseElement {
  static properties = {
    address: {type: String},
    allowed: {type: String},
    _loading: {state: true},
    _details: {state: true},
    _showConfigOptions: {state: true},
    _myCurDuration: {state: true},
    _myCurThreshold: {state: true},
    _myCurMinParticipation: {state: true},
  };
  constructor() {
    super();
    this.allowed = false;
    this._loading = true;
    this._showConfigOptions = false;
    this._myCurDuration = 1;
    this._myCurThreshold = 1;
    this._myCurMinParticipation = 1;
    this._details = {};
    this.groupMethods = [];
    this.groupAddress = null;
    this.contract = null;
    this.reverseMethods = {};
  }
  async connectedCallback() {
    super.connectedCallback();
    this._loading = true;
    this.contract = await this.loadContract('ElectionsByMedian', this.address);
    this.groupMethods = await this.loadAbi('VerifiedGroup', true);
    this.groupAddress = this.closest('child-details').groupAddress;
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
      threshold: rawThreshold === 16 ? 100 : Math.round((50 + (rawThreshold - 1) * (50/15)) * 100) / 100,
      minParticipation: Math.round(((Number(raw._minParticipation) - 1) / 15) * 10000) / 100,
    }
  }
  async loadDetails() {
    this._loading = true;
    this._details.invokePrefixes = await this.contract.methods.invokePrefixes().call();
    this._details.configCount = Number(await this.contract.methods.proposalConfigCount().call());
    this._details.configMedians = await this.contract.methods.getProposalConfig().call();
    this._details.myConfig = app.connected
      ? await this.contract.methods.getProposalConfig(app.accounts[0]).call()
      : { _threshold: 0, _duration: 0, _minParticipation: 0 };
    if(Number(this._details.myConfig._threshold) > 0) {
      this._myCurThreshold = Number(this._details.myConfig._threshold);
      this._myCurDuration = Number(this._details.myConfig._duration);
      this._myCurMinParticipation = Number(this._details.myConfig._minParticipation);
    }
    this._loading = false;
  }
  render() {
    if(this._loading) return html`
      <main><p>Loading...</p></main>
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
    return html`
      <main>
      <h3>Overview</h3>
      <dl>
      <dt>Contract</dt>
      <dd><a href="${this.explorer(this.address)}" @click="${this.open}">${this.address}</a></dd>
      <dt>Allowed to Invoke</dt>
      <dd>
        ${this.allowed === 'true'
          ? html`Yes`
          : html`<strong>No</strong>`}
      </dd>
      <dt>Available Methods</dt>
      <dd>
        ${this._details.invokePrefixes.length === 0
              ? 'Full invoke capability (no filter)'
              : availableMethods.join(', ')}
      </dd>
        <dt>Parameter Ballots</dt>
        <dd>${this._details.configCount} ${this._details.configCount === 1 ? 'user has' : 'users have'} cast a parameter ballot</dd>
        <dt>Median Parameters</dt>
        <dd>
          ${this._details.configCount > 0 ? html`
            <ul class="parameters">
              <li>Duration: ${configMedians.duration} ${configMedians.duration === 1 ? 'day' : 'days'}</li>
              <li>Majority Threshold: ${configMedians.threshold}%</li>
              <li>Minimum Participation: ${configMedians.minParticipation}%</li>
            </ul>
          ` : html`
            No Proposal Configuration Set
          `}
        </dd>
        <dt>My Parameters</dt>
        <dd>
          ${myConfig.duration > 0 ? html`
            <ul class="parameters">
              <li>Duration: ${myConfig.duration}  ${myConfig.duration === 1 ? 'day' : 'days'}</li>
              <li>Majority Threshold: ${myConfig.threshold}%</li>
              <li>Minimum Participation: ${myConfig.minParticipation}%</li>
            </ul>
          ` : html`
            No Proposal Configuration Set
          `}
          <div class="spaced">
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
      </main>
      <proposal-list groupAddress="${this.groupAddress}" address="${this.address}" electionType="ElectionsByMedian"></proposal-list>
    `;
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
}
customElements.define('elections-by-median-details', ElectionsByMedianDetails);
