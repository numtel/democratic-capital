import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';

export class InputTokenAddress extends BaseElement {
  static properties = {
    name: {type: String},
    label: {type: String},
    value: {type: String, reflect: true},
    _details: {state: true},
  };
  constructor() {
    super();
    this.value = '';
    this._details = '';
  }
  render() {
    return html`
      <label>
        <span>${this.label}</span>
        <input name="${this.name}" @change="${this.setValue}" value="${this.value}" required pattern="^0x[a-fA-F0-9]{40}$">
      </label>
      <span class="preview">${this._details}</span>
    `;
  }
  async setValue(event) {
    if(this.isAddress(event.target.value)) {
      this.value = event.target.value;
      this._details = 'Loading...'
      try {
        const token = await this.loadContract('IERC20', this.value);
        const name = await token.methods.name().call();
        const symbol = await token.methods.symbol().call();
        this._details = `${name} (${symbol})`;
      } catch(error) {
        console.error(error);
        this._details = 'Error while fetching name/symbol. Is this an ERC20 address?';
      }
    }
  }
}
customElements.define('input-token-address', InputTokenAddress);
