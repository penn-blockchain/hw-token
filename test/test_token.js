const { expectThrow } = require('./utils');
const ERCToken = artifacts.require('ERCToken')

contract('ERCToken', (accounts) => {
  let token

  beforeEach(async () => {
    token = await ERCToken.new(10000, {from: accounts[0]})
  });

  it('creation: should create an initial balance of 10000 for the creator', async () => {
    const balance = await token.balanceOf.call(accounts[0]);
    assert.strictEqual(balance.toNumber(), 10000);
  });

  it('transfers: should transfer 10000 to accounts[1] with accounts[0] having 10000', async () => {
    await token.transfer(accounts[1], 10000, {from: accounts[0]});
    const balance = await token.balanceOf.call(accounts[1]);
    assert.strictEqual(balance.toNumber(), 10000);
  });

  it('transfers: should fail when trying to transfer 10001 to accounts[1] with accounts[0] having 10000', async () => {
    await expectThrow(token.transfer.call(accounts[1], 10001, {from: accounts[0]}))
  });

  it('transfers: should handle zero-transfers normally', async () => {
    assert(await token.transfer.call(accounts[1], 0, {from: accounts[0]}), 'zero-transfer has failed');
  });

  it('approvals: msg.sender should approve 100 to accounts[1]', async () => {
    await token.approve(accounts[1], 100, {from: accounts[0]});
    const allowance = await token.allowance.call(accounts[0], accounts[1]);
    assert.strictEqual(allowance.toNumber(), 100);
  });

  it('approvals: msg.sender should approve greater than total supply to accounts[1]', async () => {
    await token.approve(accounts[1], 1000000, {from: accounts[0]});
    const allowance = await token.allowance.call(accounts[0], accounts[1]);
    assert.strictEqual(allowance.toNumber(), 1000000);
  });

  // bit overkill. But is for testing a bug
  it('approvals: msg.sender approves accounts[1] of 100 & withdraws 20 once.', async () => {
    const balance0 = await token.balanceOf.call(accounts[0]);
    assert.strictEqual(balance0.toNumber(), 10000);

    await token.approve(accounts[1], 100, {from: accounts[0]}); // 100
    const balance2 = await token.balanceOf.call(accounts[2]);
    assert.strictEqual(balance2.toNumber(), 0, 'balance2 not correct');

    await token.transferFrom.call(accounts[0], accounts[2], 20, {from: accounts[1]});
    await token.allowance.call(accounts[0], accounts[1]);
    await token.transferFrom(accounts[0], accounts[2], 20, {from: accounts[1]}); // -20
    const allowance01 = await token.allowance.call(accounts[0], accounts[1]);
    assert.strictEqual(allowance01.toNumber(), 80); // =80

    const balance22 = await token.balanceOf.call(accounts[2]);
    assert.strictEqual(balance22.toNumber(), 20);

    const balance02 = await token.balanceOf.call(accounts[0]);
    assert.strictEqual(balance02.toNumber(), 9980);
  });

  // should approve 100 of msg.sender & withdraw 50, twice. (should succeed)
  it('approvals: msg.sender approves accounts[1] of 100 & withdraws 20 twice.', async () => {
    await token.approve(accounts[1], 100, {from: accounts[0]});
    const allowance01 = await token.allowance.call(accounts[0], accounts[1]);
    assert.strictEqual(allowance01.toNumber(), 100);

    await token.transferFrom(accounts[0], accounts[2], 20, {from: accounts[1]});
    const allowance012 = await token.allowance.call(accounts[0], accounts[1]);
    assert.strictEqual(allowance012.toNumber(), 80);

    const balance2 = await token.balanceOf.call(accounts[2]);
    assert.strictEqual(balance2.toNumber(), 20);

    const balance0 = await token.balanceOf.call(accounts[0]);
    assert.strictEqual(balance0.toNumber(), 9980);

    // FIRST tx done.
    // onto next.
    await token.transferFrom(accounts[0], accounts[2], 20, {from: accounts[1]});
    const allowance013 = await token.allowance.call(accounts[0], accounts[1]);
    assert.strictEqual(allowance013.toNumber(), 60);

    const balance22 = await token.balanceOf.call(accounts[2]);
    assert.strictEqual(balance22.toNumber(), 40);

    const balance02 = await token.balanceOf.call(accounts[0]);
    assert.strictEqual(balance02.toNumber(), 9960);
  });

  // should approve 100 of msg.sender & withdraw 50 & 60 (should fail).
  it('approvals: msg.sender approves accounts[1] of 100 & withdraws 50 & 60 (2nd tx should fail)', async () => {
    await token.approve(accounts[1], 100, {from: accounts[0]});
    const allowance01 = await token.allowance.call(accounts[0], accounts[1]);
    assert.strictEqual(allowance01.toNumber(), 100);

    await token.transferFrom(accounts[0], accounts[2], 50, {from: accounts[1]});
    const allowance012 = await token.allowance.call(accounts[0], accounts[1]);
    assert.strictEqual(allowance012.toNumber(), 50);

    const balance2 = await token.balanceOf.call(accounts[2]);
    assert.strictEqual(balance2.toNumber(), 50);

    const balance0 = await token.balanceOf.call(accounts[0]);
    assert.strictEqual(balance0.toNumber(), 9950);

    await expectThrow(token.transferFrom.call(accounts[0], accounts[2], 60, {from: accounts[1]}));
  });

  it('approvals: attempt withdrawalfrom account with no allowance (should fail)', async () => {
    await expectThrow(token.transferFrom.call(accounts[0], accounts[2], 60, {from: accounts[1]}))
  });

  it('approvals: allow accounts[1] 100 to withdrawfrom accounts[0]. Withdraw 60 and then approve 0 & attempt transfer.', async () => {
    await token.approve(accounts[1], 100, {from: accounts[0]});
    await token.transferFrom(accounts[0], accounts[2], 60, {from: accounts[1]});
    await token.approve(accounts[1], 0, {from: accounts[0]});
    await expectThrow(token.transferFrom.call(accounts[0], accounts[2], 10, {from: accounts[1]}));
  });
})
