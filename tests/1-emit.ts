import * as fs from 'fs';
import * as path from 'path';
import assert from "assert";
import {LastTransactionId, ProviderRpcClient} from 'everscale-inpage-provider';
import {EverscaleStandaloneClient, SimpleAccountsStorage, SimpleKeystore, GiverAccount} from 'everscale-standalone-client/nodejs';

const EMITTER_ABI = {
  "ABI version": 2,
  "version": "2.3",
  "header": ["time", "expire"],
  "functions": [
    {
      "name": "constructor",
      "inputs": [],
      "outputs": []
    },
    {
      "name": "emitEvents",
      "inputs": [
        {"name": "amount", "type": "uint8"}
      ],
      "outputs": []
    }
  ],
  "events": [
    {
      "name": "SomeEvent",
      "inputs": [
        {"name": "value0", "type": "uint64"}
      ],
      "outputs": []
    }
  ],
  "data": [],
} as const;
const EMITTER_TVC = fs.readFileSync(path.resolve(__dirname, '../build/Emitter.tvc')).toString('base64');

const giver = GiverAccount.fromVersion(2);

const keystore = new SimpleKeystore();
keystore.addKeyPair(GiverAccount.GIVER_KEY_PAIR);

const accountsStorage = new SimpleAccountsStorage();
accountsStorage.addAccount(giver);

const ever = new ProviderRpcClient({
  forceUseFallback: true,
  fallback: () => EverscaleStandaloneClient.create({
    connection: "local",
    keystore,
    accountsStorage,
  })
});
const subscriber = new ever.Subscriber();

(async () => {
  const tempKeys = SimpleKeystore.generateKeyPair();
  keystore.addKeyPair(tempKeys);

  const {address, stateInit} = await ever.getStateInit(EMITTER_ABI, {
    publicKey: tempKeys.publicKey,
    tvc: EMITTER_TVC,
    initParams: {},
  });
  console.log(`Emitter address: ${address}\n`);

  const {transaction: giverTx} = await ever.sendMessage({
    sender: giver.address,
    recipient: address,
    amount: '1000000000',
    bounce: false,
  });
  await subscriber.trace(giverTx).finished();

  const emitter = new ever.Contract(EMITTER_ABI, address);
  const {transaction: deploymentTx} = await emitter.methods.constructor({}).sendExternal({
    publicKey: tempKeys.publicKey,
    stateInit,
  });
  console.log('Deployment tx:', deploymentTx.id, '\n');

  const {state: emitterStateBefore} = await emitter.getFullState();
  const ltBefore = parseSmallLt(emitterStateBefore?.lastTransactionId);
  console.log(`LT before the emitter tx: ${ltBefore}\n`);

  const {transaction: tx} = await emitter.methods.emitEvents({amount: 1}).sendExternal({
    publicKey: tempKeys.publicKey,
  });
  console.log('Emitter TX:', tx.id, '\n');

  const {state: emitterStateAfter} = await emitter.getFullState();
  const ltAfter = parseSmallLt(emitterStateAfter?.lastTransactionId);
  console.log(`LT after the emitter tx: ${ltAfter}\n`);

  assert(ltBefore < ltAfter);

  await subscriber.unsubscribe();
})()

function parseSmallLt(lastTransactionId?: LastTransactionId): number {
  assert(lastTransactionId != null);
  assert(!lastTransactionId.isExact); // means that last_trans_id is from the state
  return parseInt(lastTransactionId.lt);
}
