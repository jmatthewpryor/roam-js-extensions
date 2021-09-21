import { createButtonObserver, getUidsFromButton, getTreeByBlockUid } from "roam-client";
import { renderStartRating } from "../components/StarRating";
import { addStyle, runExtension } from "../entry-helpers";

addStyle(`
.roam-star-rating {
  display: flex;
}

.roam-star-rating-star {
  cursor: pointer;
  width: 2em;
  height: 2em;
  fill: none;
}

.roam-star-rating-star-active {
    fill: yellow
}

`);

runExtension("star-rating", () => {
  createButtonObserver({
    shortcut: "star-rating",
    attribute: "rating-button",
    render: (b: HTMLButtonElement) => {
      const { blockUid } = getUidsFromButton(b);
      const tree = getTreeByBlockUid(blockUid);
      const initialValueNode = tree.children.find(
        (c) => !isNaN(parseInt(c.text))
      );
      const initialValue = initialValueNode
        ? parseInt(initialValueNode.text)
        : 0;
        renderStartRating(initialValue, initialValueNode.uid, b.parentElement);
    },
  });
});
