import {AsyncTemplate, html} from '/utils/Template.js';
import {selfDescribingContract, explorer, ZERO_ACCOUNT} from '/utils/index.js';
import FactoryBrowser from '/components/FactoryBrowser.js';
import AllowedContracts from '/components/AllowedContracts.js';
import TopMenu from '/components/TopMenu.js';

export default class Details extends AsyncTemplate {
  constructor(address, parent) {
    super();
    this.set('address', address);
    this.set('parent', parent);
    document.title = 'Item Details';
  }
  async init() {
    this.contract = await selfDescribingContract(this.address);
    if('name' in this.contract.methods) {
      this.set('name', await this.contract.methods.name().call());
    } else {
      this.set('name', this.contract.metaname);
    }
    document.title = this.name;
  }
  async render() {
    return html`
      ${new TopMenu(html`
        ${this.parent && html`
          <a href="/${this.parent}" $${this.link}>Parent</a>
        `}
      `)}
      <div class="blue window">
        <h2>${this.name}</h2>
        <p>Type: ${this.contract.metadata.name || this.contract.metaname}</p>
        <p><a href="${explorer(this.address)}">${this.address}</a> ${this.contract.metaname}</p>
        ${'methods' in this.contract.metadata && html`
          <menu>
            ${Object.keys(this.contract.metadata.methods).map(method => html`
              <li><a class="button" href="${app.router.path}/${method}" $${this.link}>${method}</a></li>
            `)}
          </menu>
        `}
      </div>
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
