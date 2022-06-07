import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';
import {app} from './Web3App.js';
import {ProposalList} from './ProposalList.js';
import {remaining} from './utils.js';

export class ElectionsSimpleQuadraticDetails extends BaseElement {
  static properties = {
    address: {type: String},
    allowed: {type: String},
    _loading: {state: true},
    _details: {state: true},
  };
  constructor() {
    super();
    this.allowed = false;
    this._loading = true;
    this._details = {};
    this.groupMethods = [];
    this.groupAddress = null;
    this.contract = null;
    this.reverseMethods = {};
  }
  async connectedCallback() {
    super.connectedCallback();
    this._loading = true;
    this.contract = await this.loadContract('ElectionsSimpleQuadratic', this.address);
    this.groupMethods = await this.loadAbi('VerifiedGroup', true);
    this.groupAddress = this.closest('child-details').groupAddress;
    this.reverseMethods = this.groupMethods.reduce((out, method) => {
        const selector = app.web3.eth.abi.encodeFunctionSignature(method);
        out[selector] = method;
        return out;
      }, {});
    await this.loadDetails();
  }
  async loadDetails() {
    this._loading = true;
    this._details.invokePrefixes = await this.contract.methods.invokePrefixes().call();
    this._details.duration = Number(await this.contract.methods.durationSeconds().call());
    this._details.threshold = Number(await this.contract.methods.threshold().call());
    this._details.minParticipation = Number(await this.contract.methods.minParticipation().call());
    this._details.quadraticToken = await this.contract.methods.quadraticToken().call();
    this._details.quadraticMultiplier = await this.contract.methods.quadraticMultiplier().call();
    this._loading = false;
  }
  render() {
    if(this._loading) return html`
      <main><p>Loading...</p></main>
    `;

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
        <dt>Election Duration</dt>
        <dd>${remaining(this._details.duration)}</dd>
        <dt>Passing Threshold</dt>
        <dd>${Math.round((this._details.threshold / 0xffff) * 100000) / 1000}%</dd>
        <dt>Minimum Participation</dt>
        <dd>${Math.round((this._details.minParticipation / 0xffff) * 100000) / 1000}%</dd>
        <dt>Quadratic Token</dt>
        <dd><a href="${this.explorer(this._details.quadraticToken)}" @click="${this.open}">${this._details.quadraticToken}</a></dd>
        <dt>Quadratic Multiplier</dt>
        <dd>${this._details.quadraticMultiplier}</dd>
      </dl>
      </main>
      <proposal-list groupAddress="${this.groupAddress}" address="${this.address}" electionType="ElectionsByMedian"></proposal-list>
    `;
  }
}
customElements.define('elections-simple-quadratic-details', ElectionsSimpleQuadraticDetails);


