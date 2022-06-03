import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';

export class OpenUnregistrationsDetails extends BaseElement {
  static properties = {
    address: {type: String},
    groupAddress: {type: String},
  };
  async unregister() {
    try {
      const contract = await this.loadContract('OpenUnregistrations', this.address);
      await this.send(contract.methods.unregister());
      this.route('/group/' + this.groupAddress);
    } catch(error) {
      console.error(error);
      alert(error.reason);
    }
  }
  render() {
    return html`
      <div class="commands">
        <button @click="${this.unregister}">Unregister</button>
      </div>
    `;
  }
}
customElements.define('open-unregistrations-details', OpenUnregistrationsDetails);

