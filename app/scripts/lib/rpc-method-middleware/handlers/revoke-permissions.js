import { ethErrors } from 'eth-rpc-errors';
import { MESSAGE_TYPE } from '../../../../../shared/constants/app';

const revokePermissions = {
  methodNames: [MESSAGE_TYPE.WALLET_REVOKE_PERMISSIONS],
  implementation: revokePermissionsHandler,
  hookNames: {
    handleRevokePermissions: true,
  },
};
export default revokePermissions;

/**
 * @typedef {object} revokePermissionsOptions
 * @property {Function} handleRevokePermissions - The wallet_revokePermissions method implementation.
 */

/**
 * @typedef {object} revokePermissionsParam
 * @property {string} type - The type of the asset to watch.
 * @property {object} options - Watch options for the asset.
 */

/**
 * @param {import('json-rpc-engine').JsonRpcRequest<revokePermissionsParam>} req - The JSON-RPC request object.
 * @param {import('json-rpc-engine').JsonRpcResponse<true>} res - The JSON-RPC response object.
 * @param {Function} _next - The json-rpc-engine 'next' callback.
 * @param {Function} end - The json-rpc-engine 'end' callback.
 * @param {revokePermissionsOptions} options
 */
async function revokePermissionsHandler(
  req,
  res,
  _next,
  end,
  { handleRevokePermissions },
) {
  try {
    const { permission } = req.params;
    res.result = await handleRevokePermissions(permission);

    return end();
  } catch (error) {
    return end(error);
  }
}
