import {AsyncTemplate, html} from '/utils/Template.js';
import {selfDescribingContract} from '/utils/index.js';

export default class FactoryBrowser extends AsyncTemplate {
  constructor(address) {
    super();
    this.set('address', address);
  }
  async init() {
    this.contract = await selfDescribingContract(this.address);
    this.browser = await selfDescribingContract(config.contracts.FactoryBrowser.address);
    this.set('count', Number(await this.contract.methods.allowedContractCount().call()));
    if(this.count > 0) {
      // TODO paging!
      this.set('result', await this.browser.methods.allowedMany(
        this.address, 0, 20
      ).call());
    }
  }
  async render() {
    if(this.count === 0) {
      return html``;
    }
    return html`
      <div class="white window">
        <fieldset>
        <legend>Allowed Contracts</legend>
        <table>
        <thead>
          <th>Name</th>
          <th>Type</th>
        </thead>
        <tbody>
        ${this.result.map(item => html`
          <tr>
          <td>
            <a href="${app.router.path}/${item.item}" $${this.link}>
              ${item.name || item.item}
            </a>
          </td>
          <td>${item.metaname || 'Unknown'}</td>
          </tr>
        `)}
        </tbody>
        </table>
        </fieldset>
      </div>
    `;
  }
}

