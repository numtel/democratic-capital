
function dayString(day) { return dayToDate(day).toUTCString() }

const templates = window.templates = {
  async index() {
    const displayDay = await this.token.currentDay();
    const todaysProposals = await this.token.proposalsByDay(displayDay);
    for(let proposal of todaysProposals) {
      proposal.html = await templates.proposal(proposal);
    }
    return `
    <h2>Showing ${dayString(displayDay)}</h2>
    <ul>
      ${todaysProposals.map(proposal => proposal.html).join('')}
    </ul>`;
    return `<pre>${JSON.stringify(todaysProposals, null, 2)}</pre>`;
  },
  async proposal({
    resourceType, electionStartDay, electionEndDay, hasBeenProcessed,
    proposer, votesSupporting, votesAgainst, voterCount, registeredCount,
    resource,
  }) {
    return `
      <h3>${resourceType === '0' ? `Epoch`
          : resourceType === '1' ? `Mint`
          : resourceType === '2' ? `Ban`
          : resourceType === '3' ? `Custom Transaction`
          : resourceType === '4' ? `Registration` : '' }</h3>
      ${await templates.resource(resource, resourceType)}
      <dl class="proposal">
        <dt>Election Start Day</dt>
        <dd>${dayString(electionStartDay)}</dd>
        <dt>Election End Day</dt>
        <dd>${dayString(electionEndDay)}</dd>
      </dl>
    `;
  },
  async resource(resource, resourceType) {
    switch(resourceType) {
      case '0':
        return templates.viewEpoch(resource);
    }
    // TODO support all resource types
    return `<pre>${JSON.stringify(resource)}</pre>`;
  },
  async viewEpoch(epoch) {
    return `<dl class="epoch">
      <dt>Begin Day</dt>
      <dd>${dayString(epoch.beginDay)}</dd>
      <dt>Daily Emission</dt>
      <dd>${epoch.dailyEmission}</dd>
      <dt>Emissions Expiry Day Count</dt>
      <dd>${epoch.expiryDayCount}</dd>
      <dt>Epoch Election Min Days</dt>
      <dd>${epoch.epochElectionMinDays}</dd>
    </dl>`;
  }
};
