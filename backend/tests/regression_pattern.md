# Regression-assertion pattern (for removed features)

When you delete a feature, type, route, model field, or sidebar entry,
add a small **"the old thing is gone"** test. A future careless revert
or merge conflict that drags the feature back in flips this red instead
of silently re-shipping it.

## Anatomy

A regression file lives next to the feature's normal tests, with a
`_gone.py` (backend) or `.regression.test.ts` (e2e) suffix and a
1-paragraph header recording **what was removed, when, and why**.

For a removed model + endpoints + Pydantic field, four assertion bands
cover ~all surfaces:

```python
"""Regression: <removed feature> was merged into <replacement> on <date>.
If a future PR brings it back without intent, these flip red."""

# 1. HTTP surface — old endpoints return 404
def test_<feature>_list_returns_404(client, superuser_token_headers):
    r = client.get(f"{settings.API_V1_STR}/<feature>/", headers=superuser_token_headers)
    assert r.status_code == 404

# 2. Python module surface — symbols stay un-exported
def test_models_no_longer_export_<feature>_symbols():
    import app.models as models
    for sym in ("<Old>", "<OldCreate>", "<OldPublic>", ...):
        assert not hasattr(models, sym), (
            f"app.models.{sym} re-appeared — <feature> was removed on <date>"
        )

# 3. ORM surface — relationships and link tables gone
def test_<related_model>_has_no_<feature>_relationship():
    from app.models import <RelatedModel>
    assert not hasattr(<RelatedModel>, "<feature>")

# 4. Schema surface — Pydantic input fields gone
def test_<related_create>_rejects_<feature>_field():
    from app.models import <RelatedCreate>
    assert "<old_field>" not in <RelatedCreate>.model_fields
```

## Equivalent e2e regression block

Keep these inside the feature's e2e spec (top of the file, before the
"normal" feature flow), not in a separate file:

```typescript
// === REGRESSION: <feature> removed on <date> ===

results.push(await runTest(page, "Sidebar has no <Feature> link", async (p) => {
    await p.waitForFunction(
        () => Array.from(document.querySelectorAll("a[href]"))
            .map((a) => (a.textContent || "").trim())
            .includes("<ReplacementFeature>"),  // wait for a sibling link to mount
        { timeout: 10000 },
    );
    const linkTexts = await p.evaluate(() =>
        Array.from(document.querySelectorAll("a[href]")).map((a) => (a.textContent || "").trim()),
    );
    if (linkTexts.includes("<Feature>")) {
        throw new Error(`<Feature> link still in sidebar`);
    }
}));

results.push(await runTest(page, "/<old-route> does not render", async (p) => {
    await p.goto(`${BASE_URL}/<old-route>`, { waitUntil: "networkidle2" });
    await sleep(1000);
    const text = await getPageText(p);
    if (text.includes("Add <Feature>")) {
        throw new Error("Old <Feature> page still rendering");
    }
}));

results.push(await runTest(page, "API returns 404 for /<old-route>", async () => {
    const resp = await fetch(`${API_URL}/api/v1/<old-route>/`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (resp.status !== 404) {
        throw new Error(`Expected 404, got ${resp.status}`);
    }
}));

results.push(await runTest(page, "<RelatedPublic> no longer carries `<old_field>`", async () => {
    const r = await fetch(`${API_URL}/api/v1/<related>/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ /* minimal */ }),
    });
    const obj = await r.json();
    if ("<old_field>" in obj) {
        throw new Error("`<old_field>` re-appeared on <RelatedPublic>");
    }
}));
```

## Working examples

- [`backend/tests/api/routes/test_groups_gone.py`](api/routes/test_groups_gone.py)
  — full coverage of the 2026-05-06 Group → Tag merge.
- [`e2e/tags.test.ts`](../../e2e/tags.test.ts), top section
  — the e2e half of the same merge.

## When to write one

| Removal | Worth a regression test? |
|---|---|
| New module / route / model entirely deleted | Yes |
| Pydantic field removed from a public response | Yes (frontends crash on `.map` of undefined) |
| Sidebar / nav entry removed | Yes (cheap to assert) |
| ORM relationship dropped | Yes |
| Internal-only helper deleted | No — type-checking covers it |
| Comment / docstring change | No |
| Refactor that renames but preserves surface | No — covered by feature tests |

Keep the file under ~30 lines per concern. Regression tests are insurance,
not architecture documentation — anything longer drifts and gets ignored.
