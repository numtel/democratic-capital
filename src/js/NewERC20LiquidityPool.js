import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';
import {InputTokenAddress} from './InputTokenAddress.js';

export class NewERC20LiquidityPool extends BaseElement {
  static properties = {
    groupAddress: {type: String},
    _fee: {state: true},
  };
  constructor() {
    super();
    this._fee = 0;
  }
  extractValues() {
    return [
      this.querySelector('input[name="token0"]').value,
      this.querySelector('input[name="token1"]').value,
      Math.floor((Number(this.querySelector('input[name="fee"]').value) / 100) * 0xffffffff),
      this.querySelector('input[name="name"]').value,
      this.querySelector('input[name="symbol"]').value,
      this.querySelector('input[name="decimals"]').value,
    ];
  }
  render() {
    return html`
      <p>Liquidity Pool that can be minted by the group.</p>
      <p>The name, symbol, and fee can be changed later by the group.</p>
      <label>
        <span>Name</span>
        <input name="name">
      </label>
      <label>
        <span>Symbol</span>
        <input name="symbol">
      </label>
      <label>
        <span>Decimals</span>
        <input name="decimals" type="number" min="0" max="20" value="6" step="1">
      </label>
      <input-token-address label="Token 0 Address" name="token0"></input-token-address>
      <input-token-address label="Token 1 Address" name="token1"></input-token-address>
      <label>
        <span>Swap Fee in Percent</span>
        <input name="fee" @change="${this.feeChange}" type="number" min="0" max="100" step="0.1" value="${this._fee}">
      </label>
      <span class="preview">${this._fee}%</span>
    `;
  }
  feeChange(event) {
    this._fee = Number(event.target.value);
  }
}
customElements.define('new-erc20-liquidity-pool', NewERC20LiquidityPool);


