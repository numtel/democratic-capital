
class DemocraticToken {
  constructor(contract, sendFun, web3) {
    this.contract = contract;
    this.send = sendFun;
    this.web3 = web3;
    this.currentDay = null;
  }
  async currentEpoch() {
    if(!this.currentDay)
      this.currentDay = Number(await this.contract.methods.daystamp().call());
    return new Epoch(await this.contract.methods.epochOnDay(this.currentDay).call(), this.web3);
  }
  
}

class Epoch {
  constructor(raw, web3) {
    this.web3 = web3;
    this.beginDay = Number(raw.beginDay);
    this.dailyEmission = Number(raw.dailyEmission);
    const params = new this.web3.utils.BN(raw.params);

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
