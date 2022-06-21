import {Template, html} from '/utils/Template.js';
import {ellipseAddress} from '/utils/index.js';

export default class TopMenu extends Template {
  constructor(slot) {
    super();
    this.set('slot', slot);
    app.wallet.onStatusChange = this.walletChanged.bind(this);
    app.wallet.triggerStatusHandler();
  }
  render() {
    return html`
      <div class="top-menu-bar">
        <a href="/" $${this.link}>Democratic Capital</a>
        <a href="/${config.contracts.VerifiedGroupFactory.address}" $${this.link}>All Groups</a>
        ${this.slot}
        <a href="https://github.com/numtel/democratic-capital" $${this.link}>Github</a>
        <a href="javascript:void 0" onclick="tpl(this).toggleWallet()" class="wallet">${app.wallet.connected ? html`
          <span class="address">${ellipseAddress(this.account)}</span>
          <span class="hover">Disconnect</span>
        `: 'Connect Wallet'}</a>
      </div>
    `;
  }
  toggleWallet() {
    if(app.wallet.connected) {
      app.wallet.disconnect();
    } else {
      app.wallet.connect();
    }
  }
  walletChanged(accounts) {
    this.set('account', accounts[0]);
  }
}

