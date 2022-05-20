import copyToClipboard from 'copy-to-clipboard';
import log from 'loglevel';
import { clone } from 'lodash';
import React from 'react';
import { render } from 'react-dom';
import browser from 'webextension-polyfill';

import { getEnvironmentType } from '../app/scripts/lib/util';
import { ALERT_TYPES } from '../shared/constants/alerts';
import { SENTRY_STATE } from '../app/scripts/lib/setupSentry';
import { ENVIRONMENT_TYPE_POPUP } from '../shared/constants/app';
import * as actions from './store/actions';
import configureStore from './store/store';
import {
  fetchLocale,
  loadRelativeTimeFormatLocaleData,
} from './helpers/utils/i18n-helper';
import switchDirection from './helpers/utils/switch-direction';
import {
  getPermittedAccountsForCurrentTab,
  getSelectedAddress,
} from './selectors';
import { ALERT_STATE } from './ducks/alerts';
import {
  getUnconnectedAccountAlertEnabledness,
  getUnconnectedAccountAlertShown,
} from './ducks/metamask/metamask';
import Root from './pages';
import txHelper from './helpers/utils/tx-helper';

log.setLevel(global.METAMASK_DEBUG ? 'debug' : 'warn');

let reduxStore;
let currentBackgroundConnection;

const blankInitialState = {
  featureFlags: {},
  provider: {},
  cachedBalances: {},
  keyrings: [],
  accounts: {},
};

export const updateBackgroundConnection = (backgroundConnection) => {
  currentBackgroundConnection = backgroundConnection;
  actions._setBackgroundConnection(backgroundConnection);
  backgroundConnection.onNotification((data) => {
    if (data.method === 'sendUpdate') {
      reduxStore.dispatch(actions.updateMetamaskState(data.params[0]));
    } else {
      throw new Error(
        `Internal JSON-RPC Notification Not Handled:\n\n ${JSON.stringify(
          data,
        )}`,
      );
    }
  });
};

function updateStateFromBackground(cb) {
  // check if we are unlocked first
  currentBackgroundConnection.getState(function (err, metamaskState) {
    if (err) {
      if (cb) {
        cb(err);
      }
      return;
    }
    reduxStore.dispatch(actions.updateMetamaskState(metamaskState));
    updateBackgroundConnection(currentBackgroundConnection);

    const unapprovedTxsAll = txHelper(
      metamaskState.unapprovedTxs,
      metamaskState.unapprovedMsgs,
      metamaskState.unapprovedPersonalMsgs,
      metamaskState.unapprovedDecryptMsgs,
      metamaskState.unapprovedEncryptionPublicKeyMsgs,
      metamaskState.unapprovedTypedMessages,
      metamaskState.network,
      metamaskState.provider.chainId,
    );
    const numberOfUnapprovedTx = unapprovedTxsAll.length;
    if (numberOfUnapprovedTx > 0) {
      reduxStore.dispatch(
        actions.showConfTxPage({
          id: unapprovedTxsAll[0].id,
        }),
      );
    }

    currentBackgroundConnection.onNotification((data) => {
      if (data.method === 'sendUpdate') {
        reduxStore.dispatch(actions.updateMetamaskState(data.params[0]));
      } else {
        throw new Error(
          `Internal JSON-RPC Notification Not Handled:\n\n ${JSON.stringify(
            data,
          )}`,
        );
      }
    });

    // global metamask api - used by tooling
    global.metamask = {
      updateCurrentLocale: (code) => {
        reduxStore.dispatch(actions.updateCurrentLocale(code));
      },
      setProviderType: (type) => {
        reduxStore.dispatch(actions.setProviderType(type));
      },
      setFeatureFlag: (key, value) => {
        reduxStore.dispatch(actions.setFeatureFlag(key, value));
      },
    };
  });
}

export default function launchMetamaskUi(opts, cb) {
  console.log('into launchMetamaskUi');
  const { backgroundConnection } = opts;
  actions._setBackgroundConnection(backgroundConnection);
  currentBackgroundConnection = backgroundConnection;
  if (reduxStore) {
    updateStateFromBackground(cb);
  }
}

export const initializeUiFromStorage = (opts = {}) => {
  console.log('into initializeUiFromStorage');
  browser.storage.session.get('uiState').then(({ uiState: metamaskState }) => {
    const initState =
      metamaskState && Object.keys(metamaskState).length
        ? metamaskState
        : blankInitialState;
    startApp(initState, opts).then((store) => {
      reduxStore = store;
      setupDebuggingHelpers(store);
    });
  });
};

async function startApp(metamaskState, opts) {
  // parse opts
  if (!metamaskState.featureFlags) {
    metamaskState.featureFlags = {};
  }

  const currentLocaleMessages = metamaskState.currentLocale
    ? await fetchLocale(metamaskState.currentLocale)
    : {};
  const enLocaleMessages = await fetchLocale('en');

  await loadRelativeTimeFormatLocaleData('en');
  if (metamaskState.currentLocale) {
    await loadRelativeTimeFormatLocaleData(metamaskState.currentLocale);
  }

  if (metamaskState.textDirection === 'rtl') {
    await switchDirection('rtl');
  }

  const draftInitialState = {
    activeTab: opts.activeTab,

    // metamaskState represents the cross-tab state
    metamask: metamaskState,

    // appState represents the current tab's popup state
    appState: {},

    localeMessages: {
      current: currentLocaleMessages,
      en: enLocaleMessages,
    },
  };

  if (getEnvironmentType() === ENVIRONMENT_TYPE_POPUP) {
    const { origin } = draftInitialState.activeTab;
    const permittedAccountsForCurrentTab = getPermittedAccountsForCurrentTab(
      draftInitialState,
    );
    const selectedAddress = getSelectedAddress(draftInitialState);
    const unconnectedAccountAlertShownOrigins = getUnconnectedAccountAlertShown(
      draftInitialState,
    );
    const unconnectedAccountAlertIsEnabled = getUnconnectedAccountAlertEnabledness(
      draftInitialState,
    );

    if (
      origin &&
      unconnectedAccountAlertIsEnabled &&
      !unconnectedAccountAlertShownOrigins[origin] &&
      permittedAccountsForCurrentTab.length > 0 &&
      !permittedAccountsForCurrentTab.includes(selectedAddress)
    ) {
      draftInitialState[ALERT_TYPES.unconnectedAccount] = {
        state: ALERT_STATE.OPEN,
      };
      actions.setUnconnectedAccountAlertShown(origin);
    }
  }

  reduxStore = configureStore(draftInitialState);

  if (currentBackgroundConnection) {
    updateStateFromBackground();
  }

  // start app
  render(<Root store={reduxStore} />, opts.container);

  return reduxStore;
}

/**
 * Return a "masked" copy of the given object.
 *
 * The returned object includes only the properties present in the mask. The
 * mask is an object that mirrors the structure of the given object, except
 * the only values are `true` or a sub-mask. `true` implies the property
 * should be included, and a sub-mask implies the property should be further
 * masked according to that sub-mask.
 *
 * @param {Object} object - The object to mask
 * @param {Object<Object|boolean>} mask - The mask to apply to the object
 */
function maskObject(object, mask) {
  return Object.keys(object).reduce((state, key) => {
    if (mask[key] === true) {
      state[key] = object[key];
    } else if (mask[key]) {
      state[key] = maskObject(object[key], mask[key]);
    }
    return state;
  }, {});
}

function setupDebuggingHelpers(store) {
  window.getCleanAppState = async function () {
    const state = clone(store.getState());
    state.version = global.platform.getVersion();
    state.browser = window.navigator.userAgent;
    state.completeTxList = await actions.getTransactions({
      filterToCurrentNetwork: false,
    });
    return state;
  };
  window.getSentryState = function () {
    const fullState = store.getState();
    const debugState = maskObject(fullState, SENTRY_STATE);
    return {
      browser: window.navigator.userAgent,
      store: debugState,
      version: global.platform.getVersion(),
    };
  };
}

window.logStateString = async function (cb) {
  const state = await window.getCleanAppState();
  browser.runtime
    .getPlatformInfo()
    .then((platform) => {
      state.platform = platform;
      const stateString = JSON.stringify(state, null, 2);
      cb(null, stateString);
    })
    .catch((err) => {
      cb(err);
    });
};

window.logState = function (toClipboard) {
  return window.logStateString((err, result) => {
    if (err) {
      console.error(err.message);
    } else if (toClipboard) {
      copyToClipboard(result);
      console.log('State log copied');
    } else {
      console.log(result);
    }
  });
};
