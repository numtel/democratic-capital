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
  };
  constructor() {
    super();
    this._details = {};
    this._loading = true;
    this._error = false;
  }
  async connectedCallback() {
    super.connectedCallback();
    this._loading = true;
    this.contract = await this.loadContract('ElectionsByMedian', this.childAddress);
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
      <div class="commands">
        ${timeLeft > 0 && proposal.myVote === 0 ? html`
          <button @click="${this.vote.bind(this)}" data-supporting="true">Vote in Support</button>
          <button @click="${this.vote.bind(this)}" data-supporting="false">Vote Against</button>
        ` : proposal.passed && !proposal.processed ? html`
          <button @click="${this.process.bind(this)}">Invoke Proposal Data</button>
        ` : ''}
      </div>
      <group-comments groupAddress="${this.groupAddress}" itemAddress="${this.proposalAddress}"></group-comments>
    `;
  }
  async vote(event) {
    const inSupport = event.target.attributes['data-supporting'].value === 'true';
    try {
      await this.send(this.contract.methods.vote(this.proposalAddress, inSupport));
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