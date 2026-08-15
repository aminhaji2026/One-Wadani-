import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ZodError, z } from 'zod';
import { param, parseLimit, zodErrorMessage } from './helpers.js';

describe('helpers', () => {
  it('parseLimit clamps and falls back', () => {
    assert.equal(parseLimit(undefined), 100);
    assert.equal(parseLimit('0'), 100);
    assert.equal(parseLimit('-3'), 100);
    assert.equal(parseLimit('12'), 12);
    assert.equal(parseLimit('999', 50, 200), 200);
  });

  it('param unwraps express params', () => {
    assert.equal(param('abc'), 'abc');
    assert.equal(param(['a', 'b']), 'a');
    assert.equal(param(undefined), '');
  });

  it('zodErrorMessage formats validation issues', () => {
    try {
      z.object({ email: z.string().email() }).parse({ email: 'bad' });
    } catch (err) {
      assert.ok(err instanceof ZodError);
      const message = zodErrorMessage(err);
      assert.match(message, /email/);
    }
    assert.equal(zodErrorMessage(new Error('boom')), 'boom');
    assert.equal(zodErrorMessage('x'), 'Server error');
  });
});
