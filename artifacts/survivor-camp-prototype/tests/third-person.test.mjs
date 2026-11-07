import {test} from 'node:test';import assert from 'node:assert/strict';
import {analog,createDrive,drive,cancelDrive,courseAxes,turnHeading} from '../src/game/locomotion.ts';
const close=(a,b,e=.001)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
test('radial deadzone is continuous, finite and diagonal speed is bounded',()=>{assert.equal(analog(.1,0).pressure,0);assert.ok(analog(.121,0).pressure<.002);close(analog(1,1).pressure,1);assert.equal(analog(NaN,1).pressure,0);});
test('analog acceleration, running, real deceleration and cancellation',()=>{const s=createDrive();let d=drive(s,0,1,0,false,1/60);assert.ok(d.speed>0&&d.speed<1);for(let i=0;i<60;i++)d=drive(s,0,1,0,true,1/60);close(d.speed,6.4,.01);d=drive(s,0,0,0,false,1/60);assert.ok(d.dz<0&&d.speed<6.4);cancelDrive(s);assert.equal(s.vz,0);assert.equal(s.held,false);});
test('camera-relative travel freezes during orbit and rebases on next gesture',()=>{const s=createDrive();drive(s,0,1,0,false,.05);drive(s,0,1,Math.PI/2,false,.05);close(s.vx,0);cancelDrive(s);drive(s,0,1,Math.PI/2,false,.05);assert.ok(s.vx<0);close(s.vz,0);const c=createDrive();const a=courseAxes(c,0,1,Math.PI,.05);assert.ok(a.forward>0);});
test('shortest arc turn is bounded without a 180 degree snap',()=>{assert.ok(Math.abs(turnHeading(0,0,-1,.016))<=.1281);close(turnHeading(Math.PI-.01,.01,-1,.016),Math.PI-.01,.01);});
