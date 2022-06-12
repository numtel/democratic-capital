import {AsyncTemplate, html} from '/utils/Template.js';
import {selfDescribingContract} from '/utils/index.js';

export default class DeployNew extends AsyncTemplate {
  constructor(factoryAddress) {
    super();
    this.set('factoryAddress', factoryAddress);
  }
  async init() {
    this.factory = await selfDescribingContract(app.web3, this.factoryAddress);
    const methodABI = this.factory.options.jsonInterface.filter(x => x.name === 'deployNew');
    this.set('inputs', methodABI[0].inputs);
  }
  render() {
    return html`
      <p>Deploy new! ${this.factoryAddress}</p>
      ${this.inputs && html`
        <pre>${this.inputs}</pre>
      `}
    `;
  }
}
