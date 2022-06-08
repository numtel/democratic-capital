import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';
import {app} from './Web3App.js';
import {remaining} from './utils.js';

export class FundraiserDetails extends BaseElement {
  static properties = {
    address: {type: String},
    allowed: {type: String},
    groupAddress: {type: String},
    _loading: {state: true},
    _error: {state: true},
    _details: {state: true},
    _amount: {state: true},
  };
  constructor() {
    super();
    this.allowed = false;
    this._loading = true;
    this._error = false;
    this._details = {};
    this.contract = null;
    this.token = null;
    this._amount = 0;
  }
  async connectedCallback() {
    super.connectedCallback();
    this._loading = true;
    this.contract = await this.loadContract('Fundraiser', this.address);
    await this.loadDetails();
  }
  async loadDetails() {
    this._loading = true;
    try {
      this._details.currentTime = (await app.web3.eth.getBlock('latest')).timestamp;
      this._details.token = await this.contract.methods.token().call();
      this.token = await this.loadContract('IERC20', this._details.token);
      this._details.goalAmount = new app.web3.utils.BN(await this.contract.methods.goalAmount().call());
      this._details.endTime = Number(await this.contract.methods.endTime().call());
      this._details.collected = await this.contract.methods.collected().call();
      this._details.totalDeposited = new app.web3.utils.BN(await this.contract.methods.totalDeposited().call());
      this._details.deposited = new app.web3.utils.BN(await this.contract.methods.deposited(app.accounts[0]).call());
      this._details.allowance = new app.web3.utils.BN(await this.token.methods.allowance(app.accounts[0], this.address).call());
      this._details.balance = new app.web3.utils.BN(await this.token.methods.balanceOf(app.accounts[0]).call());
    } catch(error) {
      console.error(error);
      this._error = true;
    }
    this._loading = false;
  }
  async approve() {
    try {
      await this.send(this.token.methods.approve(this.address, this._amount));
      await this.loadDetails();
    } catch(error) {
      this.displayError(error);
    }
  }
  async deposit() {
    try {
      await this.send(this.contract.methods.deposit(this._amount));
      await this.loadDetails();
    } catch(error) {
      this.displayError(error);
    }
  }
  async withdraw() {
    try {
      await this.send(this.contract.methods.withdraw());
      await this.loadDetails();
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
      <dt>Token</dt>
      <dd><a href="${this.explorer(this._details.token)}" @click="${this.open}">${this._details.token}</a></dd>
      <dt>Time Remaining</dt>
      <dd>
        ${this._details.currentTime > this._details.endTime ? html`
          Campaign finished!
        ` : html`
          ${remaining(this._details.endTime - this._details.currentTime)}
        `}
      </dd>
      <dt>Goal Amount</dt>
      <dd>${this._details.goalAmount.toString(10)} (${this._details.goalAmount.gt(this._details.totalDeposited) ? 'Goal Not Met' : 'Goal Met'})</dd>
      <dt>Total Deposited</dt>
      <dd>${this._details.totalDeposited.toString(10)}</dd>
      <dt>My Deposits</dt>
      <dd>${this._details.deposited.toString(10)}</dd>
      ${this._details.currentTime < this._details.endTime ? html`
        <dt>My Balance</dt>
        <dd>${this._details.balance.toString(10)}</dd>
        <dt>Deposit Amount</dt>
        <dd><input type="number" min="0" step="1" value="${this._amount}" @change="${this.setAmount}"></dd>
      ` : ''}
      </main>
      <div class="commands">
        ${this._details.currentTime > this._details.endTime ? html`
          ${this._details.totalDeposited.lt(this._details.goalAmount) ? html`
            <button @click="${this.withdraw}">Withdraw</button>
          ` : ''}
        ` : html`
          ${this._amount && this._amount.gt(0) ? html`
            ${this._details.balance.gte(this._amount) ? html`
              ${this._details.allowance.gte(this._amount) ? html`
                <button @click="${this.deposit}">Deposit</button>
              ` : html`
                <button @click="${this.approve}">Approve Spend</button>
              `}
            ` : html`
              <button class="secondary">Insufficient Balance</button>
            `}
          ` : ''}
        `}
      </div>
    `;
  }
  setAmount(event) {
    this._amount = new app.web3.utils.BN(event.target.value);
  }
}
customElements.define('fundraiser-details', FundraiserDetails);


