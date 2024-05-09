import React from 'react';
import { Footer } from '../components/confirm/footer';
import { Header } from '../components/confirm/header';
import { Info } from '../components/confirm/info';
import ScrollToBottom from '../components/confirm/scroll-to-bottom';
///: BEGIN:ONLY_INCLUDE_IF(build-mmi)
import { MMISignatureMismatchBanner } from '../../../components/app/mmi-signature-mismatch-banner';
///: END:ONLY_INCLUDE_IF
import { Page } from '../../../components/multichain/pages/page';
import { Nav } from '../components/confirm/nav';
import { Title } from '../components/confirm/title';
import setCurrentConfirmation from '../hooks/setCurrentConfirmation';
import syncConfirmPath from '../hooks/syncConfirmPath';
///: BEGIN:ONLY_INCLUDE_IF(blockaid)
import { BlockaidAlert } from '../components/confirm/blockaid-alert';
///: END:ONLY_INCLUDE_IF
import { TransactionModalContextProvider } from '../../../contexts/transaction-modal';
import { LedgerInfo } from '../components/confirm/ledger-info';
import { AlertActionHandlerContext } from '../../../hooks/useAlertActionHandler';
import useConfirmationAlertActions from '../hooks/useConfirmationAlertActions';
import { GasFeeContextProvider } from '../../../contexts/gasFee';
import useCurrentConfirmation from '../hooks/useCurrentConfirmation';

const Confirm = () => {
  setCurrentConfirmation();
  syncConfirmPath();

  const { currentConfirmation } = useCurrentConfirmation();
  const processAction = useConfirmationAlertActions();

  return (
    <AlertActionHandlerContext.Provider value={{ processAction }}>
      <TransactionModalContextProvider>
        <GasFeeContextProvider transaction={currentConfirmation}>
          <Page className="confirm_wrapper">
            <Nav />
            <Header />
            {
              ///: BEGIN:ONLY_INCLUDE_IF(build-mmi)
              <MMISignatureMismatchBanner />
              ///: END:ONLY_INCLUDE_IF
            }
            <ScrollToBottom>
              <LedgerInfo />
              {
                // todo: section below is to be removed once new alerts implementation is there
                ///: BEGIN:ONLY_INCLUDE_IF(blockaid)
                <BlockaidAlert marginTop={4} />
                ///: END:ONLY_INCLUDE_IF
              }
              <Title />
              <Info />
            </ScrollToBottom>
            <Footer />
          </Page>
        </GasFeeContextProvider>
      </TransactionModalContextProvider>
    </AlertActionHandlerContext.Provider>
  );
};

export default Confirm;
