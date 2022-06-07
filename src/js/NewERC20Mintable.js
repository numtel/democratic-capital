import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';

export class NewERC20Mintable extends BaseElement {
  static properties = {
    groupAddress: {type: String},
  };
  constructor() {
    super();
  }
  extractValues() {
    return [
      this.querySelector('input[name="name"]').value,
      this.querySelector('input[name="symbol"]').value,
      this.querySelector('input[name="decimals"]').value,
    ];
  }
  render() {
    return html`
      <p>ERC20 token that can be minted by the group.</p>
      <p>The name and symbol can be changed later by the group.</p>
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
    `;
  }
}
customElements.define('new-erc20-mintable', NewERC20Mintable);


