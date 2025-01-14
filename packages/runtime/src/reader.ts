import { isURL } from '@stoplight/path';
import AbortController from 'abort-controller';
import * as fs from 'fs';
import { RequestInit } from 'node-fetch';
import type { Agent } from 'http';
import { isError } from 'lodash';

import request from './fetch';
import { printError } from './utils/printError';

export interface IFileReadOptions {
  encoding: 'ascii' | 'utf8' | 'utf-8' | 'utf16le' | 'ucs2' | 'ucs-2' | 'base64' | 'latin1' | 'binary' | 'hex';
}

export interface IReadOptions extends IFileReadOptions {
  timeout?: number;
  agent?: Agent;
}

export async function readFile(name: string, opts: IReadOptions): Promise<string> {
  if (isURL(name)) {
    let response;
    let timeout: NodeJS.Timeout | number | null = null;
    try {
      const requestOpts: RequestInit = {};
      requestOpts.agent = opts.agent;
      if (opts.timeout !== void 0) {
        const controller = new AbortController();
        timeout = setTimeout(() => {
          controller.abort();
        }, opts.timeout);
        requestOpts.signal = controller.signal as AbortSignal;
      }

      response = await request(name, requestOpts);

      if (!response.ok) throw new Error(response.statusText);
      return await response.text();
    } catch (ex) {
      if (isError(ex) && ex.name === 'AbortError') {
        throw new Error('Timeout');
      } else {
        throw ex;
      }
    } finally {
      if (timeout !== null) {
        clearTimeout(timeout);
      }
    }
  } else {
    try {
      return await new Promise((resolve, reject) => {
        fs.readFile(name, opts.encoding, (err, data) => {
          if (err !== null) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });
    } catch (ex) {
      throw new Error(`Could not read ${name}: ${printError(ex)}`);
    }
  }
}

export async function readParsable(name: string, opts: IReadOptions): Promise<string> {
  try {
    return await readFile(name, opts);
  } catch (ex) {
    throw new Error(`Could not parse ${name}: ${printError(ex)}`);
  }
}
