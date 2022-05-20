const APP = Symbol();

function dayToDate(day) {
  return new Date(Number(day) * 86400 * 1000);
}

class DemocraticToken {
  constructor(contract, app) {
    this.contract = contract;
    this[APP] = app;
    this._currentDay = null;
    this._balance = null;
    this._currentEpoch = null;
  }
  async currentEpoch() {
    if(this._currentEpoch) return this._currentEpoch;
    return this._currentEpoch = new Epoch(await this.contract.methods.epochOnDay(
      await this.currentDay()).call(), this[APP]);
  }
  async register() {
    try {
      await this[APP].send(this.contract.methods.registerAccount());
    } catch(error) {
      const active = await this[APP].verifications.methods.addressActive(
        this[APP].accounts[0]).call();
      if(!active) {
        console.log('Account must have registered on identity service');
      } else throw error;
    }
  }

  async currentDay() {
    if(this._currentDay) return this._currentDay;
    return this._currentDay =
      Number(await this.contract.methods.daystamp().call());
  }

  async unregister() {
    await this[APP].send(tbis.contracts.methods.unregistAccount());
  }

  async balance() {
    return this._balance = await this.contract.methods.balanceOf(
      this[APP].accounts[0]).call();
  }
  async balanceBN() {
    return new this[APP].web3.utils.BN(await this.balance());
  }

  async availableEmissions(collectNow) {
    const emissions = Number(await this.contract.methods.availableEmissions(
      this[APP].accounts[0], await this.currentDay()).call());
    if(collectNow) {
      await this[APP].send(this.contract.methods.collectEmissions());
      this._balance = null;
    }
    return emissions;
  }

  async proposeEpoch(epoch, electionStartDay, electionEndDay) {
    if(!(epoch instanceof Epoch))
      throw new Error('epoch required');
    if(!(epoch.beginDay >= electionEndDay + 2))
      throw new Error('needs a day after election end to process result');
    if(electionStartDay < await this.currentDay())
      throw new Error('election cannot start before today');
    const curEpoch = await this.currentEpoch();
    let minDuration = curEpoch.epochElectionMinDays;
    if(electionEndDay - electionStartDay < minDuration)
      throw new Error('minimum election duration not met');
    await this[APP].send(this.contract.methods.proposeEpoch(
      epoch.toArray(), electionStartDay, electionEndDay));
  }

  async proposalsByDay(dayNumber) {
    if(!dayNumber) dayNumber = await this.currentDay();
    const proposals = [];
    let fetchProposalError = false;
    while(!fetchProposalError) {
      try {
        proposals.push(await this.contract.methods.proposalsByDay(
          dayNumber, proposals.length).call());

      } catch(error) {
        fetchProposalError = true;
      }
    }
    for(let i=0; i<proposals.length;i++) {
      const proposal = await this.contract.methods.proposals(proposals[i]).call();
      switch(proposal.resourceType) {
        case '0': proposal.resource =new Epoch(
          await this.contract.methods.pendingEpochs(proposal.resourceIndex).call(), this[APP]);
          break;
        case '1': proposal.resource =
          await this.contract.methods.pendingMints(proposal.resourceIndex).call();
          break;
        case '2': proposal.resource =
          await this.contract.methods.pendingBans(proposal.resourceIndex).call();
          break;
        case '3': proposal.resource =
          await this.contract.methods.pendingCustomTx(proposal.resourceIndex).call();
          break;
        case '4': proposal.resource =
          await this.contract.methods.pendingRegistrations(proposal.resourceIndex).call();
          break;
      }
      proposals[i] = proposal;
    }
    return proposals;
  }

}

class Epoch {
  constructor(raw, app) {
    this[APP] = app;
    this.beginDay = Number(raw.beginDay);
    this.dailyEmission = Number(raw.dailyEmission);
    const params = new this[APP].web3.utils.BN(raw.params);

    this.params =
      ('0000000000000000000000000000000000000000000000000000000000000000'
      + params.toString(16)).slice(-64);

    [
      'expiryDayCount',
      'epochElectionMinDays',
      'epochElectionThreshold',
      'epochElectionMinParticipation',
      'mintElectionMinDays',
      'mintElectionThreshold',
      'mintElectionMinParticipation',
      'banElectionMinDays',
      'banElectionThreshold',
      'banElectionMinParticipation',
      'customTxElectionMinDays',
      'customTxElectionThreshold',
      'customTxElectionMinParticipation',
      'registrationElectionMinDays',
      'registrationElectionThreshold',
      'registrationElectionMinParticipation',
    ].forEach((key, index) => {
      Object.defineProperty(this, key, {
        get: function() {
          return this.getParam(index);
        },
        set: function(value) {
          this.setParam(index, value);
        }
      });
    });
  }
  toArray() {
    return [ this.beginDay, this.dailyEmission, '0x' + this.params ];
  }
  getParam(index) {
    return Number('0x' + this.params.slice(index * 4, (index + 1) * 4));
  }
  setParam(index, value) {
    let out = '';
    if(index < 0 || index > 15)
      throw new Error('index out of range');
    if(index > 0) {
      out += this.params.slice(0, index * 4);
    }
    if(Number(value) < 0 || Number(value) > 0xffff)
      throw new Error('value out of range');

    out += ('0000' + Number(value).toString(16)).slice(-4);
    out += this.params.slice((index + 1) * 4);
    this.params = out;
  }
}
