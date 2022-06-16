import {Template, html} from '/utils/Template.js';

export default class PercentageDisplay extends Template {
  constructor(data, type, display) {
    super();
    this.set('min', 'min' in display ? display.min : 0);
    this.set('value', Number(data) || this.min);
    this.set('minPercent', 'minPercent' in display ? display.minPercent : 0);
    this.set('maxPercent', 'maxPercent' in display ? display.maxPercent : 100);
    if('max' in display) {
      this.set('max', display.max);
    } else {
      const bits = Number(type.slice(4));
      if(isNaN(bits)) {
        this.set('error', true);
        return;
      } else {
        this.set('max', Math.pow(2, bits) - 1);
      }
    }
  }
  render() {
    return html`
      ${Math.round((this.value-this.min)/(this.max-this.min) * 100 * (this.maxPercent - this.minPercent))/100 + this.minPercent}%
    `;
  }
}


