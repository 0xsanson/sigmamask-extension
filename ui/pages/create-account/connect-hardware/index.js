import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import * as actions from '../../../store/actions';
import {
  getMetaMaskAccounts,
  getMetaMaskAccountsConnected,
} from '../../../selectors';
import { formatBalance } from '../../../helpers/utils/util';
import { getMostRecentOverviewPage } from '../../../ducks/history/history';
import { EVENT, EVENT_NAMES } from '../../../../shared/constants/metametrics';
import { SECOND } from '../../../../shared/constants/time';
import { LedgerTransportTypes } from '../../../../shared/constants/hardware-wallets';
import ZENDESK_URLS from '../../../helpers/constants/zendesk-url';
import SelectHardware from './select-hardware';
import AccountList from './account-list';

const U2F_ERROR = 'U2F';

const LEDGER_LIVE_PATH = `m/44'/60'/0'/0/0`;
const MEW_PATH = `m/44'/60'/0'`;
const BIP44_PATH = `m/44'/60'/0'/0`;
const LEDGER_HD_PATHS = [
  { name: 'Ledger Live', value: LEDGER_LIVE_PATH },
  { name: 'Legacy (MEW / MyCrypto)', value: MEW_PATH },
  { name: `BIP44 Standard (e.g. MetaMask, Trezor)`, value: BIP44_PATH },
];

const LATTICE_STANDARD_BIP44_PATH = `m/44'/60'/0'/0/x`;
const LATTICE_LEDGER_LIVE_PATH = `m/44'/60'/x'/0/0`;
const LATTICE_MEW_PATH = `m/44'/60'/0'/x`;
const LATTICE_HD_PATHS = [
  {
    name: `Standard (${LATTICE_STANDARD_BIP44_PATH})`,
    value: LATTICE_STANDARD_BIP44_PATH,
  },
  {
    name: `Ledger Live (${LATTICE_LEDGER_LIVE_PATH})`,
    value: LATTICE_LEDGER_LIVE_PATH,
  },
  { name: `Ledger Legacy (${LATTICE_MEW_PATH})`, value: LATTICE_MEW_PATH },
];

const TREZOR_TESTNET_PATH = `m/44'/1'/0'/0`;
const TREZOR_HD_PATHS = [
  { name: `BIP44 Standard (e.g. MetaMask, Trezor)`, value: BIP44_PATH },
  { name: `Trezor Testnets`, value: TREZOR_TESTNET_PATH },
];

const HD_PATHS = {
  ledger: LEDGER_HD_PATHS,
  lattice: LATTICE_HD_PATHS,
  trezor: TREZOR_HD_PATHS,
};

class ConnectHardwareForm extends Component {
  static contextTypes = {
    t: PropTypes.func,
  };

  state = {
    error: null,
    selectedAccounts: [],
    accounts: [],
    browserSupported: true,
    unlocked: false,
    device: null,
  };

  async unlockDevice(device) {
    const path = this.props.defaultHdPaths[device];
    const unlocked = await this.props.checkHardwareStatus(device, path);
    this.setState({ unlocked });
    this.getPage(device, 0, path);
  }

  connectToHardwareWallet = (device) => {
    this.setState({ device });
    this.unlockDevice(device);
  };

  onPathChange = (path) => {
    this.props.setHardwareWalletDefaultHdPath({
      device: this.state.device,
      path,
    });
    this.setState({
      selectedAccounts: [],
    });
    this.getPage(this.state.device, 0, path);
  };

  onAccountChange = (account) => {
    let { selectedAccounts } = this.state;
    if (selectedAccounts.includes(account)) {
      selectedAccounts = selectedAccounts.filter((acc) => account !== acc);
    } else {
      selectedAccounts.push(account);
    }
    this.setState({ selectedAccounts, error: null });
  };

  onAccountRestriction = () => {
    this.setState({ error: this.context.t('ledgerAccountRestriction') });
  };

  showTemporaryAlert() {
    this.props.showAlert(this.context.t('hardwareWalletConnected'));
    // Autohide the alert after 5 seconds
    setTimeout((_) => {
      this.props.hideAlert();
    }, SECOND * 5);
  }

  getPage = (device, page, hdPath) => {
    this.props
      .connectHardware(device, page, hdPath, this.context.t)
      .then((accounts) => {
        if (accounts.length) {
          // If we just loaded the accounts for the first time
          // (device previously locked) show the global alert
          if (this.state.accounts.length === 0 && !this.state.unlocked) {
            this.showTemporaryAlert();
          }

          this.setState({
            accounts,
            unlocked: true,
            device,
            error: null,
          });
        }
      })
      .catch((e) => {
        const errorMessage = typeof e === 'string' ? e : e.message;
        if (errorMessage === 'Window blocked') {
          this.setState({ browserSupported: false, error: null });
        } else if (errorMessage.includes(U2F_ERROR)) {
          this.setState({ error: U2F_ERROR });
        } else if (
          errorMessage === 'LEDGER_LOCKED' ||
          errorMessage === 'LEDGER_WRONG_APP'
        ) {
          this.setState({
            error: this.context.t('ledgerLocked'),
          });
        } else if (errorMessage.includes('timeout')) {
          this.setState({
            error: this.context.t('ledgerTimeout'),
          });
        } else if (
          errorMessage
            .toLowerCase()
            .includes(
              'KeystoneError#pubkey_account.no_expected_account'.toLowerCase(),
            )
        ) {
          this.setState({
            error: this.context.t('QRHardwarePubkeyAccountOutOfRange'),
          });
        } else if (
          errorMessage !== 'Window closed' &&
          errorMessage !== 'Popup closed' &&
          errorMessage
            .toLowerCase()
            .includes('KeystoneError#sync_cancel'.toLowerCase()) === false
        ) {
          this.setState({
            error: errorMessage,
          });
        }
      });
  };

  onForgetDevice = (device) => {
    this.props
      .forgetDevice(device)
      .then((_) => {
        this.setState({
          error: null,
          selectedAccounts: [],
          accounts: [],
          unlocked: false,
        });
      })
      .catch((e) => {
        this.setState({ error: e.message });
      });
  };

  onUnlockAccounts = (device, path) => {
    const { history, mostRecentOverviewPage, unlockHardwareWalletAccounts } =
      this.props;
    const { selectedAccounts } = this.state;

    if (selectedAccounts.length === 0) {
      this.setState({ error: this.context.t('accountSelectionRequired') });
    }

    const description =
      MEW_PATH === path
        ? this.context.t('hardwareWalletLegacyDescription')
        : '';
    return unlockHardwareWalletAccounts(
      selectedAccounts,
      device,
      path || null,
      description,
    )
      .then((_) => {
        this.context.trackEvent({
          category: EVENT.CATEGORIES.ACCOUNTS,
          event: EVENT_NAMES.ACCOUNT_ADDED,
          properties: {
            account_type: EVENT.ACCOUNT_TYPES.HARDWARE,
            account_hardware_type: device,
          },
        });
        history.push(mostRecentOverviewPage);
      })
      .catch((e) => {
        this.context.trackEvent({
          category: EVENT.CATEGORIES.ACCOUNTS,
          event: EVENT_NAMES.ACCOUNT_ADD_FAILED,
          properties: {
            account_type: EVENT.ACCOUNT_TYPES.HARDWARE,
            account_hardware_type: device,
            error: e.message,
          },
        });
        this.setState({ error: e.message });
      });
  };

  onCancel = () => {
    const { history, mostRecentOverviewPage } = this.props;
    history.push(mostRecentOverviewPage);
  };

  renderError() {
    if (this.state.error === U2F_ERROR) {
      return (
        <p className="hw-connect__error">
          {this.context.t('troubleConnectingToWallet', [
            this.state.device,
            // eslint-disable-next-line react/jsx-key
            <a
              href={ZENDESK_URLS.HARDWARE_CONNECTION}
              key="hardware-connection-guide"
              target="_blank"
              rel="noopener noreferrer"
              className="hw-connect__link"
              style={{ marginLeft: '5px', marginRight: '5px' }}
            >
              {this.context.t('walletConnectionGuide')}
            </a>,
          ])}
        </p>
      );
    }
    return this.state.error ? (
      <span className="hw-connect__error">{this.state.error}</span>
    ) : null;
  }

  renderContent() {
    const { device, unlocked, accounts, selectedAccounts, browserSupported } =
      this.state;

    const deviceSelectedAndUnlocked = device && unlocked;
    const showAccountList = deviceSelectedAndUnlocked && accounts.length;

    if (!showAccountList) {
      return (
        <SelectHardware
          connectToHardwareWallet={this.connectToHardwareWallet}
          browserSupported={browserSupported}
        />
      );
    }

    return (
      <AccountList
        onPathChange={this.onPathChange}
        device={device}
        accounts={accounts}
        selectedAccounts={selectedAccounts}
        onAccountChange={this.onAccountChange}
        getPage={this.getPage}
        onUnlockAccounts={this.onUnlockAccounts}
        onForgetDevice={this.onForgetDevice}
        onCancel={this.onCancel}
        onAccountRestriction={this.onAccountRestriction}
        hdPaths={HD_PATHS}
      />
    );
  }

  render() {
    return (
      <>
        {this.renderError()}
        {this.renderContent()}
      </>
    );
  }
}

ConnectHardwareForm.propTypes = {
  connectHardware: PropTypes.func,
  checkHardwareStatus: PropTypes.func,
  forgetDevice: PropTypes.func,
  showAlert: PropTypes.func,
  hideAlert: PropTypes.func,
  unlockHardwareWalletAccounts: PropTypes.func,
  setHardwareWalletDefaultHdPath: PropTypes.func,
  history: PropTypes.object,
  defaultHdPaths: PropTypes.object,
  mostRecentOverviewPage: PropTypes.string.isRequired,
};

const mapStateToProps = (state) => ({
  connectedAccounts: getMetaMaskAccountsConnected(state),
  defaultHdPaths: state.appState.defaultHdPaths,
  mostRecentOverviewPage: getMostRecentOverviewPage(state),
});

const mapDispatchToProps = (dispatch) => {
  return {
    setHardwareWalletDefaultHdPath: ({ device, path }) => {
      return dispatch(actions.setHardwareWalletDefaultHdPath({ device, path }));
    },
    connectHardware: (deviceName, page, hdPath, t) => {
      return dispatch(actions.connectHardware(deviceName, page, hdPath, t));
    },
    checkHardwareStatus: (deviceName, hdPath) => {
      return dispatch(actions.checkHardwareStatus(deviceName, hdPath));
    },
    forgetDevice: (deviceName) => {
      return dispatch(actions.forgetDevice(deviceName));
    },
    unlockHardwareWalletAccounts: (
      indexes,
      deviceName,
      hdPath,
      hdPathDescription,
    ) => {
      return dispatch(
        actions.unlockHardwareWalletAccounts(
          indexes,
          deviceName,
          hdPath,
          hdPathDescription,
        ),
      );
    },
    showAlert: (msg) => dispatch(actions.showAlert(msg)),
    hideAlert: () => dispatch(actions.hideAlert()),
  };
};

ConnectHardwareForm.contextTypes = {
  t: PropTypes.func,
  trackEvent: PropTypes.func,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ConnectHardwareForm);
