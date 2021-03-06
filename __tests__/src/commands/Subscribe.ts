import * as fs from 'fs';
import * as sinon from 'sinon';
import * as rp from '../../../src/request';
import * as utils from '../../../src/utils';
import ora from '../../../src/ora';
import Subscribe from '../../../src/commands/Subscribe';
import Microservice from '../../../src/models/Microservice';

describe('Subscribe.ts', () => {
  const successTextList = [];
  let oraStartStub;
  let rpMakeRequestStub;

  beforeEach(() => {
    oraStartStub = sinon.stub(ora, 'start').callsFake(() => {
      return {
        succeed: (text) => {
          successTextList.push(text);
        },
      };
    });
    rpMakeRequestStub = sinon.stub(rp, 'makeRequest').callsFake(async () => {
      return {};
    });
    sinon.stub(fs, 'existsSync').callsFake(() => true);
    sinon.stub(fs, 'readFileSync');
    sinon.stub(JSON, 'parse').callsFake(() => {
      return {
        'path/to/omg/directory': {
          ports: {
            5000: 4444,
          },
        },
      };
    });
    sinon.stub(process, 'cwd').callsFake(() => 'path/to/omg/directory');
    sinon.stub(utils, 'getOpenPort').callsFake(async () => 4444);
  });

  afterEach(() => {
    (ora.start as any).restore();
    (fs.existsSync as any).restore();
    (fs.readFileSync as any).restore();
    (JSON.parse as any).restore();
    (process.cwd as any).restore();
    (rp.makeRequest as any).restore();
    (utils.getOpenPort as any).restore();
  });

  describe('.go(event)', () => {
    const m = new Microservice({
      omg: 1,
      actions: {
        foo: {
          events: {
            bar: {
              arguments: {
                x: {
                  type: 'int',
                  in: 'requestBody',
                  required: true,
                },
              },
              http: {
                port: 5000,
                subscribe: {
                  method: 'post',
                  path: '/sub',
                },
                unsubscribe: {
                  method: 'post',
                  path: '/sub',
                },
              },
            },
          },
        },
      },
    });

    test('fails because required arguments are not supplied', async () => {
      try {
        await new Subscribe(m, {}).go('foo', 'bar');
      } catch (e) {
        expect(oraStartStub.calledWith('Subscribing to event: `bar`'));
        expect(e.spinner).toBeTruthy();
        expect(e.message).toBe('Failed subscribing to event: `bar`. Need to supply required arguments: `x`');
      }
    });

    test('subscribes to the event', async () => {
      await new Subscribe(m, {x: '1'}).go('foo', 'bar');

      expect(rpMakeRequestStub.args[0][0].body.data).toEqual({x: 1});
      expect(rpMakeRequestStub.args[0][0].body.endpoint).toEqual('http://host.docker.internal:4444');
      expect(rpMakeRequestStub.args[0][0].json).toBeTruthy();
      expect(rpMakeRequestStub.args[0][0].method).toEqual('post');
      expect(rpMakeRequestStub.args[0][0].uri).toEqual('http://localhost:4444/sub');
    });
  });
});
