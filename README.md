# Himanshu Mishra — Case File 0726-A

A portfolio built as a filing drawer. Each section is a folder; the one being
read lies open on the desk, the rest stand in the drawer.

## Run it

```sh
npm install
npm run dev      # local dev server
npm run build    # type-check and build to dist/
npm run lint
```

## How it is laid out

```
public/assets/
  audio/     recorded clips (intro voice)
  images/    the intro still, the mugshot, the seal
  resume/    the résumé PDF and the picture of it that the site shows
  video/     the film-scratch loop behind the intro
src/
  main.tsx, App.tsx
  pages/HomeExperience.tsx     intro first, then the cabinet
  data/content.ts              every word on every sheet — edit this to change the content
  audio/sfx.ts                 all sound: synthesised effects, the clips, volume, mute
  components/Grain.tsx         photocopy grain over the whole app
  styles/                      design tokens and global rules
  features/
    intro/                     black lead-in, glitch film, black fade-out
    sheet/                     a sheet of paper, the pages printed on it, and the page turn
    resume/                    the résumé sheet behind the top-bar button, and its genie animation
    cabinet/
      Cabinet.tsx              the drawer: state, physics, and every transition
      geometry.ts              where everything goes, for both layouts
      FileBody.tsx, file.css   one folder with its sheet in it
      DrawerFront.tsx          the drawer's front panel
      cabinet.css              the top bar and the drawer
```

## Things worth knowing

- **Two layouts.** The drawer rolls out of the left edge on a desktop or
  laptop and comes down from the top on a phone held upright (`layoutFor` in
  `geometry.ts` decides). Both are the same scene, turned a quarter turn.
- **The résumé.** The Resume button shows `public/assets/resume/Himanshu_CV.webp`,
  a picture of the PDF next to it, and Download hands over the PDF itself.
  After replacing the PDF run `npm run resume` to make the picture again (it
  needs `pdftoppm` and ImageMagick); if the page size changes, update `RESUME`
  in `content.ts`. Contact puts the sheet away and fetches the contact folder.
- **Animation only moves layers.** Per-frame code writes nothing but
  `transform` and `opacity`, so the browser never has to lay out or repaint
  mid-animation. Keep it that way: no per-frame size changes, CSS variables,
  or inline SVG `<text>` inside anything that moves. The one exception is the
  résumé going in and out of its button: that warp is redrawn on a canvas.
- **Sound.** Overall loudness is `VOLUME` in `src/audio/sfx.ts`. Browsers will
  not play sound before a click, which is why the intro waits behind an
  "Open file" card.
- **Folders with more than one page.** List the pages for a section in
  `PAGES` in `Sheet.tsx`; the next/previous button and the page turn appear on
  their own.
- **Tuning.** Intro timings are `BLANK` and `TAIL` in `Intro.tsx`; the paper's
  flex and the folders' springs are the constants at the top of `Cabinet.tsx`.
