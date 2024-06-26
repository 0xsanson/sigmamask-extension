import React from 'react';

import { renderWithProvider, fireEvent } from '../../../../test/jest';
import { Slippage } from '../../../../shared/constants/swaps';
import SlippageButtons from './slippage-buttons';

const createProps = (customProps = {}) => {
  return {
    onSelect: jest.fn(),
    maxAllowedSlippage: 15,
    currentSlippage: Slippage.high,
    smartTransactionsEnabled: false,
    ...customProps,
  };
};

describe('SlippageButtons', () => {
  it('renders the component with initial props', () => {
    const { getByText, queryByText, getByTestId } = renderWithProvider(
      <SlippageButtons {...createProps()} />,
    );
    expect(getByText('2%')).toBeInTheDocument();
    expect(getByText('3%')).toBeInTheDocument();
    expect(getByText('custom')).toBeInTheDocument();
    expect(getByText('Advanced options')).toBeInTheDocument();
    expect(
      document.querySelector('.slippage-buttons__header'),
    ).toMatchSnapshot();
    expect(
      document.querySelector('.slippage-buttons__button-group'),
    ).toMatchSnapshot();
    expect(queryByText('Smart Swaps')).not.toBeInTheDocument();
    expect(getByTestId('button-group__button1')).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('renders slippage with a custom value', () => {
    const { getByText } = renderWithProvider(
      <SlippageButtons {...createProps({ currentSlippage: 2.5 })} />,
    );
    expect(getByText('2.5')).toBeInTheDocument();
  });

  it('renders the default slippage with Advanced options hidden', () => {
    const { getByText, queryByText } = renderWithProvider(
      <SlippageButtons
        {...createProps({ currentSlippage: Slippage.default })}
      />,
    );
    expect(getByText('Advanced options')).toBeInTheDocument();
    expect(document.querySelector('.fa-angle-down')).toBeInTheDocument();
    expect(queryByText('2%')).not.toBeInTheDocument();
  });

  it('opens the Advanced options section and sets a default slippage', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <SlippageButtons
        {...createProps({ currentSlippage: Slippage.default })}
      />,
    );
    fireEvent.click(getByText('Advanced options'));
    fireEvent.click(getByTestId('button-group__button0'));
    expect(getByTestId('button-group__button0')).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('opens the Advanced options section and sets a high slippage', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <SlippageButtons
        {...createProps({ currentSlippage: Slippage.default })}
      />,
    );
    fireEvent.click(getByText('Advanced options'));
    fireEvent.click(getByTestId('button-group__button1'));
    expect(getByTestId('button-group__button1')).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('sets a custom slippage value', () => {
    const { getByTestId } = renderWithProvider(
      <SlippageButtons {...createProps()} />,
    );
    fireEvent.click(getByTestId('button-group__button2'));
    expect(getByTestId('button-group__button2')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    const input = getByTestId('slippage-buttons__custom-slippage');
    fireEvent.change(input, { target: { value: 5 } });
    fireEvent.click(document);
    expect(input).toHaveAttribute('value', '5');
  });
});
