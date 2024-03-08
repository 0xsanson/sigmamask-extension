import React from 'react';
import { ButtonVariant } from '@metamask/snaps-sdk';
import {
  Box,
  Button,
  ButtonSize,
  Checkbox,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from '../../../../../components/component-library';
import {
  BlockSize,
  Display,
  FlexDirection,
  JustifyContent,
} from '../../../../../helpers/constants/design-system';
import useAlerts from '../../../hooks/useAlerts';

export function AlertModal({
  ownerId,
  handleButtonClick,
}: {
  ownerId: string;
  handleButtonClick: () => void;
}) {
  const { alerts, isAlertConfirmed, setAlertConfirmed } = useAlerts(ownerId);

  return (
    <Modal
      isOpen
      onClose={() => {
        // Intentionally empty
      }}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Alerts</ModalHeader>
        <ModalBody>
          {alerts.map((alert) => {
            const isConfirmed = isAlertConfirmed(alert.key);

            return (
              <Box
                key={alert.key}
                display={Display.Flex}
                flexDirection={FlexDirection.Row}
                justifyContent={JustifyContent.spaceBetween}
                paddingBottom={3}
                width={BlockSize.Full}
                gap={3}
              >
                <p>{alert.message}</p>
                <Checkbox
                  label="Acknowledge"
                  isChecked={isConfirmed}
                  onClick={() => setAlertConfirmed(alert.key, !isConfirmed)}
                />
              </Box>
            );
          })}
        </ModalBody>
        <ModalFooter>
          <Button
            variant={ButtonVariant.Primary}
            width={BlockSize.Full}
            onClick={handleButtonClick}
            size={ButtonSize.Lg}
          >
            Got It
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
