import {AsyncTemplate, html} from '/utils/Template.js';
import {selfDescribingContract, explorer, ZERO_ACCOUNT} from '/utils/index.js';
import FactoryBrowser from '/components/FactoryBrowser.js';
import AllowedContracts from '/components/AllowedContracts.js';
import TopMenu from '/components/TopMenu.js';
import Overview from '/components/Overview.js';

export default class Details extends AsyncTemplate {
  constructor(address, parent) {
    super();
    this.set('address', address);
    this.set('parent', parent);
    document.title = 'Item Details';
  }
  async init() {
    this.contract = await selfDescribingContract(this.address);
    if(this.parent) {
      this.parentContract = await selfDescribingContract(this.parent);
    }
    const group = this.parent ? this.parentContract : this.contract;
    if('contractAllowed' in group.methods) {
      const accounts = await app.wallet.accounts;
      this.set('isAllowed', await group.methods.contractAllowed(accounts[0]).call());
    }
    if('name' in this.contract.methods) {
      this.set('name', await this.contract.methods.name().call());
    } else {
      this.set('name', this.contract.metaname);
    }
    this.overview = this.contract.metadata.overview;
    if(this.overview) {
      for(let key of Object.keys(this.overview)) {
        const input = this.contract.options.jsonInterface
          .filter(x => x.name === key)[0];
        this.overview[key] = Object.assign(this.overview[key], input);
        // TODO overview when there's an argument
        this.overview[key].result = await this.contract.methods[key]().call();
      }
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
        <p><a href="${explorer(this.address)}" $${this.link}>${this.address}</a> ${this.contract.metaname}</p>
        ${this.overview && new Overview(this.overview)}
        ${'methods' in this.contract.metadata && html`
          <menu>
            ${Object.keys(this.contract.metadata.methods).map(method =>
              (!this.contract.metadata.methods[method].onlyAllowed || this.isAllowed) && html`
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
          key === 'Allowed' ? new AllowedContracts(this.address, this.parent) :
          '');
      })}
    `;
  }
}
