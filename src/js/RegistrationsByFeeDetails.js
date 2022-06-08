import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';
import {app} from './Web3App.js';

export class RegistrationsByFeeDetails extends BaseElement {
  static properties = {
    address: {type: String},
    allowed: {type: String},
    groupAddress: {type: String},
    _loading: {state: true},
    _error: {state: true},
    _details: {state: true},
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
    this.contract = await this.loadContract('RegistrationsByFee', this.address);
    await this.loadDetails();
  }
  async loadDetails() {
    this._loading = true;
    try {
    this._details.token = await this.contract.methods.feeToken().call();
    this.token = await this.loadContract('IERC20', this._details.token);
    this._details.amount = new app.web3.utils.BN(await this.contract.methods.amount().call());
    this._details.allowance = new app.web3.utils.BN(await this.token.methods.allowance(app.accounts[0], this.address).call());
    this._details.balance = new app.web3.utils.BN(await this.token.methods.balanceOf(app.accounts[0]).call());
    this._details.insufficientBalance = this._details.balance.lt(this._details.amount);
    } catch(error) {
      console.error(error);
      this._error = true;
    }
    this._loading = false;
  }
  async approve() {
    try {
      await this.send(this.token.methods.approve(this.address, this._details.amount));
      await this.loadDetails();
    } catch(error) {
      this.displayError(error);
    }
  }
  async register() {
    try {
      await this.send(this.contract.methods.register());
      await this.route('/group/' + this.groupAddress);
    } catch(error) {
      this.displayError(error);
    }
  }
  render() {
    if(this._loading) return html`
      <main><p>Loading...</p></main>
    `;
    if(this._error) return html`
      <main><p>Invalid Contract!</p></main>
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
      <dt>Fee Token</dt>
      <dd><a href="${this.explorer(this._details.token)}" @click="${this.open}">${this._details.token}</a></dd>
      <dt>Fee Amount</dt>
      <dd>${this._details.amount.toString(10)}</dd>
      <dt>My Balance</dt>
      <dd>${this._details.balance.toString(10)}</dd>
      </main>
      <div class="commands">
        ${!this._details.insufficientBalance ? html`
          ${this._details.allowance.gte(this._details.amount) ? html`
            <button @click="${this.register}">Register</button>
          ` : html`
            <button @click="${this.approve}">Approve Spend</button>
          `}
        ` : html`
            <button class="secondary">Insufficient Balance</button>
        `}
      </div>
    `;
  }
}
customElements.define('registrations-by-fee-details', RegistrationsByFeeDetails);

