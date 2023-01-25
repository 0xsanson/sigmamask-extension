import { bufferToHex, toBuffer } from 'ethereumjs-util';
import { isString, noop } from 'lodash';
import { TransactionFactory } from '@ethereumjs/tx';
import { HARDWARE_KEYRING_TYPES } from '../../../../shared/constants/hardware-wallets';

/**
 * Transaction need to be processed before being passed to client-side
 * keyring via JSON-RPC as they cannot be serialized via JSON.stringify
 *
 * @param {*[]} args
 * @param {Keyring} keyring
 * @param {string|number|symbol} method
 * @returns {*[]}
 */
const signTransactionClientArgsHandler = (args, keyring, method) => {
  console.log('processClientArgs', method, keyring.type);
  const [address, transaction] = args;
  const transactionHex = bufferToHex(transaction.serialize());
  const commonMeta = {
    chain: transaction.common.chainName(),
    hardfork: transaction.common.hardfork(),
    eips: transaction.common.eips(),
  };

  return [
    address,
    {
      transactionHex,
      commonMeta,
    },
    ...args.slice(2),
  ];
};

/**
 * Some client-side methods return responses that can't be serialised/deserialised
 * appropriately via JSON-RPC (i.e., via JSON.stringify). This method is used to
 * assist in the deserialization process.
 *
 * @param {*} response
 * @param {*[]} args - the args that were first passed to the background method
 * @param {Keyring} keyring
 * @param {string|number|symbol} method
 */
const signTransactionClientResHandler = (response, args, keyring, method) => {
  console.log('processClientResponse', method, keyring.type);
  // All Keyrings return a Transaction object client-side when signing a tx
  if (!isString(response)) {
    throw new Error(
      'KeyringController - signTransaction - response is not a string',
    );
  }

  const bufferData = toBuffer(response);
  const [, unsignedTx] = args;

  // recreate signed transaction
  return TransactionFactory.fromSerializedData(bufferData, {
    common: unsignedTx._getCommon(),
  });
};

const METHOD_HANDLERS = {
  [HARDWARE_KEYRING_TYPES.TREZOR]: {
    init: {
      skipBackground: true,
      backgroundSync: noop,
    },
    signTypedData: {
      skipBackground: true,
    },
    addAccounts: {
      skipBackground: true,
    },
    forgetDevice: {
      updateAll: true,
      backgroundSync: noop,
    },
    dispose: {
      skipBackground: true,
      backgroundSync: noop,
      callSettings: {
        global: true, // send to all listening clients
      },
    },
    getFirstPage: {
      skipBackground: true,
    },
    getNextPage: {
      skipBackground: true,
    },
    getPreviousPage: {
      skipBackground: true,
    },
    signTransaction: {
      skipBackground: true,
      clientArgsHandler: signTransactionClientArgsHandler,
      clientResHandler: signTransactionClientResHandler,
    },
    signPersonalMessage: {
      skipBackground: true,
    },
    signMessage: {
      skipBackground: true,
    },
    getModel: {
      // TrezorKeyring.model isn't a part of serialised data returned
      // back-and-forth, therefore we defer to clientside for this
      // data, by intercepting TrezorKeyring.getModel
      skipBackground: true,
      backgroundSync: noop,
    },
  },
  [HARDWARE_KEYRING_TYPES.LEDGER]: {
    init: {
      skipBackground: true,
      backgroundSync: noop,
    },
    updateTransportMethod: {
      skipBackground: true,
    },
    signTypedData: {
      skipBackground: true,
    },
    signTransaction: {
      skipBackground: true,
      clientArgsHandler: signTransactionClientArgsHandler,
      clientResHandler: signTransactionClientResHandler,
    },
    signPersonalMessage: {
      skipBackground: true,
    },
    signMessage: {
      skipBackground: true,
    },
    getFirstPage: {
      skipBackground: true,
    },
    getNextPage: {
      skipBackground: true,
    },
    getPreviousPage: {
      skipBackground: true,
    },
    addAccounts: {
      skipBackground: true,
    },
    attemptMakeApp: {
      skipBackground: true,
    },
    forgetDevice: {
      updateAll: true,
      backgroundSync: noop,
    },
    destroy: {
      skipBackground: true,
      backgroundSync: noop,
      callSettings: {
        global: true, // send to all listening clients
      },
    },
  },
  [HARDWARE_KEYRING_TYPES.LATTICE]: {
    isUnlocked: {
      skipBackground: true,
    },
    unlock: {
      skipBackground: true,
    },
    getFirstPage: {
      skipBackground: true,
    },
    getNextPage: {
      skipBackground: true,
    },
    addAccounts: {
      skipBackground: true,
    },
    getPreviousPage: {
      skipBackground: true,
    },
    signPersonalMessage: {
      skipBackground: true,
    },
    signMessage: {
      skipBackground: true,
    },
    signTransaction: {
      skipBackground: true,
      clientArgsHandler: signTransactionClientArgsHandler,
      clientResHandler: signTransactionClientResHandler,
    },
    forgetDevice: {
      skipBackground: true,
      backgroundSync: noop,
      callSettings: {
        global: true, // send to all listening clients
      },
    },
  },
  [HARDWARE_KEYRING_TYPES.QR]: {},
};

const HANDLER_DEFAULTS = {
  updateAll: false,
  skipBackground: false,
  callSettings: {
    global: false,
  },
  backgroundSync: async (keyring, newState) => {
    await keyring.deserialize(newState);
    console.log('⬆️ State update for keyring', keyring.type, newState);
  },
  clientArgsHandler: (args) => args,
  clientResHandler: (res) => res,
};

/**
 *
 * @param {string} keyringType
 * @param {string} method
 * @returns {{
 *  callSettings: {global: boolean},
 *  skipBackground: boolean,
 *  updateAll: boolean,
 *  backgroundSync: function(*, *): Promise<void>,
 *  clientArgsHandler: function(*): *,
 *  clientResHandler: function(*): *,
 * }}
 */
export const getHardwareMethodHandler = (keyringType, method) => {
  if (!METHOD_HANDLERS[keyringType]) {
    throw new Error(
      `KeyringController - getMethodHandler - no handler for keyring type ${keyringType}`,
    );
  }

  // A handler doesn't have to be defined for every method.
  const handler = METHOD_HANDLERS[keyringType][method];

  return {
    ...HANDLER_DEFAULTS,
    ...handler,
  };
};
