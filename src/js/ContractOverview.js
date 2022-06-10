import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';

export class ContractOverview extends BaseElement {
  static properties = {
    content: {type: Object},
  }
  constructor() {
    super();
    this.content = {};
  }
  render() {
    return html`
      <main>
        <h3>Overview</h3>
        <dl>
          ${Object.keys(this.content).map(key => html`
            <dt>${key}</dt>
            <dd>
            ${this.isAddress(this.content[key]) ? html`
              <a href="${this.explorer(this.content[key])}" @click="${this.open}">${this.content[key]}</a>
            ` : html`
              ${this.content[key]}
            `}
          `)}
        </dl>
      </main>
    `;
  }
}

customElements.define('contract-overview', ContractOverview);
