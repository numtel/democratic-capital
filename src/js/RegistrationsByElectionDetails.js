import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';

export class RegistrationsByElectionDetails extends BaseElement {
  static properties = {
    address: {type: String},
    allowed: {type: String},
    groupAddress: {type: String},
  };
  async register() {
    try {
      const contract = await this.loadContract('RegistrationsByElection', this.address);
      await this.send(contract.methods.register());
      await this.route('/group/' + this.groupAddress);
    } catch(error) {
      this.displayError(error);
    }
  }
  render() {
    return html`
      <main>
      <h3>Overview</h3>
      <dl>
      <dt>Contract</dt>
      <dd><a href="${this.explorer(this.address)}" @click="${this.open}">${this.address}</a></dd>
      <dt>Allowed to Invoke</dt>
      <dd>
        ${this.allowed === 'true'
          ? html`Yes`
          : html`<strong>No</strong>`}
      </dd>
      </main>
      <div class="commands">
        <button @click="${this.register}">Register</button>
      </div>
    `;
  }
}
customElements.define('registrations-by-election-details', RegistrationsByElectionDetails);