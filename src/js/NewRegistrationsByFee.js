import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';

export class NewRegistrationsByFee extends BaseElement {
  extractValues() {
    return [
      this.querySelector('input[name="token"]').value,
      this.querySelector('input[name="amount"]').value,
      this.querySelector('input[name="name"]').value,
    ];
  }
  render() {
    return html`
      <p>Allow new users register by paying a fee in the specified token.</p>
      <p>The fee token and amount can be changed later by the group.</p>
      <label>
        <span>Name</span>
        <input name="name">
      </label>
      <label>
        <span>Fee Token Address</span>
        <input name="token" required pattern="^0x[a-fA-F0-9]{40}$">
      </label>
      <label>
        <span>Fee Amount</span>
        <input name="amount" tpe="number" min="1" step="1">
      </label>
      <p>Must include trailing zeros corresponding to number of decimals of the token.</p>
    `;
  }
}
customElements.define('new-registrations-by-fee', NewRegistrationsByFee);


