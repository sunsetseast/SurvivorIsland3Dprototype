import test from 'node:test';
import assert from 'node:assert/strict';
import { developmentTestingAllowed, challengeTestingEnabled } from '../src/game/challenge/development.ts';
import { CONFIGURATIONS, isChallengeId } from '../src/game/challenge/configurations.ts';
test('hub authorization requires actual development; URL and rehearsal build flags cannot authorize production',()=>{
 assert.equal(developmentTestingAllowed({DEV:true}),true);
 for(const env of [{},{DEV:false},{DEV:false,VITE_CHALLENGE_REHEARSAL:'1'},{DEV:false,MODE:'development'},{DEV:'true'}])assert.equal(developmentTestingAllowed(env),false);
 globalThis.location={search:'?devTravel=1&challengeTesting=1'};assert.equal(challengeTestingEnabled(),false);delete globalThis.location;
});
test('hub metadata reuses all four registered configurations and labels only real Stillwater gameplay playable',()=>{
 assert.equal(Object.keys(CONFIGURATIONS).length,4);assert.deepEqual(Object.entries(CONFIGURATIONS).filter(([,c])=>c.playable).map(([id])=>id),['individual-balance']);
 for(const [id,c] of Object.entries(CONFIGURATIONS)){assert.ok(isChallengeId(id));assert.ok(c.description.length>20);assert.equal(c.name.split(' · ').length,2);}
});
