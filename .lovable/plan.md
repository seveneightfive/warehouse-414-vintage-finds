

## Update Mobile Share Preview (Open Graph) and Theme Color

When you share your app on mobile, the preview image and colors come from meta tags in `index.html`. Currently they point to Lovable's default branding.

### Changes to `index.html`

**1. Replace the Open Graph image**
- Change `og:image` and `twitter:image` from the Lovable URL to your logo (e.g., `/images/logo-545.jpg` which already exists in `public/images/`)
- Update `twitter:site` from `@Lovable` to your brand or remove it

**2. Update description and author**
- Change `meta description` from "Lovable Generated Project" to "Curated vintage & mid-century modern furniture"
- Change `meta author` from "Lovable" to "Warehouse 414"

**3. Set the browser theme color to black**
- Add `<meta name="theme-color" content="#000000">` -- this controls the colored banner/bar behind the app name on mobile browsers

**4. Clean up TODO comments**

### Summary of meta tag changes

| Tag | Current | New |
|-----|---------|-----|
| `og:image` | Lovable default | `/images/logo-545.jpg` |
| `twitter:image` | Lovable default | `/images/logo-545.jpg` |
| `twitter:site` | `@Lovable` | removed |
| `description` | "Lovable Generated Project" | "Curated vintage & mid-century modern furniture" |
| `author` | "Lovable" | "Warehouse 414" |
| `theme-color` | (missing) | `#000000` |

**Note:** For the best social share preview, the Open Graph image ideally should be 1200x630px. The existing `logo-545.jpg` will work but may not look perfect in all share previews. If you have a larger banner-style image of your logo on a black background, that would be ideal to upload as a replacement.

