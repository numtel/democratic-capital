import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';
import {remaining} from './utils.js';

export class NewMemberTokenEmissions extends BaseElement {
  static properties = {
    groupAddress: {type: String},
    _loading: {state: true},
    _error: {state: true},
    _details: {state: true},
    _period: {state: true},
  };
  constructor() {
    super();
    this._loading = true;
    this._error = false;
    this._details = {};
    this._period = 86400;
  }
  async connectedCallback() {
    super.connectedCallback();
    this._loading = true;
    try {
      this._details.tokens = await this.childrenOfType(this.groupAddress, 'ERC20Mintable');
      this._details.tokenNames = [];
      for(let tokenAddress of this._details.tokens) {
        const contract = await this.loadContract('ERC20Mintable', tokenAddress);
        this._details.tokenNames.push(await contract.methods.name().call());
      }
    } catch(error) {
      console.error(error);
      this._error = true;
    }

    this._loading = false;
  }
  extractValues() {
    if(this._details.tokens.length === 0)
      throw new Error('Must deploy an ERC20Mintable contract first!');
    return [
      this.querySelector('select[name="token"]').value,
      this.querySelector('input[name="period"]').value,
      this.querySelector('input[name="amount"]').value,
      this.querySelector('input[name="name"]').value,
    ];
  }
  render() {
    if(this._loading) return html`
      <p>Loading...</p>
    `;
    if(this._error) return html`
      <p>Invalid Contract!</p>
    `;
    return html`
      <p>Provide regular emissions to group members of any group-owned ERC20Mintable.</p>
      <p>The token, period, and amount can be changed later by the group.</p>
      <p>Emissions begin when the contract is allowed by the group.</p>
      ${this._details.tokens.length === 0 ? html`
        <p class="notice">An ERC20Mintable contract must be deployed before deploying a MemberTokenEmissions contract!</p>
      ` : html`
      <label>
        <span>Name</span>
        <input name="name">
      </label>
      <label>
        <span>Token</span>
        <select name="token">
          ${this._details.tokens.map((address, index) => html`
            <option value="${address}">
              ${this._details.tokenNames[index]} (${this.ellipseAddress(address)})
            </option>
          `)}
        </select>
      </label>
      <label>
        <span>Emission Period in Seconds</span>
        <input name="period" @change="${this.periodChange}" type="number" min="0" step="1" value="${this._period}">
      </label>
      <span class="preview">${remaining(this._period)}</span>
      <label>
        <span>Emission Amount</span>
        <input name="amount" type="number" min="1" step="1">
      </label>
      <p>Must include trailing zeros corresponding to number of decimals of the token.</p>
      `}
    `;
  }
  periodChange(event) {
    this._period = Number(event.target.value);
  }
}
customElements.define('new-member-token-emissions', NewMemberTokenEmissions);


