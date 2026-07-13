import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    run: vi.fn(),
}));

vi.mock(import('../src/main'), () => ({
    run: mocks.run,
}));

beforeEach(() => {
    vi.resetModules();
    mocks.run.mockResolvedValue(undefined);
});

it('starts the action exactly once', async () => {
    await import('../src/index');

    expect(mocks.run).toHaveBeenCalledOnce();
});
