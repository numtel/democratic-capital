import {AsyncTemplate, html} from '/utils/Template.js';
import {selfDescribingContract} from '/utils/index.js';

export default class Details extends AsyncTemplate {
  constructor(address) {
    super();
    this.set('address', address);
  }
  async init() {
    this.factory = await selfDescribingContract(this.address);
    console.log(this.factory);
  }
  render() {
    return html`
      <p>Details! ${this.address}</p>
    `;
  }
}
