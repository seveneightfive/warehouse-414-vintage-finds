import { afterEach, describe, expect, it, vi } from "vitest";
import { supabase, SESSION_EXPIRED_MESSAGE, assertRowsWritten } from "@/integrations/supabase/client";

// Regression test for "changes look saved on my phone but never show on the
// website": a signed-out UPDATE used to come back as a silent 204 success.
describe("signed-out admin writes", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("refuses an UPDATE with no session instead of reporting success", async () => {
    const spy = vi.fn(async () => new Response(null, { status: 204 }));
    globalThis.fetch = spy as unknown as typeof fetch;

    const { error } = await supabase.from("products").update({ status: "sold" }).eq("id", "x");

    expect(error?.message).toBe(SESSION_EXPIRED_MESSAGE);
    expect(spy).not.toHaveBeenCalled();
  });

  it("refuses a DELETE with no session", async () => {
    const spy = vi.fn(async () => new Response(null, { status: 204 }));
    globalThis.fetch = spy as unknown as typeof fetch;

    const { error } = await supabase.from("product_holds").delete().eq("id", "x");

    expect(error?.message).toBe(SESSION_EXPIRED_MESSAGE);
    expect(spy).not.toHaveBeenCalled();
  });

  it("still lets the public site read products", async () => {
    const spy = vi.fn(async () => new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } }));
    globalThis.fetch = spy as unknown as typeof fetch;

    const { error } = await supabase.from("products").select("id").limit(1);

    expect(error).toBeNull();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("assertRowsWritten throws when nothing was updated", () => {
    expect(() => assertRowsWritten([], "Status change")).toThrow(/not saved/);
    expect(assertRowsWritten([{ id: "1" }])).toHaveLength(1);
  });
});
