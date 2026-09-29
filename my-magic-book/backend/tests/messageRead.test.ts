import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Marking a contact-form message handled.
 *
 * ContactMessage has carried an isRead flag since it was written and nothing
 * ever set it, so the admin inbox showed a month-old answered message exactly
 * as urgently as one that arrived a minute ago — and the tab could not carry
 * an honest badge, because a count that never falls is worse than no count.
 *
 * The behaviour worth pinning is the toggle: it has to be able to go back.
 * A one-way "mark read" plus one mis-tap means the owner stops using the flag,
 * and then the badge lies again in the other direction.
 */

const updated: any[] = [];
vi.mock('../src/models/ContactMessage', () => ({
  default: {
    // Mongoose hands back a Query, and the controller chains .lean() on it.
    // Returning a bare promise here made every call throw and report 500 —
    // and two of these tests still went green, because they only asserted on
    // what the mock recorded before the throw.
    findByIdAndUpdate: vi.fn((id: string, patch: any) => ({
      lean: async () => {
        if (id === 'missing') return null;
        updated.push({ id, patch });
        return { _id: id, ...patch };
      },
    })),
  },
}));

let setMessageRead: any;

function call(id: string, body: any) {
  const res: any = {
    code: 200,
    payload: null as any,
    status(c: number) { this.code = c; return this; },
    json(p: any) { this.payload = p; return this; },
  };
  return setMessageRead({ params: { id }, body } as any, res).then(() => res);
}

beforeEach(async () => {
  updated.length = 0;
  ({ setMessageRead } = await import('../src/controllers/adminController'));
});

describe('PATCH /admin/messages/:id/read', () => {
  it('marks a message handled', async () => {
    const res = await call('m1', { isRead: true });
    expect(res.code).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(updated[0].patch.isRead).toBe(true);
  });

  it('puts a message back in the pile — the tick has to be undoable', async () => {
    const res = await call('m1', { isRead: false });
    expect(res.code).toBe(200);
    expect(updated[0].patch.isRead).toBe(false);
  });

  it('defaults to handled when the body says nothing', async () => {
    const res = await call('m1', {});
    expect(res.code).toBe(200);
    expect(updated[0].patch.isRead).toBe(true);
  });

  it('treats a missing body as handled rather than throwing', async () => {
    const res = await call('m1', undefined);
    expect(res.code).toBe(200);
    expect(updated[0].patch.isRead).toBe(true);
  });

  it('404s an id that is not there, instead of reporting success', async () => {
    const res = await call('missing', { isRead: true });
    expect(res.code).toBe(404);
    expect(res.payload.success).toBe(false);
  });
});
