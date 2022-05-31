import {html, css} from './lit-all.min.js';
import {BaseElement} from './BaseElement.js';

export class GroupDetails extends BaseElement {
  static properties = {
    address: {type: String},
  };
  constructor() {
    super();
  }
  render() {
    return html`
      <a @click="${this.route}" href="/">Home</a>
      <h2>${this.address}</h2>
    `;
  }
}
customElements.define('group-details', GroupDetails);
