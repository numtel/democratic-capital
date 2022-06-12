import {Template, html} from '/utils/Template.js';
import {selfDescribingContract} from '/utils/index.js';

export default class DeployNew extends Template {
  constructor(factoryAddress) {
    super();
    this.set('factoryAddress', factoryAddress);
    this.set('loading', true);
    this.init();
  }
  async init() {
    this.set('loading', true);
    this.factory = await selfDescribingContract(app.web3, this.factoryAddress);
    const methodABI = this.factory.options.jsonInterface.filter(x => x.name === 'deployNew');
    if(methodABI.length > 0) {
      this.set('inputs', methodABI[0].inputs);
    } else {
      this.set('error', true);
    }
    this.set('loading', false);
    console.log(this.factory);
  }
  render() {
    if(this.loading) {
      return html`${app.router.loader}`;
    } else if(this.error) {
      return html`
        <p>Error loading factory!</p>
      `;
    }
    return html`
      <p>Deploy new! ${this.factoryAddress}</p>
      ${this.inputs && html`
        <pre>${this.inputs}</pre>
      `}
    `;
  }
}
