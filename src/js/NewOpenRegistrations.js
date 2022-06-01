import {html, css, ref} from './lit-all.min.js';
import {BaseElement} from './BaseElement.js';

export class NewOpenRegistrations extends BaseElement {
  constructor() {
    super();
  }
  extractValues() {
    return [];
  }
  render() {
    return html`
      <p>Allow registrations from any verified account.</p>
    `;
  }
}
customElements.define('new-open-registrations', NewOpenRegistrations);
