import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';

export class OpenRegistrationsDetails extends BaseElement {
  static properties = {
    address: {type: String},
    groupAddress: {type: String},
  };
  async register() {
    try {
      const contract = await this.loadContract('OpenRegistrations', this.address);
      await this.send(contract.methods.register());
      this.route('/group/' + this.groupAddress);
    } catch(error) {
      this.displayError(error);
    }
  }
  render() {
    return html`
      <div class="commands">
        <button @click="${this.register}">Register</button>
      </div>
    `;
  }
}
customElements.define('open-registrations-details', OpenRegistrationsDetails);
