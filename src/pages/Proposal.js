import {AsyncTemplate, html} from '/utils/Template.js';
import {selfDescribingContract, remaining, explorer, ellipseAddress} from '/utils/index.js';
import ABIDecoder from '/utils/ABIDecoder.js';
import TopMenu from '/components/TopMenu.js';

export default class Proposal extends AsyncTemplate {
  constructor(elections, proposal, group) {
    super();
    this.set('elections', elections);
    this.set('key', proposal);
    this.set('group', group);
  }
  async init() {
    this.contract = await selfDescribingContract(this.elections);
    const accounts = await app.wallet.accounts;
    const currentTime = (await app.web3.eth.getBlock('latest')).timestamp;
    const proposalRaw = await this.contract.methods.details(this.key, accounts[0]).call();
    const proposal = Object.fromEntries(Object.entries(proposalRaw));
    proposal.tx = [];
    proposal.timeLeft = Number(proposal.endTime) - currentTime;
    for(let i = 0; i < proposal.data.length; i++) {
      const tx = proposal.data[i];
      const to = tx.slice(0, 42);
      const data = '0x' + tx.slice(42);
      let decoded = null;
      try {
        const contract = await selfDescribingContract(to);
        const decoder = new ABIDecoder(contract.options.jsonInterface);
        decoded = decoder.decodeMethod(data);
      } catch(error) {
        // This data cannot be decoded
        console.error(error);
      }
      proposal.tx.push({ to, data, decoded });
    }
    this.set('proposal', proposal);
  }
  async render() {
    const proposal = this.proposal;
    const timeLeft = proposal.timeLeft;
    const rawThreshold = proposal._threshold / 0xffff;
    const totalVoters = Number(proposal.supporting) + Number(proposal.against);
    const supportLevel = totalVoters === 0 ? 0 : Number(proposal.supporting)
      / (Number(proposal.supporting)+Number(proposal.against));
    const votersRequired = Number(proposal.minVoters) - totalVoters;
    const threshold = rawThreshold * 100;
    return html`
      ${new TopMenu(html`
        <a href="/${this.group}" $${this.link}>Back to Group</a>
        <a href="/${this.group}/${this.elections}" $${this.link}>Back to Elections</a>
      `)}
      <div class="white window">
        <h2>Proposal Details</h2>
        <dl>
          <dt>Time Remaining</dt>
          <dd>${timeLeft > 0 ? html`
            ${remaining(timeLeft)} remaining
          ` : html`
            Election Completed
          `}
          <dt>Transactions</dt>
          <dd>
            <ul class="tx">
              ${proposal.tx.map(tx => html`
                <li>
                  <a $${this.link} href="${explorer(tx.to)}" class="to">${tx.to}</a>
                  ${tx.decoded ? html`
                    <span class="method">${tx.decoded.name}</span>
                    ${tx.decoded.params.map(param => html`
                      <span class="param-name">${param.name}</span>
                        ${param.type === 'address' ? html`
                          <a $${this.link} class="invoke-value" href="${explorer(param.value)}">
                            ${ellipseAddress(param.value)}
                          </a>
                        ` : html`
                          <span class="invoke-value wrap">${param.value}</span>
                        `}
                    `)}
                  ` : html`
                    <span class="raw-data wrap">${tx.data}</span>
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
          <dd>${(new Date(proposal.startTime * 1000)).toLocaleString()}</dd>
          <dt>End Time</dt>
          <dd>${(new Date(proposal.endTime * 1000)).toLocaleString()}</dd>
        </dl>
      </div>
    `
  }
}
