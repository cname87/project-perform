// Protractor configuration file, see link for more information
// https://github.com/angular/protractor/blob/master/lib/config.ts

// const jasmineReporters = require('jasmine-reporters');

exports.config = {
  allScriptsTimeout: 11000,
  /* spec patterns are relative to the current working directory when protractor is called */
  specs: [
    './src/**/auth.e2e-spec.ts',
    './src/**/cache.e2e-spec.ts',
    './src/**/errors.e2e-spec.ts',
  ],
  directConnect: true,
  capabilities: {
    browserName: 'chrome',
    'chromeOptions': {
      'args': [
        "--incognito",
        "--start-maximized",
        "--new-window",
        "--disable-popup-blocking",
      ]
    },
    /* enable browser logs for protractor-browser-logs */
    loggingPrefs: {
      browser: 'ALL' // "OFF", "SEVERE", "WARNING", "INFO", "CONFIG", "FINE", "FINER", "FINEST", "ALL".
    }
  },
  baseUrl: 'https://localhost:1337/',
  allScriptsTimeout: 10000,
  getPageTimeout: 10000,
  untrackOutstandingTimeouts: true,
  logLevel: 'DEBUG',

  SELENIUM_PROMISE_MANAGER: false,
  framework: 'jasmine',
  jasmineNodeOpts: {
    showColors: true,
    defaultTimeoutInterval: 10000,
    print: function() {},
  },

  beforeLaunch: function() {
    require('ts-node').register({
      project: require('path').join(__dirname, './tsconfig.e2e.json')
    });
  },

  /* test environment setup - reset database and log in */
  onPrepare: async () => {

    await require('./onPrepare').run();

  },

  onComplete: function() {
    console.log('E2e test complete');

  }

};
