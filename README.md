### Repro example for invalid LT in local node

### How to run

```
npm install
npm run test
```

### Example output

```
Emitter address: 0:de11fc1d8a37626671a45663b65f81a2e1d82c71f3443960fb319ae7014a4111

Deployment tx: {
  lt: '67',
  hash: '79bb6f5e4d12579504d26c7595455dc92a9261d6f8106d8cab1b9c0e1e9f7a7a'
} 

LT before the emitter tx: 65

Emitter TX: {
  lt: '69',
  hash: 'c2168ffaaf644f54fe89e9c3adf7e25acb02814db5f89c62cc2909454f7646f3'
} 

LT after the emitter tx: 65

AssertionError [ERR_ASSERTION]: false == true
    at /home/ivan/projects/local-node-lt-mre/tests/1-emit.ts:95:9
    at processTicksAndRejections (node:internal/process/task_queues:95:5) {
  generatedMessage: true,
  code: 'ERR_ASSERTION',
  actual: false,
  expected: true,
  operator: '=='
}
```

As you can see the `last_trans_lt` of the emitter is unchanged. That is the bug.
