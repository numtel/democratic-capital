import {AsyncTemplate, html} from '/utils/Template.js';
import {selfDescribingContract, ZERO_ACCOUNT} from '/utils/index.js';
import Paging from '/components/Paging.js';

export default class FactoryBrowser extends AsyncTemplate {
  constructor(address) {
    super();
    this.set('address', address);
  }
  async init() {
    this.contract = await selfDescribingContract(config.contracts.FactoryBrowser.address);
    this.factory = await selfDescribingContract(config.contracts.VerifiedGroupFactory.address);
  }
  async count() {
    return Number(await this.factory.methods.childCount(this.address).call());
  }
  async fetch(start, count) {
    return await this.contract.methods.detailsMany(
      config.contracts.VerifiedGroupFactory.address, this.address, start, count
    ).call();
  }
  async render() {
    let parentUrl = '/' + this.address;
    if(this.address === ZERO_ACCOUNT) parentUrl = '';
    return html`${new Paging(this.count.bind(this), this.fetch.bind(this), (result, options) => html`
      <div class="white window">
        <fieldset>
        <legend>Child Contracts</legend>
        ${options}
        <table>
        <thead>
          <th>Name</th>
          <th>Type</th>
          <th>Created</th>
        </thead>
        <tbody>
        ${result.map(item => html`
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
    `)}`;
  }
}

