import {AsyncTemplate, html} from '/utils/Template.js';
import {selfDescribingContract, ellipseAddress} from '/utils/index.js';
import Paging from '/components/Paging.js';

export default class FactoryBrowser extends AsyncTemplate {
  constructor(address, parent) {
    super();
    this.set('address', address);
    this.set('parent', parent);
  }
  async init() {
    this.contract = await selfDescribingContract(this.address);
    this.browser = await selfDescribingContract(config.contracts.FactoryBrowser.address);
  }
  async count() {
    return Number(await this.contract.methods.allowedContractCount().call());
  }
  async fetch(start, count) {
    return await this.browser.methods.allowedMany(
      this.address, start, count
    ).call();
  }
  async render() {
    let parentUrl = '/' + this.address;
    if(this.parent) parentUrl = '/' + this.parent;
    return html`${new Paging(this.count.bind(this), this.fetch.bind(this), (result, options) => html`
      <div class="white window">
        <fieldset>
        <legend>Allowed Contracts</legend>
        ${options}
        <table>
        <thead>
          <th>Name</th>
          <th>Type</th>
        </thead>
        <tbody>
        ${result.map(item => html`
          <tr>
          <td>
            <a href="${parentUrl}/${item.item}" $${this.link}>
              ${item.name || ellipseAddress(item.item)}
            </a>
          </td>
          <td>${item.metaname || 'Unknown'}</td>
          </tr>
        `)}
        </tbody>
        </table>
        </fieldset>
      </div>
    `)}`;
  }
}

