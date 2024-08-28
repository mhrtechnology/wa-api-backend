/*!
 * Copyright 2024 WPPConnect Team
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  defaultSendMessageOptions,
  RawMessage,
  SendMessageOptions,
  SendMessageReturn,
} from '../../chat';
import { sendRawMessage } from '../../chat/functions';
import { getMyUserId } from '../../conn';
import { createWid } from '../../util';
import * as webpack from '../../webpack';
import { Wid } from '../../whatsapp';
import { wrapModuleFunction } from '../../whatsapp/exportModule';
import {
  createFanoutMsgStanza,
  createMsgProtobuf,
} from '../../whatsapp/functions';

/**
 * Send a payment request message
 *
 * @example
 * ```javascript
 * WPP.payment.request('[number]@c.us', {
 *  value: 10000,
 *  currency: 'BRL',
 *  expiryTimestamp: 169608420,
 *  note: 'Text for notes',
 * });
 * ```
 * @category Message
 */
export async function request(
  chatId: string | Wid,
  options: {
    value: number;
    currency?: string;
    expiryTimestamp?: number;
    note?: string;
  } & SendMessageOptions
): Promise<SendMessageReturn> {
  options = {
    ...defaultSendMessageOptions,
    ...options,
  };
  const jid = createWid(chatId);
  const rawMessage: RawMessage = {
    type: 'payment',
    author: getMyUserId()?._serialized as any,
    paymentAmount1000: options.value || 10000,
    paymentCurrency: 'BRL',
    paymentExpiryTimestamp: options.expiryTimestamp,
    paymentMessageReceiverJid: jid,
    paymentNoteMsg: {
      type: 'chat',
      kind: 'chat',
      body: options.note,
      thumbnail: '',
    },
    body: options.note,
    paymentStatus: 11,
    paymentTxnStatus: 20,
    subtype: 'request',
  };

  return await sendRawMessage(chatId, rawMessage, options as any);
}

webpack.onFullReady(() => {
  wrapModuleFunction(createMsgProtobuf, (func, ...args) => {
    const [message] = args;
    const r = func(...args);

    if (message?.type == 'payment' && message?.subtype == 'request') {
      r.requestPaymentMessage = {
        currencyCodeIso4217: 'BRL',
        amount1000: message.paymentAmount1000,
        expiryTimestamp: message.paymentExpiryTimestamp,
        requestFrom: message.to?.toString().replace('c.us', 's.whatsapp.net'),
        amount: {
          value: message.paymentAmount1000,
          offset: 1000,
          currencyCode: 'BRL',
        },
        noteMessage: {
          extendedTextMessage: {
            text: message.body,
          },
        },
      };
    }
    console.log(r);
    console.log(...args);
    return r;
  });
  wrapModuleFunction(createFanoutMsgStanza, async (func, ...args) => {
    console.log(...args);
    const r = await func(...args);
    console.log(r);
    return r;
  });
});
