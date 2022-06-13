import {AsyncTemplate, html} from '/utils/Template.js';
import {selfDescribingContract, explorer} from '/utils/index.js';
import FactoryBrowser from '/components/FactoryBrowser.js';

export default class Details extends AsyncTemplate {
  constructor(address) {
    super();
    this.set('address', address);
  }
  async init() {
    this.contract = await selfDescribingContract(this.address);
  }
  render() {
    return html`
      <h3>${this.contract.metadata.name}</h3>
      <p><a href="${explorer(this.address)}">${this.address}</a></p>
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
              ? config.contracts.VerifiedGroupFactory.address
              : this.address) :
          '');
      })}
    `;
  }
}
