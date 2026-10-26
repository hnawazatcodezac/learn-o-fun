# ProgressTrail

Shows a child how far through the current session they are.

**Provide:** the number of steps and the current step.

- Finished steps are `leaf` dots with a check in `on-bright`. The current step is a larger `sun` dot ringed in `sun-soft`. Steps still to come are hollow, with a `line-strong` border. The trail ends in a star.
- Every step counts, whatever the answer was. A step answered after support still turns `leaf`.
- Beside the trail, show "6 of 8" in `play-label` from age 6. For ages 3 to 5, show the dots only.
- For screen readers it reads as one image: "Question 6 of 8".

**Don't:** mark wrong answers on the trail, or show a timer in it.
