import {Template, html} from '/utils/Template.js';
import TopMenu from '/components/TopMenu.js';

export default class Home extends Template {
  constructor() {
    super();
    document.title = 'Democratic Capital';
  }
  render() {
    return html`
      ${new TopMenu}
      <div class="blue window">
        <h1>Democratic Capital</h1>
      </div>
      <div class="blue window">
        <p>Welcome to Democratic Capital, the place where your dreams of exercising less than absolute power come true!</p>
      <a class="button" href="/${config.contracts.VerifiedGroupFactory.address}" $${this.link}>Browse Groups...</a>
      </div>
      <div class="white window">
        <h3>Running on Roll Test L2</h3>
        <p>Democratic Capital is deployed on the <a $${this.link} href="https://roll.demo.caldera.dev/">Roll Test Layer 2 Network</a>.</p>
        <h3>Verified Humans</h3>
        <p>Every user of Democratic Capital must verify as a unique human  on <a $${this.link} href="https://coinpassport.net/">Coinpassport</a>. This ensures that votes are fair and not determined solely by who has the biggest wallet. But for this test version, there's a mock contract. Just <a $${this.link} href="https://roll.calderaexplorer.xyz/address/0x5347B159EC6197bf5901503E3f72Fa8227aF9982/write-contract#address-tabs">go on there and verify yourself</a>. Perform 'setStatus' with your account address and put a value of 0 (zero) for the expiration to be verified for one year.</p>
        <h3>Unlimited Groups</h3>
        <p>Create a group for your friends, or for the next great social movement. Either way, you'll have the ability to decide collectively which contracts with which to transact.</p>
      </div>
    `;
  }
}
