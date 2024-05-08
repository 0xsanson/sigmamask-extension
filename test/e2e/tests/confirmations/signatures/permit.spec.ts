import { strict as assert } from 'assert';
import { Suite } from 'mocha';
import { withRedesignConfirmationFixtures } from '../helper-fixture';
import {
  DAPP_URL_WITHOUT_SCHEMA,
  WINDOW_TITLES,
  openDapp,
  switchToNotificationWindow,
  unlockWallet,
} from '../../../helpers';
import { Ganache } from '../../../seeder/ganache';
import { Driver } from '../../../webdriver/driver';
import { assertAccountDetailsMetrics, assertHeaderInfoBalance, assertPastedAddress, assertSignatureMetrics, clickHeaderInfoBtn, copyAddressAndPasteWalletAddress } from './signature-helpers';

describe('Confirmation Signature - Permit', function (this: Suite) {
  if (!process.env.ENABLE_CONFIRMATION_REDESIGN) {
    return;
  }

  it('initiates and confirms and emits the correct events', async function () {
    await withRedesignConfirmationFixtures(
      this.test?.fullTitle(),
      async ({
        driver,
        ganacheServer,
        mockedEndpoint: mockedEndpoints,
      }: {
        driver: Driver;
        ganacheServer: Ganache;
        mockedEndpoint: any;
      }) => {
        const addresses = await ganacheServer.getAccounts();
        const publicAddress = addresses?.[0] as string;

        await unlockWallet(driver);
        await openDapp(driver);
        await driver.clickElement('#signPermit');
        await switchToNotificationWindow(driver);

        await clickHeaderInfoBtn(driver);
        await assertHeaderInfoBalance(driver);

        await copyAddressAndPasteWalletAddress(driver);
        await assertPastedAddress(driver);

        await assertSignatureDetails(driver);

        await driver.clickElement('[data-testid="confirm-footer-button"]');

        await assertSignatureMetrics(
          driver,
          mockedEndpoints,
          'eth_signTypedData_v3',
        );

        await assertAccountDetailsMetrics(driver, mockedEndpoints,  'eth_signTypedData_v3');

        /**
         * TODO: test scroll and fixing scroll
         * @see {@link https://github.com/MetaMask/MetaMask-planning/issues/2458}
         */
        // test "confirm-footer-button" is disabled and unclickable
        //
        // await driver.clickElement('.confirm-scroll-to-bottom__button');
        // await driver.clickElement('[data-testid="confirm-footer-button"]');

        await assertVerifiedResults(driver, publicAddress);
      },
    );
  });

  it('initiates and rejects and emits the correct events', async function () {
    await withRedesignConfirmationFixtures(
      this.test?.fullTitle(),
      async ({
        driver,
        ganacheServer,
        mockedEndpoint: mockedEndpoints,
      }: {
        driver: Driver;
        ganacheServer: Ganache;
        mockedEndpoint: any;
      }) => {
        const addresses = await ganacheServer.getAccounts();
        const publicAddress = addresses?.[0] as string;

        await unlockWallet(driver);
        await openDapp(driver);
        await driver.clickElement('#signPermit');
        await switchToNotificationWindow(driver);
        await driver.clickElement(
          '[data-testid="confirm-footer-cancel-button"]',
        );
        await assertSignatureMetrics(
          driver,
          mockedEndpoints,
          'eth_signTypedData_v3',
        );

        await driver.switchToWindowWithTitle(WINDOW_TITLES.TestDApp);

        const rejectionResult = await driver.findElement('#signPermitResult');
        assert.equal(
          await rejectionResult.getText(),
          'Error: User rejected the request.',
        );
      },
    );
  });
});

async function assertSignatureDetails(driver: Driver) {
  await driver.switchToWindowWithTitle(WINDOW_TITLES.Dialog);
  const origin = driver.findElement({ text: DAPP_URL_WITHOUT_SCHEMA });
  const contractPetName = driver.findElement({
    css: '.name__value',
    text: '0xCcCCc...ccccC',
  });

  const primaryType = driver.findElement({ text: 'Permit' });
  const owner = driver.findElement({
    css: '.name__name',
    text: 'Account 1',
  });
  const spender = driver.findElement({
    css: '.name__value',
    text: '0x5B38D...eddC4',
  });
  const value = driver.findElement({ text: '3000' });
  const nonce = driver.findElement({ text: '0' });
  const deadline = driver.findElement({ text: '50000000000' });

  assert.ok(await origin, 'origin');
  assert.ok(await contractPetName, 'contractPetName');

  assert.ok(await primaryType, 'primaryType');
  assert.ok(await owner, 'owner');
  assert.ok(await spender, 'spender');
  assert.ok(await value, 'value');
  assert.ok(await nonce, 'nonce');
  assert.ok(await deadline, 'deadline');
}

async function assertVerifiedResults(driver: Driver, publicAddress: string) {
  await driver.switchToWindowWithTitle(WINDOW_TITLES.TestDApp);
  await driver.clickElement('#signPermitVerify');

  const verifyResult = await driver.findElement('#signPermitResult');
  const verifyResultR = await driver.findElement('#signPermitResultR');
  const verifyResultS = await driver.findElement('#signPermitResultS');
  const verifyResultV = await driver.findElement('#signPermitResultV');

  await driver.waitForSelector({
    css: '#signPermitVerifyResult',
    text: publicAddress,
  });
  const verifyRecoverAddress = await driver.findElement(
    '#signPermitVerifyResult',
  );

  assert.equal(
    await verifyResult.getText(),
    '0x68272d5c4007252c3a79e2cb96a96dcda95ed540d29ec0f162225d8ff47a549167a85a47894c7dbc3511d497b0fbe2456d7c092afa35de566304e525c3b2a0531c',
  );
  assert.equal(
    await verifyResultR.getText(),
    'r: 0x68272d5c4007252c3a79e2cb96a96dcda95ed540d29ec0f162225d8ff47a5491',
  );
  assert.equal(
    await verifyResultS.getText(),
    's: 0x67a85a47894c7dbc3511d497b0fbe2456d7c092afa35de566304e525c3b2a053',
  );
  assert.equal(await verifyResultV.getText(), 'v: 28');
  assert.equal(await verifyRecoverAddress.getText(), publicAddress);
}
