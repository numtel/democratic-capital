import {AsyncTemplate, html} from '/utils/Template.js';

export default class PreviewQuadratic extends AsyncTemplate {
  constructor(value, input) {
    super();
    this.set('value', value);
    this.set('input', input);
  }
  async init() {
    const BN = app.web3.utils.BN;
    const balance = new BN(this.input.balance);
    const amount = new BN(this.value);
    const multiplier = new BN(this.input.multiplier);
    this.exceedsBalance = balance.lt(amount);
    this.power = Math.floor(Math.sqrt(amount.div(multiplier).add(new BN(1)).toNumber()));
  }
  async render() {
    return html`
      ${this.exceedsBalance ? 'Insufficient Funds'
        : `Vote Power: ${this.power}`}
    `;
  }
}
