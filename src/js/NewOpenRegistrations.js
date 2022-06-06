import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';

export class NewOpenRegistrations extends BaseElement {
  constructor() {
    super();
  }
  extractValues() {
    return [this.querySelector('input[name="name"]').value];
  }
  render() {
    return html`
      <p>Allow registrations from any verified account.</p>
      <label>
        <span>Name</span>
        <input name="name">
      </label>
    `;
  }
}
customElements.define('new-open-registrations', NewOpenRegistrations);
