import {AsyncTemplate, html} from '/utils/Template.js';
import {selfDescribingContract, explorer, ZERO_ACCOUNT} from '/utils/index.js';
import FactoryBrowser from '/components/FactoryBrowser.js';
import AllowedContracts from '/components/AllowedContracts.js';

export default class Details extends AsyncTemplate {
  constructor(address) {
    super();
    this.set('address', address);
  }
  async init() {
    this.contract = await selfDescribingContract(this.address);
    if('name' in this.contract.methods) {
      this.set('name', await this.contract.methods.name().call());
    } else {
      this.set('name', this.contract.metaname);
    }
  }
  async render() {
    return html`
      <h3>${this.name}</h3>
      <p>Type: ${this.contract.metadata.name || this.contract.metaname}</p>
      <p><a href="${explorer(this.address)}">${this.address}</a> ${this.contract.metaname}</p>
      ${'methods' in this.contract.metadata && html`
        <menu>
          ${Object.keys(this.contract.metadata.methods).map(method => html`
            <li><a href="/${this.address}/${method}" $${this.link}>${method}</a></li>
          `)}
        </menu>
      `}
      ${'display' in this.contract.metadata && Object.keys(this.contract.metadata.display).map(key => {
        const item = this.contract.metadata.display[key];
        return (
          key === 'FactoryBrowser' ?
            new FactoryBrowser(item.root
              ? ZERO_ACCOUNT
              : this.address) :
          key === 'Allowed' ? new AllowedContracts(this.address) :
          '');
      })}
    `;
  }
}
