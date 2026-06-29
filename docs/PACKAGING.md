# Packaging

## Build

```bash
npm run build
```

This produces:

- `dist/extension.js`
- `webview-ui/dist/*`

## Create a VSIX

```bash
npm run package
```

The command runs the webview build, compiles the extension backend, and then invokes `vsce package`.

## Publish Checklist

1. Build the extension.
2. Run `npm test`.
3. Confirm `webview-ui/dist` exists.
4. Confirm `media/sounds` and `media/chess-activity.svg` are included.
5. Create the `.vsix` with `npm run package`.
