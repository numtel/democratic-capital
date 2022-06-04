import {html} from 'lit';
import {BaseElement} from './BaseElement.js';
import {AppRouter} from './AppRouter.js';
import {app} from './Web3App.js';

export class AppHeading extends BaseElement {
  static properties = {
    connected: {type: Boolean, reflect: true},
  };
  constructor() {
    super();
    this.connected = false;
  }
  async connectedCallback() {
    super.connectedCallback();
    await app.initialized;
    this.connected = app.connected;
  }
  render() {
    return html`
      <header>
        <nav>
          <h1><a @click="${this.route}" href="/">Democratic Capital</a></h1>
          <ul>
            <li>
              <a @click="${this.route}" href="/groups">Groups</a>
            </li>
            <li>
              <a @click="${this.route}" href="/docs">Documentation</a>
            </li>
            <li>
              <a @click="${this.open}" href="https://github.com/numtel/democratic-capital">Github</a>
            </li>
          </ul>
        </nav>
        <button class="walletToggle" @click="${this.toggleWallet}">
          ${this.connected
            ? html`
              <span class="address">${this.ellipseAddress(app.accounts[0])}</span>
              <span class="disconnect">Disconnect</span>
              `
            : 'Connect Wallet'}
        </button>
      </header>
    `;
  }
  async toggleWallet() {
    if(app.connected) {
      await app.disconnect();
    } else {
      await app.connect();
      this.connected = app.connected;
    }
  }
}
customElements.define('app-heading', AppHeading);


export class AppHome extends BaseElement {
  render() {
    return html`
      <span class="tagline">Smart Contracts controlled publicly by actual humans</span>
      <main>
        <div id="test">
          <span>Elections for the Rest of Us</span>
        </div>
        <h3>Running on Optimism</h3>
        <p>Democratic Capital is deployed on the <a href="https://optimism.io">Optimism Ethereum Layer 2 Network</a> in order to obtain fast transactions and low gas fees.</p>
        <h3>Verified Humans</h3>
        <p>Every user of Democratic Capital must verify as a unique human  on <a href="https://coinpassport.net/">Coinpassport</a>. This ensures that votes are fair and not determined solely by who has the biggest wallet.</p>
        <h3>Unlimited Groups</h3>
        <p>Create a group for your friends, or for the next great social movement. Either way, you'll have the ability to decide collectively which contracts with which to transact.</p>
          <div class="commands">
            <button @click="${this.route}" href="/groups">Browse Groups</button>
          </div>
      </main>
    `;
  }
}

customElements.define('app-home', AppHome);

export class AppDocs extends BaseElement {
  render() {
    return html`
      <h3>Why use Democratic Capital?</h3>
      <p>Cryptocurrencies have generally been created and managed by people with lots of knowledge of software development, early adopters, or whales.</p>
      <p>Democratic Capital seeks to change this status-quo by offering the tools for anybody to create publicly managed contracts (e.g. tokens and liquidity pools) that are manipulated by binding elections of various types.</p>
      <p>This website is a frontend for these new types of (massively) multi-sig operations.</p>
      <p>By deploying and allowing a variety of the contracts described below, a group may manage themselves as they decide, forming a culture around their decision-making processes.</p>
      <h3>How a proposal works</h3>
      <p>A proposal's data is a transaction invoked on the main group contract. This can be any of the following methods:</p>
      <table>
        <thead>
          <tr>
            <th>Method Name</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>register</td>
            <td>Register a new user into the group</td>
          </tr>
          <tr>
            <td>unregister</td>
            <td>Unregister a user from the group</td>
          </tr>
          <tr>
            <td>ban</td>
            <td>Ban a user from the group and from re-registering with the same passport</td>
          </tr>
          <tr>
            <td>setVerifications</td>
            <td>Change the contract used to determine if an account has a registered passport</td>
          </tr>
          <tr>
            <td>allowContract</td>
            <td>Allow a new contract access to invoke any of these methods on the main group contract</td>
          </tr>
          <tr>
            <td>disallowContract</td>
            <td>Disallow a currently-allowed contract from invoking any method on the main group contract</td>
          </tr>
          <tr>
            <td>invoke</td>
            <td>Invoke any contract with any transaction data from the main group contract</td>
          </tr>
        </tbody>
      </table>
      <p>It is expected that any group may have multiple elections contracts filtered to different methods in order to use different parameters for each type. For example, longer duration and higher majority threshold for elections of allowContract than for register.</p>
      <h3>Types of Elections</h3>
      <ul>
        <li>
          <h4>ElectionsByMedian</h4>
          <p>Proposals made within an ElectionsByMedian contract determine their duration, majority threshold, and minimum participation values from the median of all the submitted ballots at the time of proposal creation.</p>
          <p>For example: If 3 people have submitted their configuration ballots, the configuration will be as follows:</p>
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Duration Vote</th>
                <th>Threshold Vote</th>
                <th>Participation Vote</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>3 days</td>
                <td>50%</td>
                <td>50%</td>
              </tr>
              <tr>
                <td>2</td>
                <td>6 days</td>
                <td>70%</td>
                <td>70%</td>
              </tr>
              <tr>
                <td>3</td>
                <td>16 days</td>
                <td>100%</td>
                <td>20%</td>
              </tr>
              <tr>
                <td>Median</td>
                <td>6 days</td>
                <td>70%</td>
                <td>50%</td>
              </tr>
            </tbody>
          </table>
          <p>Therefore, any new proposal will exist as an election for 6 days, requiring at least 50% of group members to vote with at least 70% of voters to support the proposal for it to pass.</p>
        </li>
        <li>
          <h4>ElectionsSimple <em>NYI</em></h4>
          <p>Proposal duration, majority threshold, and minimum participation values are set at the time of contract deployment and are not changeable.</p>
        </li>
        <li>
          <h4>ElectionsByMedianQuadratic <em>NYI</em></h4>
          <p>Like the standard ElectionsByMedian, except a token is specified at the time of contract deployment to be used as a vote multiplier.</p>
          <p>The effect of paying for a vote is taken as the square-root of the amount paid. This has the effect of generating revenue for the group at the cost of voter equality.</p>
        </li>
        <li>
          <h4>ElectionsSimpleQuadratic <em>NYI</em></h4>
          <p>Same as ElectionsSimple but with the quadratic voting functionality describe above.</p>
        </li>
      </ul>
      <h3>Other contract types</h3>
      <ul>
        <li>
          <h4>OpenRegistrations</h4>
          <p>Allow any person with a wallet verified by Coinpassport to join the group without requiring any election.</p>
        </li>
        <li>
          <h4>OpenUnregistrations</h4>
          <p>Allow any registered user to leave the group without requiring any election.</p>
        </li>
        <li>
          <h4>ERC20 <em>NYI</em></h4>
          <p>Create a token that can be minted only by the group.</p>
        </li>
        <li>
          <h4>SwapPair <em>NYI</em></h4>
          <p>Modelled after a Uniswap V2 liquidity pool, a SwapPair allows a group to manage a pool of two tokens.</p>
          <p>The group may elect to deposit or withdraw from either side of the pool, attempting to adjust the price or liquidity as they desire.</p>
        </li>
        <li>
          <h4>Fundraiser <em>NYI</em></h4>
          <p>Specify a token type, minimum raise amount, and campaign end date on contract deployment.</p>
          <p>Users will be able to withdraw their funds after campaign end if the minimum raise amount is not met. Otherwise, the group will be able to transfer the funds if the amount is met.</p>
        </li>
        <li>
          <h4><em>Other contract types?</em></h4>
          <p>Democratic Capital is an open-source project on Github. If you can imagine another type of contract, please submit an issue or pull request.</p>
        </li>
      </ul>
    `;
  }
}

customElements.define('app-docs', AppDocs);

export class AppVerify extends BaseElement {
  render() {
    return html`
      <p>To use Democratic Capital, you must first verify your wallet on Coinpassport.</p>
      <div class="commands">
        <button @click="${this.open}" href="https://coinpassport.net/">
          Open Coinpassport...
        </button>
      </div>
    `;
  }
}

customElements.define('app-verify', AppVerify);
