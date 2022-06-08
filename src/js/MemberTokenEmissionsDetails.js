import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';
import {app} from './Web3App.js';
import {remaining} from './utils.js';

export class MemberTokenEmissionsDetails extends BaseElement {
  static properties = {
    address: {type: String},
    allowed: {type: String},
    _loading: {state: true},
    _details: {state: true},
    _error: {state: true},
  };
  constructor() {
    super();
    this.allowed = false;
    this._loading = true;
    this._error = false;
    this._details = {};
    this.contract = null;
    this.token = null;
  }
  async connectedCallback() {
    super.connectedCallback();
    this._loading = true;
    this.contract = await this.loadContract('MemberTokenEmissions', this.address);
    this.token = await this.loadContract('ERC20Mintable', await this.contract.methods.tokenAddress().call());
    await this.loadDetails();
  }
  async loadDetails() {
    this._loading = true;
    try {
    this._details.available = await this.contract.methods.availableEmissions(app.accounts[0]).call();
    this._details.lastCollected = Number(await this.contract.methods.lastCollected(app.accounts[0]).call());
    } catch(error) {
      console.error(error);
      this._error = true;
    }
    this._loading = false;
  }
  render() {
    if(this._loading) return html`
      <main><p>Loading...</p></main>
    `;

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
      <dt>Available Emissions</dt>
      <dd>${this._details.available}</dd>
      <dt>Last Collected</dt>
      <dd>${this._details.lastCollected === 0 ? html`
          Not yet collected
        ` : html`
          ${(new Date(this._details.lastCollected * 1000)).toString()}
        `}
      </dl>
      </main>
      <div class="commands">
        <button @click="${this.collect.bind(this)}">Collect Emissions</button>
      </div>
    `;
  }
  async collect(event) {
    try {
      await this.send(this.contract.methods.collectEmissions());
      await this.loadDetails();
    } catch(error) {
      this.displayError(error);
    }
  }
}
customElements.define('member-token-emissions-details', MemberTokenEmissionsDetails);



