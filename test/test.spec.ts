import { test, describe } from 'node:test';
import { expect } from 'expect';

describe('jestExpect', () => {
    test('TEST-PASS', (t) => {
        console.log('PASS stdout', t.name);
       expect('hello').toBe('hello');
    });

    test('TEST-FAIL', (t) => {
        console.error('FAIL stderr', t.name);
        expect(5).toBeLessThan(4);
    });
});