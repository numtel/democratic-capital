import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';
import {remaining} from './utils.js';

export class NewFundraiser extends BaseElement {
  static properties = {
    groupAddress: {type: String},
    _duration: {state: true},
  };
  constructor() {
    super();
    this._duration = 86400 * 14;
  }
  extractValues() {
    return [
      this.querySelector('input[name="token"]').value,
      this.querySelector('input[name="amount"]').value,
      this.querySelector('input[name="duration"]').value,
      this.querySelector('input[name="name"]').value,
    ];
  }
  render() {
    return html`
      <p>Collect funds in a specific token for a set duration. If the goal is met at the end, the group may transfer the funds as desired. Otherwise, depositors may withdraw their funds.</p>
      <p>None of the deployment parameters may be changed later by the group.</p>
      <label>
        <span>Name</span>
        <input name="name">
      </label>
      <label>
        <span>Token Address</span>
        <input name="token" required pattern="^0x[a-fA-F0-9]{40}$">
      </label>
      <label>
        <span>Goal Amount</span>
        <input name="amount" required type="number" min="1" step="1">
      </label>
      <p>Must include trailing zeros corresponding to number of decimals of the token.</p>
      <label>
        <span>Duration in Seconds</span>
        <input name="duration" @change="${this.durationChange}" type="number" min="1" step="1" value="${this._duration}">
      </label>
      <span class="preview">${remaining(this._duration)}</span>
    `;
  }
  durationChange(event) {
    this._duration = Number(event.target.value);
  }
}
customElements.define('new-fundraiser', NewFundraiser);


