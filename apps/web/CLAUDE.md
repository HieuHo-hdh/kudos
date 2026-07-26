# Frontend code conventions (`apps/web`)

## Components

- **Prefer Ant Design (`antd`) components** over hand-rolled markup. Reach
  for `Button`, `Form`, `Input`, `Modal`, `Table`, `Card`, `Layout`,
  `Space`, `Typography`, etc. before writing custom styling. Icons come
  from `@ant-design/icons`.
- Only build a custom component when antd has no reasonable equivalent
  or the design explicitly diverges. In that case, still compose antd
  primitives (`Space`, `Flex`, `Typography`) rather than raw `<div>`s.
- Use `App` (from `antd`) message/notification/modal helpers via
  `App.useApp()` instead of the static imports so context (theme,
  ConfigProvider) is respected.

## Styling

- **Tailwind CSS v4** is the default styling primitive. Use utility
  `className`s for layout, spacing, sizing, positioning, colors, and
  typography. The Tailwind entry lives at `src/styles/tailwind.css` and
  is imported once from `main.tsx`.
- **Avoid inline `style={{ ... }}`.** Use it only when a value is
  dynamic (e.g., computed from state/props) and cannot be expressed as a
  static class or a Tailwind arbitrary value like `w-[360px]`.
- **Antd tokens carry component visuals** (brand color, radius, control
  heights, motion). Tune the shared theme in `src/styles/theme.ts` and
  the `ConfigProvider` at the app root — do not restyle antd components
  case-by-case.
- **Overriding antd internals** (e.g., `Header` background, `Typography.Title`
  margin) requires Tailwind's `!` important prefix because antd's
  `:where()`-scoped CSS has specificity 0. Example: `className="!bg-white !m-0"`.
- Prefer semantic Tailwind spacing (`p-6`, `mt-4`) over pixel arbitrary
  values. Reach for arbitrary values only when the design truly needs an
  off-scale number.

## Responsive

- Every screen and component must work from **mobile (≥360px) up to
  desktop (≥1440px)**. Verify at three widths: 360, 768, 1440.
- Use antd's responsive tooling first:
  - `Grid` (`Row` / `Col`) with `xs / sm / md / lg / xl` props for layout.
  - `Grid.useBreakpoint()` for conditional rendering.
  - `Layout.Sider` `breakpoint` + `collapsedWidth={0}` for nav collapse.
  - `Table` `scroll={{ x: true }}` or `Card` list fallback on narrow screens.
- Avoid fixed pixel widths for containers; prefer `%`, `fr`, or antd
  `Col span`. Fixed sizing is fine for icons, avatars, and single controls.
- Tap targets ≥ 44×44px on mobile. Don't rely on hover-only affordances.
- Test with the browser (Playwright MCP or devtools) at the three widths
  above before marking a UI task done.
