import { createProjectLogger, createModuleLogger } from '@metamask/utils';

import { METAMASK } from '../context';

const colors = {
  [METAMASK.UI]: 'green',
  [METAMASK.INPAGE]: 'red',
  [METAMASK.CONTENTSCRIPT]: 'cornflowerblue',
  [METAMASK.BACKGROUND]: 'yellow',
  [METAMASK.PHISHING_WARNING_PAGE]: 'purple',
  [METAMASK.EXTERNAL]: 'grey',
};

const enabled = Boolean(process.env.METAMASK_DEBUG);

const projectLogger = createProjectLogger('message-stream');
const logPortMessage = createModuleLogger(projectLogger, 'port');
const logPostMessage = createModuleLogger(projectLogger, 'post');
logPortMessage.enabled = enabled;
logPostMessage.enabled = enabled;

export function logPortMessages(from, to) {
  return function (data, out) {
    logMessage(logPortMessage, from, to, data, out);
  };
}

export function logPostMessages(from, to) {
  return function (data, out) {
    logMessage(logPostMessage, from, to, data, out);
  };
}

function logMessage(logger, from, to, data, out) {
  const id = data?.data?.id || 0;
  if (!id) {
    return;
  }
  logger(
    `%c(` +
      `%c${id}` +
      `%c): ` +
      `%c${from.split('metamask-')[1] || from}%c` +
      ` ${out ? '►►►' : '◄◄◄'} ` +
      `%c${to.split('metamask-')[1] || to}`,
    `color: grey;`,
    `color: goldenrod;`,
    `color: grey;`,
    `color: ${colors[from] || 'grey'};`,
    `color: grey;`,
    `color: ${colors[to] || 'grey'};`,
    data?.data || '',
  );
}
