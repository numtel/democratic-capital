import {AsyncTemplate, html} from '/utils/Template.js';
import {selfDescribingContract, remaining, explorer, ellipseAddress} from '/utils/index.js';
import ABIDecoder from '/utils/ABIDecoder.js';

export default class Proposals extends AsyncTemplate {
  constructor(address, parent) {
    super();
    this.set('address', address);
    this.set('parent', parent);
  }
  async init() {
    this.contract = await selfDescribingContract(this.address);
    const accounts = await app.wallet.accounts;
    this.set('count', await this.contract.methods.count().call());
    const currentTime = (await app.web3.eth.getBlock('latest')).timestamp;
    const proposalsRaw = await this.contract.methods.detailsMany(0, this.count, accounts[0]).call();
    const proposals = []
    for(let proposalRaw of proposalsRaw) {
      // Why is RPC result frozen!?
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
      proposals.push(proposal);
    }
    this.set('proposals', proposals);
  }
  async render() {
    return html`
      ${this.proposals.length > 0 && html`
      <div class="white window">
        <ul class="proposals">
          ${this.proposals.map(proposal => html`
            <li>
              <a href="/${this.parent}/${this.address}/proposal/${proposal.key}" $${this.link}>${ellipseAddress(proposal.key)}</a>
              <div class="details">
                <span class="remaining">
                ${proposal.timeLeft > 0 ? html`
                  ${remaining(proposal.timeLeft)} remaining
                ` : html`
                  Election Completed
                `}</span>
                <br>
                ${proposal.timeLeft > 0 ?
                    proposal.passing ? html`<span class="proposal-passing">Majority and participation thresholds met</span>`
                      : html`<span class="proposal-not-passing">Proposal will not pass with current support and participation levels</span>`
                    : proposal.processed ? html`<span class="proposal-completed">Proposal passed and already processed</span>`
                      : proposal.passed ? html`<span class="proposal-waiting">Proposal passed and awaiting processing</span>`
                        : html`<span class="proposal-failed">Proposal failed</span>`}
                <span class="my-vote">${proposal.myVote === '1' ? '(Voted in Support)' :
                  proposal.myVote === '2' ? '(Voted Against)' : ''}</span>
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
              </div>
            </li>
          `)}
        </ul>
      </div>
      `}
    `;
  }
}
