# Original VibeMaul artwork

Generated with built-in image_gen; final prompts are in prompts.json. PNGs are source files; WebP files are the runtime assets, with transparency preserved.

Tower atlas: five columns, nine race rows in data.js order. First four cells per row are playable towers, except Bergsklanen which uses all five. Remaining cells are reserved race crests. Runtime coordinates and measured row boundaries are in art.js.

Enemy atlas: eight columns and five rows, in wave order 1–40. Every wave leader uses its own illustration. Boss escorts reuse the previous wave's creature. Endless waves repeat the appearance cycle. The utseende field carries the appearance index from wave creation through spawning.

Art loading has a geometric battlefield fallback and a visible error message if a file is unavailable. The bestiary pauses combat and the player resumes explicitly after closing it.
