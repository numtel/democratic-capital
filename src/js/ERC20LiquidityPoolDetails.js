import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';
import {app} from './Web3App.js';
import {AppTabs} from './AppTabs.js';
import {ContractOverview} from './ContractOverview.js';

export class ERC20LiquidityPoolDetails extends BaseElement {
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
    this.token0 = null;
    this.token1 = null;
  }
  async connectedCallback() {
    super.connectedCallback();
    this._loading = true;
    this.contract = await this.loadContract('ERC20LiquidityPool', this.address);
    await this.loadDetails();
  }
  async loadDetails() {
    this._loading = true;
    try {
      this._details.token0 = await this.contract.methods.tokens(0).call();
      this._details.token1 = await this.contract.methods.tokens(1).call();
      this.token0 = await this.loadContract('IERC20', this._details.token0);
      this.token1 = await this.loadContract('IERC20', this._details.token1);
      this._details.reserves = await this.contract.methods.getReserves().call();
      this._details.allowance0 = new app.web3.utils.BN(await this.token0.methods.allowance(app.accounts[0], this.address).call());
      this._details.balance0 = new app.web3.utils.BN(await this.token0.methods.balanceOf(app.accounts[0]).call());
      this._details.allowance1 = new app.web3.utils.BN(await this.token1.methods.allowance(app.accounts[0], this.address).call());
      this._details.balance1 = new app.web3.utils.BN(await this.token1.methods.balanceOf(app.accounts[0]).call());
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
    if(this._error) return html`
      <main><p>Invalid Contract!</p></main>
    `;
    return html`
      <contract-overview .content=${({
        Contract: this.address,
        'Allowed to Invoke': this.allowed === 'true'
          ? html`Yes`
          : html`<strong>No</strong>`,
        'Token 0': this._details.token0,
        'Token 1': this._details.token1,
        'Token 0 Reserves': this._details.reserves[0],
        'Token 1 Reserves': this._details.reserves[1],
      })}></contract-overview>
      <main>
        <app-tabs .tabs=${this.liquidityTabs()}></app-tabs>
      </main>
    `;
  }
  liquidityTabs() {
    return [
      { name: 'Deposit',
        render: () => html`
          <p>heyo</p>
        ` },
      { name: 'Withdraw',
        render: () => html`
          <p>heippoyo</p>
        ` },
    ];
  }
}
customElements.define('erc20-liquidity-pool-details', ERC20LiquidityPoolDetails);

