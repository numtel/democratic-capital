
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
      try {
        await this.groups.createGroup();
        await this.init();
      } catch(error) {
        alert(error.reason);
      }
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
    let isMember, allowedContracts, memberCount;
    try {
      isMember = await group.isRegistered();
      allowedContracts = await group.allowedContracts();
      memberCount = await group.registeredCount();
    } catch(error) {
      console.error(error);
      return lit.html`<p>Group not found</p>`;
    }
    const allowedContractTpl = [];
    for(let allowedContract of allowedContracts) {
      allowedContractTpl.push(lit.html`
        <li>
          <dl>
            <dt>Contract Address</dt>
            <dd>
              ${allowedContract.address} ${allowedContract.self ? '(Self Reference)' : ''}
            </dd>
            ${allowedContract.interfaceName ? lit.html`
              <dt>Contract Type</dt>
              <dd>
                <a href="/group/${group.address}/${allowedContract.interfaceName}/${allowedContract.address}">
                  ${allowedContract.interfaceName} ${allowedContract.childContract.isElection ? '(Elections)' : ''}
                </a>
              </dd>
            ` : ''}
          </dl>
        </li>
      `);
    }

    const adminMode = (isMember && memberCount === 1)
      || allowedContracts.filter(x => x.address === this.accounts[0]).length > 0;

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
    const newElections = async () => {
      try {
        const instance = new ElectionsByMedian(this);
        await instance.deployNew(group.address, []);
        await group.allowContract(instance.address);
        await this.init();
      } catch(error) {
        alert(error.reason);
      }
    }

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
      <dd>
        <ul>
          ${allowedContractTpl}
        </ul>
      </dd>
    </dl>
    ${adminMode ? lit.html`
      <h2>Admin Controls</h2>
      <div class="admin">
        <button @click="${register}">Register Account...</button>
        <button @click="${unregister}">Unregister Account...</button>
        <button @click="${allowContract}">Allow Contract...</button>
        <button @click="${disallowContract}">Disallow Contract...</button>
        <button @click="${newElections}">Deploy new ElectionsByMedian</button>
      </div>
    ` : ''}
    `;
  },
  async childContractDetailsPage(groupAddress, interfaceName, childAddress) {
    const group = new VerifiedGroup(this, await this.contracts.VerifiedGroup.abi(), groupAddress);
    const instance = new this.childContracts[interfaceName].klass(
      this,
      await this.contracts[interfaceName].abi(),
      childAddress);
    return lit.html`
      <a href="/">Home</a>
      <a href="/group/${groupAddress}">Group Details</a>
      ${await instance.render()}
    `;
  },
};
