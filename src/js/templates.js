
const templates = window.templates = {
  async index() {
    const groupsHTML = [];
    for(let group of await this.groups.fetchList()) {
      groupsHTML.push(lit.html`
        <li>
          <a href="/group/${group.address}">${group.address}</a>
        </li>`);
    }

    const createGroup = async () => {
      await this.groups.createGroup([1,1,1,1,1,1,1,1,1,1,1,1]);
      await this.init();
    };

    return lit.html`
    <button @click="${createGroup}">Create Group</button>
    <ul>
      ${groupsHTML}
    </ul>`;
  },
  async groupDetailsPage(address) {
    const group = new VerifiedGroup(this, address);
    return lit.html`
      <a href="/">Home</a>
      ${await templates.group.call(this, group)}
    `;
  },
  async group(group) {
    const isMember = await group.isRegistered();
    const register = async () => {
      await group.register([1,1,1,1,1,1,1,1,1,1,1,1]);
      await this.init();
    };
    const unregister = async () => {
      await group.unregister();
      await this.init();
    };

    return lit.html`
    <dl class="group">
      <dt>Address</dt>
      <dd>${group.address}</dd>
      <dt>Registered Count</dt>
      <dd>${await group.registeredCount()}</dd>
      <dt>Proposal Median Values</dt>
      <dd>${(await group.getProposalConfig()).join(', ')}</dd>
      ${isMember ? lit.html`
        <dt>My Proposal Config</dt>
        <dd>${(await group.getAccountProposalConfig()).join(', ')}</dd>
      ` : ''}
    </dl>
    <a href="/group/${group.address}/set-params">Set my Proposal Parameters Ballot</a>
    ${isMember ? lit.html`
      <button @click="${unregister}">Leave Group</button>
    ` : lit.html`
      <button @click="${register}">Join Group</button>
    `}
    `;
  },
  async setProposalConfigPage(groupAddress) {
    const group = new VerifiedGroup(this, groupAddress);
    const isMember = await group.isRegistered();
    return lit.html`
      <a href="/">Home</a>
      <a href="/group/${groupAddress}">Group Details</a>
      ${isMember ? await templates.setProposalConfigForm.call(this, group) : `
        <p>You must be a member of this group to configure your proposal parameters ballot.</p>
      `}
    `;
  },
  async setProposalConfigForm(group) {
    const myValues = await group.getAccountProposalConfig();
    const medians = await group.getProposalConfig();

    const submit = event => {
      event.preventDefault();
      console.log(event);
    }

    // TODO display offset info for registration elections
    const triplet = electionType => lit.html`
      <label>
        <span class="title">Duration in days</span>
        ${slider(electionType * 3 + 0)}
      </label>
      <label>
        <span class="title">Majority Threshold</span>
        ${slider(electionType * 3 + 1, true)}
      </label>
      <label>
        <span class="title">Minimum Participation</span>
        ${slider(electionType * 3 + 1, true)}
      </label>
    `;

    const slider = (index, percent) => lit.html`
      <span class="median">
        Current Median:
        ${percent ? Math.floor((medians[index] / 16) * 100) + '%' : medians[index]}
      </span>
      <input name="${index}" type="range" min="1" max="16" step="1" value="${myValues[index]}">
    `;

    return lit.html`
      <form @submit="${submit}">
        <fieldset>
          <legend>Proposals to allow contract access</legend>
          ${triplet(0)}
        </fieldset>
        <fieldset>
          <legend>Proposals to disallow contract access</legend>
          ${triplet(1)}
        </fieldset>
        <fieldset>
          <legend>Proposals to invoke a transaction</legend>
          ${triplet(2)}
        </fieldset>
        <fieldset>
          <legend>Proposals to accept new registrations</legend>
          ${triplet(3)}
        </fieldset>
        <button type="submit">Submit</button>
      </form>
    `;
  },
};
