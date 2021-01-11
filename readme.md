# Known issues

- Closing the color picker when creating a Tint Layer without actually selecting a color will result in duplicate Tint layers if you decide to finally create a Tint Layer by selecting a color. Javascript does not provide an abort event for that case, therefore this issue is not fixable without compromising ease of use for regular usage.
- Using auto-complete an the Upload using URL modal throws an expection within foundry.js (repo)
