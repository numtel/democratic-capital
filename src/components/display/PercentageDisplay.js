import {Template, html} from '/utils/Template.js';

export default class PercentageDisplay extends Template {
  constructor(data, type) {
    super();
    this.set('value', Number(data));
    const bits = Number(type.slice(4));
    if(isNaN(bits)) {
      this.set('error', true);
      return;
    } else {
      this.set('max', Math.pow(2, bits) - 1);
    }
  }
  render() {
    return html`
      ${Math.round(this.value/this.max * 10000)/100}%
    `;
  }
}


