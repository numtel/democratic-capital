import {AsyncTemplate, html} from '/utils/Template.js';
import {selfDescribingContract} from '/utils/index.js';

export default class FactoryBrowser extends AsyncTemplate {
  constructor(address) {
    super();
    this.set('address', address);
  }
  async init() {
    this.contract = await selfDescribingContract(config.contracts.FactoryBrowser.address);
    this.factory = await selfDescribingContract(config.contracts.VerifiedGroupFactory.address);
    this.set('count', Number(await this.factory.methods.childCount(this.address).call()));
    if(this.count > 0) {
      // TODO paging!
      this.set('result', await this.contract.methods.detailsMany(
        config.contracts.VerifiedGroupFactory.address, this.address, 0, 20
      ).call());
    }
  }
  async render() {
    if(this.count === 0) {
      return html`
        <p>Nothing found!</p>
      `;
    }
    return html`
      <ul>
      ${this.result.map(item => html`
        <li><a href="/${item.item}" $${this.link}>${item.name}</a> ${item.metaname} ${(new Date(item.created * 1000)).toString()}</li>
      `)}
      </ul>
    `;
  }
}

