import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';

export class OpenUnregistrationsDetails extends BaseElement {
  static properties = {
    address: {type: String},
    allowed: {type: Boolean},
    groupAddress: {type: String},
  };
  async unregister() {
    try {
      const contract = await this.loadContract('OpenUnregistrations', this.address);
      await this.send(contract.methods.unregister());
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
        ${this.allowed
          ? html`Yes`
          : html`<strong>No</strong>`}
      </dd>
      </main>
      <div class="commands">
        <button @click="${this.unregister}">Unregister</button>
      </div>
    `;
  }
}
customElements.define('open-unregistrations-details', OpenUnregistrationsDetails);

