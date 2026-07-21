/**
 * timeline.js
 *
 * ---
 * Handles dragging the mystery card into the timeline.
 * Uses Pointer Events so mouse, touch and pen all work.
 */


export function initDragToPlace({
  cardEl,
  timelineContainer,
  canDrag,
  onDrop,
}) {


  let dragging = false;

  let startX = 0;
  let startY = 0;

  let currentX = 0;
  let currentY = 0;



  cardEl.addEventListener(
    "pointerdown",
    event => {


      if (!canDrag()) {
        return;
      }


      dragging = true;


      startX =
        event.clientX;

      startY =
        event.clientY;



      cardEl.setPointerCapture(
        event.pointerId
      );


      cardEl.classList.add(
        "is-dragging"
      );


      document.addEventListener(
        "pointermove",
        move
      );


      document.addEventListener(
        "pointerup",
        release,
        {
          once:true
        }
      );


    }
  );






  function move(event) {


    if (!dragging) {
      return;
    }



    currentX =
      event.clientX -
      startX;


    currentY =
      event.clientY -
      startY;



    cardEl.style.transform =
      `
      translate(
        ${currentX}px,
        ${currentY}px
      )
      scale(1.05)
      `;



    highlightNearestGap(
      event.clientX,
      event.clientY
    );


  }






  function release() {


    dragging = false;


    document.removeEventListener(
      "pointermove",
      move
    );


    cardEl.classList.remove(
      "is-dragging"
    );



    cardEl.style.transform =
      "";



    const target =
      clearGapHighlights()
      .find(
        gap =>
          gap.wasTarget
      );



    if (target) {

      onDrop(
        Number(
          target.el.dataset.gapIndex
        )
      );

    }

  }








  function highlightNearestGap(
    x,
    y
  ) {


    const gaps =
      [
        ...timelineContainer
        .querySelectorAll(
          ".timeline-gap"
        )
      ];



    let closest = null;

    let distance =
      Infinity;



    gaps.forEach(
      gap => {


        const rect =
          gap.getBoundingClientRect();



        const gapX =
          rect.left +
          rect.width / 2;


        const gapY =
          rect.top +
          rect.height / 2;



        const dist =
          Math.hypot(
            x-gapX,
            y-gapY
          );



        if (
          dist < distance
        ) {

          distance = dist;
          closest = gap;

        }

      }
    );



    gaps.forEach(
      gap =>
        gap.classList.toggle(
          "is-target",
          gap === closest
        )
    );


  }








  function clearGapHighlights() {


    const gaps =
      [
        ...timelineContainer
        .querySelectorAll(
          ".timeline-gap"
        )
      ];



    const result =
      gaps.map(
        el => ({

          el,

          wasTarget:
            el.classList
            .contains(
              "is-target"
            )

        })
      );



    gaps.forEach(
      gap =>
        gap.classList.remove(
          "is-target"
        )
    );


    return result;

  }






  // Mobile fallback:
  // tap a gap directly

  timelineContainer.addEventListener(
    "click",
    event => {


      if (!canDrag()) {
        return;
      }



      const gap =
        event.target.closest(
          ".timeline-gap"
        );



      if (gap) {

        onDrop(
          Number(
            gap.dataset.gapIndex
          )
        );

      }


    }
  );


}