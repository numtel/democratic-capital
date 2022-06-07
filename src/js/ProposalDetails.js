import {html, css} from 'lit';
import {BaseElement} from './BaseElement.js';
import {app} from './Web3App.js';
import {GroupComments} from './GroupComments.js'
import {remaining} from './utils.js';

export class ProposalDetails extends BaseElement {
  static properties = {
    groupAddress: {type: String},
    proposalAddress: {type: String},
    childTypeStr: {type: String},
    childAddress: {type: String},
    _loading: {state: true},
    _error: {state: true},
    _details: {state: true},
    hasQuadratic: {state: true},
    quadraticToken: {state: true},
    _quadraticSpend: {state: true},
  };
  constructor() {
    super();
    this._details = {};
    this._loading = true;
    this._error = false;
    this.hasQuadratic = false;
    this.quadraticToken = null;
    this._quadraticSpend = null;
  }
  async connectedCallback() {
    super.connectedCallback();
    this._loading = true;
    this.contract = await this.loadContract(this.childTypeStr, this.childAddress);
    this.hasQuadratic = 'voteQuadratic' in this.contract.methods;
    this._quadraticSpend = new app.web3.utils.BN(0);
    await this.fetchProposal();
    this._loading = false;
  }
  async fetchProposal() {
    this._loading = true;
    try {
      const details = await this.contract.methods.details(this.proposalAddress).call();
      details.dataDecoded = await this.decodeAbiFunction('IVerifiedGroup', details.data);
      if(details.dataDecoded.name === 'invoke') {
        details.invokeType = await this.childType(details.dataDecoded.params[0].value);
        if(details.invokeType) {
          details.invokeData = await this.decodeAbiFunction(details.invokeType, details.dataDecoded.params[1].value);
        }
      }
      details.myVote = app.connected
        ? Number(await this.contract.methods.voteValue(this.proposalAddress, app.accounts[0]).call())
        : null;
      this._details = details;
      this._details.currentTime = (await app.web3.eth.getBlock('latest')).timestamp;
      if(this.hasQuadratic) {
        this._details.quadraticMultiplier = new app.web3.utils.BN(await this.contract.methods.quadraticMultiplier().call());
        const tokenAddress = await this.contract.methods.quadraticToken().call();
        this.quadraticToken = await this.loadContract('IERC20', tokenAddress);
        this._details.tokenSymbol = await this.quadraticToken.methods.symbol().call();
        this._details.tokenDecimals = Number(await this.quadraticToken.methods.decimals().call());
        this._details.tokenBalance = new app.web3.utils.BN(await this.quadraticToken.methods.balanceOf(app.accounts[0]).call());
        this._details.tokenBalanceFP = this._details.tokenBalance.div((new app.web3.utils.BN(10)).pow(new app.web3.utils.BN(this._details.tokenDecimals)));
        this._details.allowance = new app.web3.utils.BN(await this.quadraticToken.methods.allowance(app.accounts[0], this.contract.options.address).call());
      }
    } catch(error) {
      console.error(error);
      this._error = true;
    }
    this._loading = false;
  }
  render() {
    if(this._loading) return html`
      <main><p>Loading...</p></main>
    `;
    if(this._error) return html`
      <main><p>Invalid Proposal!</p></main>
    `;
    const proposal = this._details;
    const timeLeft = Number(proposal.endTime) - this._details.currentTime;
    const rawThreshold = proposal._threshold / 0xffff;
    const totalVoters = Number(proposal.supporting) + Number(proposal.against);
    const supportLevel = totalVoters === 0 ? 0 : Number(proposal.supporting)
      / (Number(proposal.supporting)+Number(proposal.against));
    const votersRequired = Number(proposal.minVoters) - totalVoters;
    const threshold = rawThreshold * 100;
    return html`
      <nav class="breadcrumbs">
        <ol>
          <li><a @click="${this.route}" href="/groups">Groups</a></li>
          <li><a @click="${this.route}" href="/group/${this.groupAddress}">${this.ellipseAddress(this.groupAddress)}</a></li>
          <li><a @click="${this.route}" href="/group/${this.groupAddress}/${this.childTypeStr}/${this.childAddress}">${this.childTypeStr} (${this.ellipseAddress(this.childAddress)})</a></li>
          <li>Proposal: ${this.ellipseAddress(this.proposalAddress)}</li>
        </ol>
      </nav>
      <h2>Proposal Details</h2>
      <main>
        <h3>Overview</h3>
        <dl>
          <dt>Time Remaining</dt>
          <dd>${timeLeft > 0 ? html`
            ${remaining(timeLeft)} remaining
          ` : html`
            Election Completed
          `}
          <dt>Invoke Data</dt>
          <dd>
            ${proposal.dataDecoded.name}
            <ul class="invoke-params">
              ${proposal.dataDecoded.params.map(param => html`
                <li>
                  ${param.name === 'data' && proposal.invokeType ? html`
                    <span class="invoke-name">${proposal.invokeData.name}</span>
                    <ul class="invoke-params">
                      ${proposal.invokeData.params.map(param => html`
                        <li>
                          <span class="name">${param.name}</span>
                          <span class="value">
                            ${param.type === 'address' ? html`
                              <a @click="${this.open}" href="${this.explorer(param.value)}">
                                ${param.value}
                              </a>
                            ` : html`
                              ${param.value}
                            `}
                          </span>
                          <span class="type">${param.type}</span>
                        </li>
                      `)}
                    </ul>
                  ` : html`
                    <span class="name">${param.name}</span>
                    <span class="value">
                      ${param.type === 'address' ? html`
                        <a @click="${this.open}" href="${this.explorer(param.value)}">
                          ${param.value}
                        </a>
                      ` : html`
                        ${param.value}
                      `}
                    </span>
                    <span class="type">${param.type} ${proposal.invokeType}</span>
                  `}
                </li>
              `)}
            </ul>
          </dd>
          <dt>Status</dt>
          <dd>
            ${timeLeft > 0 ?
              proposal.passing ? html`<span class="proposal-passing">Majority and participation thresholds met</span>`
                : html`<span class="proposal-not-passing">Proposal will not pass with current support and participation levels</span>`
              : proposal.processed ? html`<span class="proposal-completed">Proposal passed and already processed</span>`
                : proposal.passed ? html`<span class="proposal-waiting">Proposal passed and awaiting processing</span>`
                  : html`<span class="proposal-failed">Proposal failed</span>`}
            ${proposal.myVote === 1 ? '(Voted in Support)' :
              proposal.myVote === 2 ? '(Voted Against)' : ''}
          </dd>
          <dt>Support Level</dt>
          <dd>
            ${Math.round(supportLevel* 10000) / 100}%
            (Minimum: ${Math.round(threshold * 100) / 100}%)
          </dd>
          <dt>Participation Level</dt>
          <dd>
            ${votersRequired > 0
              ? `${votersRequired}
                  ${votersRequired === 1
                    ? 'more voter required to meet participation threshold'
                    : 'more voters required to meet participation threshold'}`
              : `${totalVoters} ${totalVoters === 1 ? 'voter' : 'voters'}`}
            (Minimum: ${proposal.minVoters})
          </dd>
          <dt>Start Time</dt>
          <dd>${(new Date(proposal.startTime * 1000)).toString()}</dd>
          <dt>End Time</dt>
          <dd>${(new Date(proposal.endTime * 1000)).toString()}</dd>
        </dl>
      </main>
      ${timeLeft > 0 && proposal.myVote === 0 ? html`
        ${this.hasQuadratic ? html`
          <main>
            <h3>Submit Ballot</h3>
            <dl>
              <dt>My Balance</dt>
              <dd>${this._details.tokenBalanceFP.toString(10)} ${this._details.tokenSymbol}</dd>
              <dt>Amount to Spend</dt>
              <dd>
                <input value="${this._quadraticSpend.div((new app.web3.utils.BN(10)).pow(new app.web3.utils.BN(this._details.tokenDecimals)))}" @change="${this.setQuadraticSpend}">
                <span class="preview">${this.votePowerStr(this._quadraticSpend)}</span>
              </dd>
              <div class="commands">
                ${this._quadraticSpend.gt(this._details.tokenBalance) ? html`
                  <p>Insufficient Balance!</p>
                ` : this._details.allowance.gte(this._quadraticSpend) ? html`
                  <button @click="${this.vote.bind(this)}" data-supporting="true">Vote in Support</button>
                  <button @click="${this.vote.bind(this)}" data-supporting="false">Vote Against</button>
                ` : html`
                  <button @click="${this.approve.bind(this)}">Approve Spend</button>
                `}
              </div>
            </dl>
          </main>
        ` : html`
          <div class="commands">
            <button @click="${this.vote.bind(this)}" data-supporting="true">Vote in Support</button>
            <button @click="${this.vote.bind(this)}" data-supporting="false">Vote Against</button>
          </div>
        `}
      ` : proposal.passed && !proposal.processed ? html`
        <div class="commands">
          <button @click="${this.process.bind(this)}">Invoke Proposal Data</button>
        </div>
      ` : ''}
      <group-comments groupAddress="${this.groupAddress}" itemAddress="${this.proposalAddress}"></group-comments>
    `;
  }
  setQuadraticSpend(event) {
    try {
      const value = new app.web3.utils.BN(event.target.value);
      this._quadraticSpend = value.mul((new app.web3.utils.BN(10)).pow(new app.web3.utils.BN(this._details.tokenDecimals)));
    } catch(error) {
      this.displayError(error);
    }
  }
  votePower(amount) {
    return Math.floor(Math.sqrt(this._quadraticSpend.div(this._details.quadraticMultiplier).toNumber() + 1));
  }
  votePowerStr(amount) {
    const value = this.votePower(amount);
    return `${value} ${value === 1 ? 'vote' : 'votes'}`;
  }
  async approve(event) {
    try {
      await this.send(this.quadraticToken.methods.approve(this.childAddress, this._quadraticSpend));
      await this.fetchProposal();
    } catch(error) {
      this.displayError(error);
    }
  }
  async vote(event) {
    const inSupport = event.target.attributes['data-supporting'].value === 'true';
    try {
      if(this.hasQuadratic) {
        await this.send(this.contract.methods.voteQuadratic(this.proposalAddress, inSupport, this._quadraticSpend));
      } else {
        await this.send(this.contract.methods.vote(this.proposalAddress, inSupport));
      }
      await this.fetchProposal();
    } catch(error) {
      this.displayError(error);
    }
  }
  async process(event) {
    try {
      await this.send(this.contract.methods.process(this.proposalAddress));
      await this.fetchProposal();
    } catch(error) {
      this.displayError(error);
    }
  }
}
customElements.define('proposal-details', ProposalDetails);
