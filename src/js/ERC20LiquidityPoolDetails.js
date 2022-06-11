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
    _deposit0: {state: true},
    _deposit1: {state: true},
    _withdraw: {state: true},
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
    this._deposit0 = null;
    this._deposit1 = null;
    this._withdraw = null;
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
      this._details.swapFee = Number(await this.contract.methods.swapFee().call()) / 0xffffffff;
      this._details.totalLiquidity = new app.web3.utils.BN(await this.contract.methods.totalSupply().call());
      this._details.myLiquidity = new app.web3.utils.BN(await this.contract.methods.balanceOf(app.accounts[0]).call());
      if(this._withdraw === null) this._withdraw = this._details.myLiquidity;
      this.token0 = await this.loadContract('IERC20', this._details.token0);
      this.token1 = await this.loadContract('IERC20', this._details.token1);
      this._details.token0Name = await this.token0.methods.name().call();
      this._details.token1Name = await this.token1.methods.name().call();
      this._details.token0Symbol = await this.token0.methods.symbol().call();
      this._details.token1Symbol = await this.token1.methods.symbol().call();
      this._details.reserves = await this.contract.methods.getReserves().call();
      this._details.allowance0 = new app.web3.utils.BN(await this.token0.methods.allowance(app.accounts[0], this.address).call());
      this._details.balance0 = new app.web3.utils.BN(await this.token0.methods.balanceOf(app.accounts[0]).call());
      if(this._deposit0 === null) this._deposit0 = this._details.balance0;
      this._details.allowance1 = new app.web3.utils.BN(await this.token1.methods.allowance(app.accounts[0], this.address).call());
      this._details.balance1 = new app.web3.utils.BN(await this.token1.methods.balanceOf(app.accounts[0]).call());
      if(this._deposit1 === null) this._deposit1 = this._details.balance1;
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
        'Token 0': html`${this._details.token0Name} (<a href="${this.explorer(this._details.token0)}">${this.ellipseAddress(this._details.token0)}</a>)`,
        'Token 1': html`${this._details.token1Name} (<a href="${this.explorer(this._details.token1)}">${this.ellipseAddress(this._details.token1)}</a>)`,
        'Token 0 Reserves': this._details.reserves[0],
        'Token 1 Reserves': this._details.reserves[1],
        'Swap Fee': `${Math.round(this._details.swapFee * 1000) / 10}%`,
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
          ${this._details.reserves[0] === '0' && this._details.reserves[1] === '0' ? html`
            <p>This is the initial deposit for this pool. The ratio of the tokens will be set by the amount you deposit.</p>
          ` : html`
            <p>Deposit will be in same ratio as pool. The amounts input will be maximum values to deposit.</p>
          `}
          <form @submit="${this.deposit.bind(this)}">
            <fieldset>
              <label>
                <span>
                  ${this._details.token0Symbol} to deposit
                </span>
                <input name="token0" type="number" @change="${this.depositChange.bind(this)}" value="${this._deposit0.toString(10)}">
              </label>
              <span class="preview">
                ${this._details.balance0.gt(new app.web3.utils.BN(0))
                  ? `${this._deposit0.mul(new app.web3.utils.BN(100)).div(this._details.balance0)}% of ${this._details.balance0.toString(10)}`
                  : 'Zero Balance'}
              </span>
              <label>
                <span>
                  ${this._details.token1Symbol} to deposit
                </span>
                <input name="token1" type="number" @change="${this.depositChange.bind(this)}" value="${this._deposit1.toString(10)}">
              </label>
              <span class="preview">
                ${this._details.balance1.gt(new app.web3.utils.BN(0))
                  ? `${this._deposit1.mul(new app.web3.utils.BN(100)).div(this._details.balance1)}% of ${this._details.balance1.toString(10)}`
                  : 'Zero Balance'}
              </span>
            </fieldset>
            <div class="commands">
              ${this._deposit0.add(this._deposit1).eq(new app.web3.utils.BN(0)) ? html`
                <button class="secondary" disabled>Nothing to Deposit</button>
              ` : this._deposit0.gt(this._details.balance0) || this._deposit1.gt(this._details.balance1) ? html`
                <button class="secondary" disabled>Insufficient Funds</button>
              ` : this._deposit0.gt(this._details.allowance0) ? html`
                <button type="submit">Approve ${this._details.token0Symbol}</button>
              ` : this._deposit1.gt(this._details.allowance1) ? html`
                <button type="submit">Approve ${this._details.token1Symbol}</button>
              ` : html`
                <button type="submit">Deposit to Pool</button>
              `}
            </div>
          </form>
        ` },
      { name: 'Withdraw',
        render: () => html`
          ${this._details.myLiquidity.gt(new app.web3.utils.BN(0)) ? html`
            <dl>
              <dt>My Share of Liquidity</dt>
              <dd>${this._details.myLiquidity.mul(new app.web3.utils.BN(100000)).div(this._details.totalLiquidity) / 1000}%</dd>
              <dt>${this._details.token0Symbol}</dt>
              <dd>${this._details.myLiquidity.mul(new app.web3.utils.BN(this._details.reserves[0])).div(this._details.totalLiquidity)}</dd>
              <dt>${this._details.token1Symbol}</dt>
              <dd>${this._details.myLiquidity.mul(new app.web3.utils.BN(this._details.reserves[1])).div(this._details.totalLiquidity)}</dd>
            </dl>
            <form @submit="${this.withdraw.bind(this)}">
              <fieldset>
                <label>
                  <span>
                    Liquidity to Withdraw
                  </span>
                  <input name="withdraw" type="number" @change="${this.withdrawChange.bind(this)}" value="${this._withdraw.toString(10)}">
                </label>
                <span class="preview">
                  ${this._withdraw.mul(new app.web3.utils.BN(100)).div(this._details.myLiquidity)}% of ${this._details.myLiquidity.toString(10)}
                </span>
              </fieldset>
              <div class="commands">
                ${this._withdraw.gt(this._details.myLiquidity) ? html`
                  <button class="secondary" disabled>Insufficient Liquidity</button>
                ` : html`
                  <button type="submit">Withdraw from Pool</button>
                `}
              </div>
            </form>
          ` : html`
            <p>No Liquidity in the Pool</p>
          `}
        ` },
    ];
  }
  depositChange(event) {
    if(event.target.name === 'token0') {
      this._deposit0 = new app.web3.utils.BN(event.target.value);
    } else {
      this._deposit1 = new app.web3.utils.BN(event.target.value);
    }
  }
  withdrawChange(event) {
    this._withdraw = new app.web3.utils.BN(event.target.value);
  }
  async deposit(event) {
    event.preventDefault();
    try {
      if(this._deposit0.gt(this._details.allowance0)) {
        await this.send(this.token0.methods.approve(this.address, this._deposit0));
      } else if(this._deposit1.gt(this._details.allowance1)) {
        await this.send(this.token1.methods.approve(this.address, this._deposit1));
      } else {
        await this.send(this.contract.methods.deposit(this._deposit0, this._deposit1));
      }
      await this.loadDetails();
    } catch(error) {
      this.displayError(error);
    }
  }
  async withdraw(event) {
    event.preventDefault();
    try {
      await this.send(this.contract.methods.withdraw(this._withdraw));
      await this.loadDetails();
    } catch(error) {
      this.displayError(error);
    }
  }
}
customElements.define('erc20-liquidity-pool-details', ERC20LiquidityPoolDetails);

