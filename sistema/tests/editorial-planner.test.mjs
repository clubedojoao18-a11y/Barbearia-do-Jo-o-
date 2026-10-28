import test from 'node:test';
import assert from 'node:assert/strict';
import {editorialDrafts} from '../worker/editorial-planner.js';

test('barbearia generates reviewable daily drafts',()=>{
 const x=editorialDrafts({project:'barbearia',startDate:'2026-11-01',count:7});
 assert.equal(x.length,7);
 assert.equal(x[0].date,'2026-11-01');
 assert.equal(x[6].date,'2026-11-07');
 assert.ok(x.every(y=>y.status==='draft'&&!y.authorized&&y.requiresReview));
});
test('EU SOU drafts remain unapproved',()=>{
 const x=editorialDrafts({project:'eusou',startDate:'2026-11-01',count:3});
 assert.ok(x.every(y=>y.project==='eusou'&&!y.assetUrl));
});
test('invalid dates and excessive counts are rejected',()=>{
 assert.throws(()=>editorialDrafts({startDate:'2026-02-30'}),RangeError);
 assert.throws(()=>editorialDrafts({startDate:'2026-11-01',count:1000}),RangeError);
});

