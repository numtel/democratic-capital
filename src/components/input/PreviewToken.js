import {AsyncTemplate, html} from '/utils/Template.js';
import {explorer, isAddress} from '/utils/index.js';
import ERC20 from '/utils/ERC20.js';

export default class PreviewToken extends AsyncTemplate {
  constructor(address) {
    super();
    this.set('token', new ERC20(address));
  }
  async init() {
    this.set('name', await this.token.name());
    this.set('symbol', await this.token.symbol());
    this.set('decimals', await this.token.decimals());
  }
  async render() {
    return html`
      ${isAddress(this.token.address) && html`
        Name: <a href="${explorer(this.token.address)}" $${this.link}>${this.name || 'Unknown'}</a>,
        Symbol: ${this.symbol || 'Unknown'},
        Decimals: ${this.decimals || 'Unknown'}
      `}
    `;
  }
}
