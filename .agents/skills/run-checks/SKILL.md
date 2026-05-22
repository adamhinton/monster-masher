---
name: run-checks
description: Run checks after every change
---

<!-- Tip: Use /create-skill in chat to generate content with agent assistance -->

If I've selected this skill, it's because I want you to use our automation to verify any changes you've made.

Do this at the end of your work, and if appropriate, at various stages in the work.

- Run automated frontend and backend tests (in frontend, npx vitest, in backend, python manage.py test)
  - You can incrementally run just certain files tests because we have hundreds of unit tests. But, in the end, make sure all tests pass.
- run npm run lint in frontend
- npx tsc in frontend
- RESOLVE ALL EDITOR ERRORS RELATED TO YOUR WORK. Especially in frontend. I've carefully resolved all editor errors so far, so if you see any, there's a problem.
