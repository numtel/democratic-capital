import {AsyncTemplate, html} from '/utils/Template.js';
import {selfDescribingContract, ZERO_ACCOUNT} from '/utils/index.js';

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
      return html``;
    }
    let parentUrl = '/' + this.address;
    if(this.address === ZERO_ACCOUNT) parentUrl = '';
    return html`
      <div class="white window">
        <fieldset>
        <legend>Child Contracts</legend>
        <table>
        <thead>
          <th>Name</th>
          <th>Type</th>
          <th>Created</th>
        </thead>
        <tbody>
        ${this.result.map(item => html`
          <tr>
          <td>
            <a href="${parentUrl}/${item.item}" $${this.link}>
              ${item.name || html`<i>Unnamed</i>`}
            </a>
          </td>
          <td>${item.metaname}</td>
          <td>${(new Date(item.created * 1000)).toLocaleString()}</td>
          </tr>
        `)}
        </tbody>
        </table>
        </fieldset>
      </div>
    `;
  }
}

