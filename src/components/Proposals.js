import {AsyncTemplate, html} from '/utils/Template.js';
import {selfDescribingContract} from '/utils/index.js';

export default class Proposals extends AsyncTemplate {
  constructor(address, parent) {
    super();
    this.set('address', address);
    this.set('parent', parent);
  }
  async init() {
    this.contract = await selfDescribingContract(this.address);
    const accounts = await app.wallet.accounts;
    this.set('count', await this.contract.methods.count().call());
    this.set('proposals', await this.contract.methods.detailsMany(0, this.count, accounts[0]).call());
  }
  async render() {
    return html`
      <div class="white window">
        <p>foopers ${this.count}</p>
        <pre class="wrap">${JSON.stringify(this.proposals, null, 2)}</pre>
      </div>
    `;
  }
}
