import {AsyncTemplate, Template, html, userInput} from '/utils/Template.js';
import {selfDescribingContract, remaining, explorer, ellipseAddress, applyDecimals, reverseDecimals} from '/utils/index.js';
import ABIDecoder from '/utils/ABIDecoder.js';
import ERC20 from '/utils/ERC20.js';
import TopMenu from '/components/TopMenu.js';
import Comments from '/components/Comments.js';
import PreviewToken from '/components/input/PreviewToken.js';
import Input from '/components/Input.js';
import {newDeploys, decodeTx} from '/components/input/ProposalTxs.js';


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
      const decoded = await decodeTx(to, data, proposal.tx);
      proposal.tx.push({ to, data, decoded });
    }
    this.set('proposal', proposal);
    if('voteQuadratic' in this.contract.methods) {
      this.set('isQuadratic', true);
      this.set('quadraticToken', new ERC20(await this.contract.methods.quadraticToken().call()));
      this.set('decimals', await this.quadraticToken.decimals());
      this.set('quadraticMultiplier', await this.contract.methods.quadraticMultiplier().call());
      this.set('myBalance', await this.quadraticToken.balanceOf(accounts[0]));
      this.set('allowance', await this.quadraticToken.allowance(accounts[0], this.elections));
    }
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
    const BN = app.web3.utils.BN;
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
            ${new ProposalList(proposal.tx)}
          </dd>
          <dt>Status</dt>
          <dd>
            ${timeLeft > 0 ?
              proposal.passing ? html`<span class="proposal-passing">Majority and participation thresholds met</span>`
                : html`<span class="proposal-not-passing">Proposal will not pass with current support and participation levels</span>`
              : proposal.processed ? html`<span class="proposal-completed">Proposal passed and already processed</span>`
                : proposal.passed ? html`<span class="proposal-waiting">Proposal passed and awaiting processing</span>`
                  : html`<span class="proposal-failed">Proposal failed</span>`}
            ${proposal.myVote === '1' ? '(Voted in Support)' :
              proposal.myVote === '2' ? '(Voted Against)' : ''}
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
          ${this.isQuadratic && html`
            <dt>Quadratic Token</dt>
            <dd>${new PreviewToken(this.quadraticToken.address)}</dd>
            <dt>Quadratic Multiplier</dt>
            <dd>${applyDecimals(this.quadraticMultiplier, this.decimals)}</dd>
            <dt>My Balance</dt>
            <dd>${applyDecimals(this.myBalance, this.decimals)}</dd>
          `}
        </dl>
        ${timeLeft > 0 && proposal.myVote === '0' ? html`
          ${this.isQuadratic ? html`
            <fieldset>
              <legend>Quadratic Payment</legend>
              ${new Input({
                name: 'Amount',
                preview: 'quadratic',
                token: this.quadraticToken,
                multiplier: this.quadraticMultiplier,
                balance: this.myBalance,
                decimals: this.decimals,
              }, 'quad_payment', this.group, (value) => {
                this.set('quadPayment', reverseDecimals(value, this.decimals));
              }, applyDecimals(this.quadPayment || '0', this.decimals))}
            </fieldset>
            ${(new BN(this.quadPayment)).gt(new BN(this.allowance)) ? html`
              <div class="commands">
                <button onclick="tpl(this).approve()">Approve Spend</button>
              </div>
            ` : html`
              <div class="commands">
                <button onclick="tpl(this).vote(true)">Vote in Support</button>
                <button onclick="tpl(this).vote(false)">Vote Against</button>
              </div>
            `}
          ` : html`
            <div class="commands">
              <button onclick="tpl(this).vote(true)">Vote in Support</button>
              <button onclick="tpl(this).vote(false)">Vote Against</button>
            </div>
          `}
        ` : proposal.passed && !proposal.processed ? html`
          <div class="commands">
            <button onclick="tpl(this).process()">Invoke Proposal Transactions</button>
          </div>
        ` : ''}
      </div>
      ${new Comments(this.key, this.group)}
    `
  }
  async approve() {
    try {
      await this.quadraticToken.approve(this.elections, this.quadPayment);
      await this.superInit();
    } catch(error) {
      alert(error);
    }
  }
  async vote(inSupport) {
    try {
      if(this.isQuadratic) {
        await app.wallet.send(this.contract.methods.voteQuadratic(this.key, inSupport, this.quadPayment || '0'));
      } else {
        await app.wallet.send(this.contract.methods.vote(this.key, inSupport));
      }
      await this.superInit();
    } catch(error) {
      alert(error);
    }
  }
  async process() {
    try {
      await app.wallet.send(this.contract.methods.process(this.key));
      await this.superInit();
    } catch(error) {
      alert(error);
    }
  }
}

export class SubProposal extends AsyncTemplate {
  constructor(dataTx, entries) {
    super();
    this.set('dataTx', dataTx);
    this.set('entries', entries);
  }
  async init() {
    const decodedTx = [];
    for(let i = 0; i < this.dataTx.length; i++) {
      const tx = this.dataTx[i];
      const to = tx.slice(0,42);
      const data = '0x' + tx.slice(42);
      // TODO cannot deployNew and reference from within SubProposal!
      const decoded = await decodeTx(to, data, this.entries.concat(decodedTx));
      decodedTx.push({to, data, decoded});
    }
    this.set('decodedTx', decodedTx);
  }
  async render() {
    return html`
      ${new ProposalList(this.decodedTx)}
    `;
  }
}

export class ProposalList extends Template {
  constructor(txs) {
    super();
    this.set('txs', txs);
  }
  render() {
    return html`
      <ul class="tx">
        ${this.txs.map(tx => html`
          <li>
            <a $${this.link} href="${explorer(tx.to)}" class="to">${ellipseAddress(tx.to)}</a>
            ${tx.decoded ? html`
              <span class="method">${tx.decoded.name}</span>
              ${tx.decoded.params.map(param => html`
                <span class="param-name">${param.name}</span>
                  ${param.type === 'address' ? html`
                    <a $${this.link} class="invoke-value" href="${explorer(param.value)}">
                      ${ellipseAddress(param.value)}
                    </a>
                  `
                  : param.value instanceof SubProposal ? param.value
                  : html`
                    <span class="invoke-value wrap">${
                      Array.isArray(param.value)
                        ? param.value.map(value => userInput(value)).flat()
                        : userInput(param.value)}</span>
                    `}
                `)}
            ` : html`
              <span class="raw-data wrap">${tx.data}</span>
            `}
          </li>
        `)}
      </ul>
    `;
  }
}
