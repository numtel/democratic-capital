import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';

export class NewRegistrationsByElection extends BaseElement {
  static properties = {
    groupAddress: {type: String},
    _loading: {state: true},
    _error: {state: true},
    _details: {state: true},
  };
  constructor() {
    super();
    this._loading = true;
    this._error = false;
    this._details = {};
  }
  async connectedCallback() {
    super.connectedCallback();
    this._loading = true;
    try {
      this._details.children = await this.allGroupChildren(this.groupAddress);
    } catch(error) {
      console.error(error);
      this._error = true;
    }

    this._loading = false;
  }
  extractValues() {
    return [
      this.querySelector('select[name="elections"]').value,
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
      <p>Allow new users to submit a proposal that, if passed, results in their membership into the group.</p>
      <p>The election contract can be changed later by the group.</p>
      ${Object.keys(this._details.children).length === 0 ? html`
        <p class="notice">An elections contract must be deployed before deploying a NewRegistrationsByElection contract!</p>
      ` : html`
      <label>
        <span>Name</span>
        <input name="name">
      </label>
      <label>
        <span>Elections Contract</span>
        <select name="elections">
          ${Object.keys(this._details.children).map(childType => html`
            <optgroup label="${childType}">
              ${this._details.children[childType].map(address => html`
                <option>${address}</option>
              `)}
            </optgroup>
          `)}
        </select>
      </label>
      `}
    `;
  }
}
customElements.define('new-registrations-by-election', NewRegistrationsByElection);



