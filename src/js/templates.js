
const eventHandlers = window.eventHandlers = [];
function handle(fun) {
  eventHandlers.push(async () => {
    await fun();
    await app.init();
  });
  return `eventHandlers[${eventHandlers.length - 1}]()`;
}

const templates = window.templates = {
  async index() {
    const groupsHTML = [];
    for(let group of await this.groups.fetchList()) {
      groupsHTML.push('<li>' + await templates.group(group) + '</li>');
    }

    return `
    <ul>
      ${groupsHTML.join('')}
    </ul>`;
  },
  async group(group) {
    const isMember = await group.isRegistered();
    return `
    <dl class="group">
      <dt>Address</dt>
      <dd>${group.address}</dd>
      <dt>Registered Count</dt>
      <dd>${await group.registeredCount()}</dd>
    </dl>
    ${isMember ? `
      <button onclick="${handle(() => group.unregister())}">Leave Group</button>
    ` : `
      <button onclick="${handle(() => group.register([1,1,1,1,1,1,1,1,1,1,1,1]))}">Join Group</button>
    `}
    `;
  }
};
