import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

function createLocalStorage(seed = {}) {
  const store = new Map(Object.entries(seed));

  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    }
  };
}

describe("frontend bootstrap", () => {
  it("adapts normalized API payloads into the existing window globals", async () => {
    const script = fs.readFileSync(path.resolve(__dirname, "../public/data.jsx"), "utf8");
    const localStorage = createLocalStorage();
    const context: Record<string, any> = {
      console,
      Date,
      localStorage,
      TWEAK_DEFAULTS: {
        theme: "bold",
        font: "instrument",
        dark: false,
        showEmpty: false
      },
      apiFetch: async (requestPath: string) => {
        if (requestPath === "/api/closets") {
          return [
            {
              id: "closet-1",
              name: "Main Wardrobe",
              subtitle: "Everyday staples",
              accent: "#8B7A63",
              tags: ["minimalist"],
              itemCount: 2,
              sections: [
                {
                  id: "section-1",
                  name: "Knitwear",
                  tags: ["wool"],
                  itemCount: 1
                }
              ]
            }
          ];
        }

        if (requestPath === "/api/items") {
          return [
            {
              id: "item-1",
              closetId: "closet-1",
              sectionId: "section-1",
              brand: "Toteme",
              name: "Oversized Wool Cardigan",
              price: "$690",
              originalPrice: null,
              currency: "USD",
              source: "toteme-studio.com",
              url: "https://toteme-studio.com/cardigan",
              season: "F/W",
              tags: ["wool", "oversized"],
              colors: ["Cream"],
              description: "Dropped shoulder cardigan.",
              imageUrl: null,
              favorited: false,
              addedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
            }
          ];
        }

        if (requestPath === "/api/tags") {
          return [
            {
              id: "tag-1",
              name: "wool",
              color: "#8B7A63",
              itemCount: 1
            }
          ];
        }

        throw new Error(`Unexpected request path: ${requestPath}`);
      }
    };

    context.window = context;
    vm.runInNewContext(script, context, { filename: "data.jsx" });
    await context.__WS_DATA_READY__;

    expect(context.CLOSETS).toHaveLength(1);
    expect(context.CLOSETS[0]).toMatchObject({
      id: "closet-1",
      itemCount: 2,
      sections: [{ id: "section-1", count: 1 }]
    });
    expect(context.ITEMS[0]).toMatchObject({
      closet: "closet-1",
      section: "section-1",
      desc: "Dropped shoulder cardigan."
    });
    expect(context.TAG_LIBRARY).toEqual([
      {
        name: "wool",
        color: "#8B7A63",
        count: 1
      }
    ]);
  });
});
