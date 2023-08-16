import { cloneDeep } from 'lodash';

const CAIP_CHAIN_IDS = {
  MAINNET: '0x1',
  GOERLI: '0x5',
  LOCALHOST: '0x539',
  BSC: '0x38',
  BSC_TESTNET: '0x61',
  OPTIMISM: '0xa',
  OPTIMISM_TESTNET: '0x1a4',
  POLYGON: '0x89',
  POLYGON_TESTNET: '0x13881',
  AVALANCHE: '0xa86a',
  AVALANCHE_TESTNET: '0xa869',
  FANTOM: '0xfa',
  FANTOM_TESTNET: '0xfa2',
  CELO: '0xa4ec',
  ARBITRUM: '0xa4b1',
  HARMONY: '0x63564c40',
  PALM: '0x2a15c308d',
  SEPOLIA: '0xaa36a7',
  LINEA_GOERLI: '0xe704',
  LINEA_MAINNET: '0xe708',
  AURORA: '0x4e454152',
  MOONBEAM: '0x504',
  MOONBEAM_TESTNET: '0x507',
  MOONRIVER: '0x505',
  CRONOS: '0x19',
};

const NETWORK_TYPES = {
  GOERLI: 'goerli',
  LOCALHOST: 'localhost',
  MAINNET: 'mainnet',
  RPC: 'rpc',
  SEPOLIA: 'sepolia',
  LINEA_GOERLI: 'linea-goerli',
  LINEA_MAINNET: 'linea-mainnet',
};

const version = 52;

/**
 * Migrate tokens in Preferences to be keyed by chainId instead of
 * providerType. To prevent breaking user's MetaMask and selected
 * tokens, this migration copies the RPC entry into *every* custom RPC
 * chainId.
 */
export default {
  CAIP_CHAIN_IDS,
  NETWORK_TYPES,
  version,
  async migrate(originalVersionedData) {
    const versionedData = cloneDeep(originalVersionedData);
    versionedData.meta.version = version;
    const state = versionedData.data;
    versionedData.data = transformState(state);
    return versionedData;
  },
};

function transformState(state = {}) {
  if (state.PreferencesController) {
    const { accountTokens, accountHiddenTokens, frequentRpcListDetail } =
      state.PreferencesController;

    const newAccountTokens = {};
    const newAccountHiddenTokens = {};

    if (accountTokens && Object.keys(accountTokens).length > 0) {
      for (const address of Object.keys(accountTokens)) {
        newAccountTokens[address] = {};
        if (accountTokens[address][NETWORK_TYPES.RPC]) {
          frequentRpcListDetail.forEach((detail) => {
            newAccountTokens[address][detail.chainId] =
              accountTokens[address][NETWORK_TYPES.RPC];
          });
        }
        for (const providerType of Object.keys(accountTokens[address])) {
          switch (providerType) {
            case NETWORK_TYPES.MAINNET:
              newAccountTokens[address][CAIP_CHAIN_IDS.MAINNET] =
                accountTokens[address][NETWORK_TYPES.MAINNET];
              break;
            case 'ropsten':
              newAccountTokens[address]['0x3'] = accountTokens[address].ropsten;
              break;
            case 'rinkeby':
              newAccountTokens[address]['0x4'] = accountTokens[address].rinkeby;
              break;
            case NETWORK_TYPES.GOERLI:
              newAccountTokens[address][CAIP_CHAIN_IDS.GOERLI] =
                accountTokens[address][NETWORK_TYPES.GOERLI];
              break;
            case 'kovan':
              newAccountTokens[address]['0x2a'] = accountTokens[address].kovan;
              break;
            default:
              break;
          }
        }
      }
      state.PreferencesController.accountTokens = newAccountTokens;
    }

    if (accountHiddenTokens && Object.keys(accountHiddenTokens).length > 0) {
      for (const address of Object.keys(accountHiddenTokens)) {
        newAccountHiddenTokens[address] = {};
        if (accountHiddenTokens[address][NETWORK_TYPES.RPC]) {
          frequentRpcListDetail.forEach((detail) => {
            newAccountHiddenTokens[address][detail.chainId] =
              accountHiddenTokens[address][NETWORK_TYPES.RPC];
          });
        }
        for (const providerType of Object.keys(accountHiddenTokens[address])) {
          switch (providerType) {
            case NETWORK_TYPES.MAINNET:
              newAccountHiddenTokens[address][CAIP_CHAIN_IDS.MAINNET] =
                accountHiddenTokens[address][NETWORK_TYPES.MAINNET];
              break;
            case 'ropsten':
              newAccountHiddenTokens[address]['0x3'] =
                accountHiddenTokens[address].ropsten;
              break;
            case 'rinkeby':
              newAccountHiddenTokens[address]['0x4'] =
                accountHiddenTokens[address].rinkeby;
              break;
            case NETWORK_TYPES.GOERLI:
              newAccountHiddenTokens[address][CAIP_CHAIN_IDS.GOERLI] =
                accountHiddenTokens[address][NETWORK_TYPES.GOERLI];
              break;
            case 'kovan':
              newAccountHiddenTokens[address]['0x2a'] =
                accountHiddenTokens[address].kovan;
              break;
            default:
              break;
          }
        }
      }
      state.PreferencesController.accountHiddenTokens = newAccountHiddenTokens;
    }
  }
  return state;
}
