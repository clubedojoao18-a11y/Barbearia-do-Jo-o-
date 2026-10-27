import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateCommunityScenario} from '../worker/eusou-finance.js';

test('EU SOU scenario calculates gross and estimated net without side effects',()=>{
 const x=calculateCommunityScenario({founders:10,members:40,paymentPercent:4,monthlyFixedCosts:100000});
 assert.equal(x.totalMembers,50);
 assert.equal(x.gross,1350000);
 assert.equal(x.estimatedFees,54000);
 assert.equal(x.net,1196000);
 assert.equal(x.currency,'BRL');
 assert.equal(x.estimated,true);
});
test('EU SOU calculator handles empty community',()=>{
 const x=calculateCommunityScenario({});
 assert.equal(x.gross,0);
 assert.equal(x.marginPercent,0);
});
test('EU SOU calculator rejects negative counts and invalid rates',()=>{
 assert.throws(()=>calculateCommunityScenario({members:-1}),RangeError);
 assert.throws(()=>calculateCommunityScenario({paymentPercent:101}),RangeError);
 assert.throws(()=>calculateCommunityScenario({memberPrice:1.5}),RangeError);
});
