import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';

export class NewOpenUnregistrations extends BaseElement {
  constructor() {
    super();
  }
  extractValues() {
    return [];
  }
  render() {
    return html`
      <p>Allow free unregistrations.</p>
    `;
  }
}
customElements.define('new-open-unregistrations', NewOpenUnregistrations);

