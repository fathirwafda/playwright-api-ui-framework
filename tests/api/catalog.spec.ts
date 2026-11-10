import { expect, test } from '../../src/fixtures';
import { required } from '../../src/utils/assert';
import { bodyOf } from '../../src/utils/http';
import type { CategoryNode } from '../../src/schemas';
import { MessageSchema, URL_SAFE_SLUG } from '../../src/schemas';

test.describe('Brands and categories API', { tag: '@api' }, () => {
  test('brands list, get by id and search agree', { tag: '@smoke' }, async ({ api }) => {
    const { body: brands } = await api.brands.list();
    const brand = required(brands[0], 'a brand');

    const { body: one } = await api.brands.get(brand.id);
    expect(one).toEqual(brand);

    const { body: found } = await api.brands.search(brand.name.slice(0, 5));
    expect(found.map((b) => b.id)).toContain(brand.id);
  });

  test('brand slugs are unique', async ({ api }) => {
    const { body } = await api.brands.list();
    const slugs = body.map((b) => b.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test('an unknown brand is 404', async ({ api }) => {
    const { response } = await api.brands.rawGet('01ZZZZZZZZZZZZZZZZZZZZZZZZ');
    await expect(response).toHaveStatus(404);
    expect(await bodyOf(response)).toMatchSchema(MessageSchema);
  });

  test('every category and brand slug is URL-safe', { tag: '@known-issue' }, async ({ api }) => {
    test.info().annotations.push({
      type: 'known-issue',
      description:
        'The "Storage Solutions" category has the slug "storage solutions" (with a space).',
    });
    // Asserts the correct behaviour and is expected to fail while the defect exists. When the
    // data is fixed this test "unexpectedly passes" and turns red, so the note cannot go stale.
    test.fail();
    const [{ body: categories }, { body: brands }] = await Promise.all([
      api.categories.list(),
      api.brands.list(),
    ]);
    const unsafe = [...categories, ...brands]
      .map((c) => c.slug)
      .filter((slug) => !URL_SAFE_SLUG.test(slug));
    expect(unsafe).toEqual([]);
  });

  test('the category tree is consistent with the flat list', async ({ api }) => {
    const [{ body: flat }, { body: tree }] = await Promise.all([
      api.categories.list(),
      api.categories.tree(),
    ]);

    const walk = (nodes: CategoryNode[], parent: string | null): CategoryNode[] =>
      nodes.flatMap((node) => {
        expect.soft(node.parent_id, `${node.slug} points at its parent`).toBe(parent);
        return [node, ...walk(node.sub_categories, node.id)];
      });
    const fromTree = walk(tree, null);

    expect(fromTree.map((c) => c.id).sort()).toEqual(flat.map((c) => c.id).sort());
  });
});
