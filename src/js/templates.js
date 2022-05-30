
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
      await this.groups.createGroup();
      await this.init();
    };

    return lit.html`
    <button @click="${createGroup}">Create Group</button>
    <ul>
      ${groupsHTML}
    </ul>`;
  },
  async groupDetailsPage(address) {
    const group = new VerifiedGroup(this, await this.contracts.VerifiedGroup.abi(), address);
    return lit.html`
      <a href="/">Home</a>
      ${await templates.group.call(this, group)}
    `;
  },
  async group(group) {
    const isMember = await group.isRegistered();
    const allowedContracts = await group.allowedContracts();
    const memberCount = await group.registeredCount();
    const adminMode = (isMember && memberCount === 1)
      || allowedContracts.indexOf(this.accounts[0]) !== -1;

    const register = async () => {
      const address = prompt('Account address?');
      if(address && address.match(/^0x[a-f0-9]{40}$/i)) {
        try {
          await group.register(address);
        } catch(error) {
          alert(error.reason);
        }
        await this.init();
      }
    };
    const unregister = async () => {
      const address = prompt('Account address?');
      if(address && address.match(/^0x[a-f0-9]{40}$/i)) {
        try {
          await group.unregister(address);
        } catch(error) {
          alert(error.reason);
        }
        await this.init();
      }
    };
    const allowContract = async () => {
      const address = prompt('Contract address?');
      if(address && address.match(/^0x[a-f0-9]{40}$/i)) {
        try {
          await group.allowContract(address);
        } catch(error) {
          alert(error.reason);
        }
        await this.init();
      }
    };
    const disallowContract = async () => {
      const address = prompt('Contract address?');
      if(address && address.match(/^0x[a-f0-9]{40}$/i)) {
        try {
          await group.disallowContract(address);
        } catch(error) {
          alert(error.reason);
        }
        await this.init();
      }
    };

    return lit.html`
    <h2>Group Details</h2>
    <dl class="group">
      <dt>Address</dt>
      <dd>${group.address}</dd>
      <dt>Registered Count</dt>
      <dd>${memberCount}</dd>
      <dt>Membership</dt>
      <dd>${isMember ? 'Yes' : 'No'} ${adminMode ? '(Admin)' : ''}</dd>
      <dt>Allowed Contracts</dt>
      <dd>${JSON.stringify(allowedContracts)}</dd>
    </dl>
    ${adminMode ? lit.html`
      <h2>Admin Controls</h2>
      <div class="admin">
        <button @click="${register}">Register Account...</button>
        <button @click="${unregister}">Unregister Account...</button>
        <button @click="${allowContract}">Allow Contract...</button>
        <button @click="${disallowContract}">Disallow Contract...</button>
      </div>
    ` : ''}
    `;
  },
};
