import {AsyncTemplate, html} from '/utils/Template.js';
import {selfDescribingContract, ZERO_ACCOUNT} from '/utils/index.js';

export default class FactoryBrowser extends AsyncTemplate {
  constructor(factory) {
    super();
    this.set('factoryAddress', factory);
  }
  async init() {
    this.contract = await selfDescribingContract(config.contracts.FactoryBrowser.address);
    this.factory = await selfDescribingContract(this.factoryAddress);
    this.set('count', Number(await this.factory.methods.childCount(ZERO_ACCOUNT).call()));
    if(this.count > 0) {
      this.set('result', await this.contract.methods.detailsMany(
        this.factoryAddress, ZERO_ACCOUNT, 0, 20
      ).call());
    }
  }
  render() {
    if(this.count === 0) {
      return html`
        <p>Nothing found!</p>
      `;
    }
    return html`
      <ul>
      ${this.result.map(item => html`
        <li><a href="/${item.item}" $${this.link}>${item.item}</a></li>
      `)}
      </ul>
    `;
  }
}

