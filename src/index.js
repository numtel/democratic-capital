import {selfDescribingContract} from '/utils/index.js';
import Router from '/app/Router.js';
import Loader from '/components/Loader.js';

window.app = {
  web3: new Web3(config.rpc),
  router: new Router({
    element: document.getElementById('app'),
    loader: new Loader,
    routes: [
      { regex: /^\/deploy\/(0x[a-f0-9]{40})$/i,
        template: '/pages/DeployNew.js',
        constructor: match => [ match[1] ] },
      { regex: /^\/groups$/,
        template: '/pages/GroupList.js',
        constructor: match => [ 'foo' ] },
      { regex: /^\//, // catch all others
        template: '/pages/Home.js' },
    ],
  }),
};

