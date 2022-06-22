import {Template, html} from '/utils/Template.js';
import SecondsDisplay from '/components/display/SecondsDisplay.js';
import PercentageDisplay from '/components/display/PercentageDisplay.js';
import InvokeFilterDisplay from '/components/display/InvokeFilterDisplay.js';
import PreviewToken from '/components/input/PreviewToken.js';

export default class Overview extends Template {
  constructor(data) {
    super();
    this.set('data', data);
  }
  render() {
    return html`
      <table>
        <tbody>
      ${Object.keys(this.data).map(key => {
        const item = this.data[key];
        return html`
          <tr>
            <td>${key}</td>
            <td>
              ${!item.display ?
                  item.result[0] === false ? 'false' :
                  item.result[0] === null? 'null' : item.result[0]
              : item.display.map((display, index) => {
                let result = item.result[index];
                // Shorthand version
                if(typeof display === 'string') display = { type: display };
                if('special' in display) {
                  const isSpecial = display.special.filter(special => special.value === result);
                  if(isSpecial.length > 0) {
                    return html`
                      <div class="result">
                        ${isSpecial[0].label}
                      </div>
                    `;
                  }
                }
                return html`
                  <div class="result">
                  ${display.hint && html`<span class="hint">${display.hint}</span>`}
                  ${display.type === 'invokeFilter'
                    ? new InvokeFilterDisplay(item.result) // Special, gets full result
                  : display.type === 'percentage'
                    ? new PercentageDisplay(result, item.outputs[index].type, display)
                  : display.type === 'seconds'
                    ? new SecondsDisplay(result)
                  : display.type === 'token'
                    ? new PreviewToken(result)
                  : display.type === 'timestamp'
                    ? result === '0' ? '0' : (new Date(result * 1000)).toLocaleString()
                  :  result}
                  </div>
                  `;
              })}
            </td>
          </tr>
          ${key === 'registeredCount' && item.result === '1' && html`
            <tr>
              <td class="notice" colspan="2">
                This group only has one member. When a group only has one member, that person can perform any administrative action on the group contract directly.<br><br>Before another member is registered into the group, it is <strong>very</strong> important to allow a contract that has the capability to perform administrative actions, such as an elections contract or by allowing an individual's account as an allowed contract, in order to prevent the group from becoming stuck.
              </td>
            </tr>
          `}
        `})}
        </tbody>
      </table>
    `;
  }
}
