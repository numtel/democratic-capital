import {Template, html} from '/utils/Template.js';

export default class PercentageInput extends Template {
  constructor(input, onChange, value) {
    super();
    if(!String(input.internalType).startsWith('uint')) {
      this.set('error', true);
      return;
    }
    this.set('input', input);
    this.set('onChange', onChange);
    this.set('min', 'min' in input ? input.min : 0);
    this.set('value', value || this.min);
    this.onChange(this.value);
    this.set('minPercent', 'minPercent' in input ? input.minPercent : 0);
    this.set('maxPercent', 'maxPercent' in input ? input.maxPercent : 100);
    if('max' in input) {
      this.set('max', input.max);
    } else {
      const bits = Number(input.internalType.slice(4));
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
      <div class="field">
        <label>
          <span>${this.input.name}</span>
          <div class="percentage">
            <input
              type="range"
              onchange="tpl(this).set('value', this.value).onChange(this.value)"
              min="${this.min}"
              max="${this.max}"
              value="${this.value}"
              step="1"
            >
            <input
              type="number"
              onchange="tpl(this).set('value', this.value).onChange(this.value)"
              min="${this.min}"
              max="${this.max}"
              value="${this.value}"
              step="1"
            >
          </div>
        </label>
        <span class="preview">${Math.round((this.value-this.min)/(this.max-this.min) * 10000 * (this.maxPercent - this.minPercent))/10000 + this.minPercent}%</span>
        ${this.input.hint && html`<span class="hint">${this.input.hint}</span>`}
    `
  }
}
