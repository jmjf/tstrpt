import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('assert', () => {
    test('TEST-PASS', (t) => {
        console.log('PASS stdout', t.name);
       assert('hello' === 'hello');
    });

    test('TEST-FAIL', (t) => {
        console.error('FAIL stderr', t.name);
        const expected = 4;
        const actual = 5;
        assert (actual < expected, `${actual} < ${expected}`);
    });
});