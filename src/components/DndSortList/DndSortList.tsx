/*
DndSortList.tsx

Description:
  A React component that provides a drag-and-drop sortable list functionality. It allows users to reorder items in the list by dragging and dropping them. The component manages the state of the dragged item, its dimensions, and the position of the item being dragged over. It also handles the necessary events for drag-and-drop interactions.

Props:
  - items: An array of ReactNode elements representing the items in the list.
  - onListChange: A callback function that is called when the order of the list changes, providing the new list as an argument.

Sample Usage:
  import { DndSortList } from './DndSortList/DndSortList';
  import styles from './DndSortList/DndSortListItem.module.css';

  const dummyData = () => {
    return new Array(20).fill(0).map((_, i) => `Item ${i + 1}`);
  };

  ...

  const [listItems, setListItems] = useState<ReactNode[]>(
    dummyData().map((item) => <div className={styles.itemContent}>{item}</div>),
  );

  const handleListChange = (newList: ReactNode[]) => {
    setListItems(newList);
  };

  return <DndSortList items={listItems} onListChange={handleListChange} />;
*/

import React, { type FC, type ReactNode, useRef, useState } from 'react';
import styles from './DndSortList.module.css';

const ITEM_NAME_PREFIX = 'dnd-sort-list-item';

const genRandomString = (length = 6) =>
  Math.random()
    .toString(20)
    .slice(2, 2 + length);

type DimensionType = {
  width: number;
  height: number;
};

const getElementDimensions = (el: HTMLElement): DimensionType => ({
  width: el.offsetWidth,
  height: el.offsetHeight,
});

type DndSortListProps = {
  items: ReactNode[];
  onListChange: (newList: ReactNode[]) => void;
};

export const DndSortList: FC<DndSortListProps> = ({ items, onListChange }) => {
  const listItemIdPrefix = useState(`${ITEM_NAME_PREFIX}-${genRandomString()}-`)[0];
  const itemEls = useRef<(HTMLLIElement | null)[]>([]);
  const [draggedItemDim, setDraggedItemDim] = useState<DimensionType | null>(null);
  const [draggedItemPos, setDraggedItemPos] = useState<number | null>(null);
  const [draggedOverItemPos, setDraggedOverItemPos] = useState<number | null>(null);

  const getItemIndex = (id: string): number => {
    return parseInt(id.replace(listItemIdPrefix, ''));
  };

  const resetState = () => {
    if (draggedItemPos !== null) {
      setDraggedItemPos(null);
    }
    if (draggedItemDim !== null) {
      setDraggedItemDim(null);
    }
    if (draggedOverItemPos !== null) {
      setDraggedOverItemPos(null);
    }
  };

  const resetTransforms = (hardReset?: boolean) => {
    itemEls.current.forEach((el) => {
      if (!el) return;
      const itemEl = el.children[0] as HTMLElement;
      if (hardReset) {
        itemEl.style.transition = '';
      }
      itemEl.style.transform = '';
    });
  };

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>) => {
    const source = e.currentTarget;
    const draggedIndex = getItemIndex(source.id);
    const dimmensions = getElementDimensions(source);

    setDraggedItemPos(draggedIndex);
    setDraggedItemDim(dimmensions);

    setTimeout(() => {
      // The list may have unmounted, or lost this item, before the timer fires.
      const el = itemEls.current[draggedIndex];
      if (el) {
        el.style.opacity = '0.01';
      }
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();

    if (draggedItemPos !== null) {
      itemEls.current[draggedItemPos]!.style.opacity = '1';
    }

    resetState();
    resetTransforms();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (draggedItemPos === null || !draggedItemDim) return;

    const targetPos = getItemIndex(e.currentTarget.parentElement!.id);
    setDraggedOverItemPos(targetPos);

    const posDiff = targetPos - draggedItemPos;

    if (posDiff === 0) {
      resetTransforms();
      return;
    }

    itemEls.current.forEach((el, index) => {
      if (!el) return;
      const itemEl = el.children[0] as HTMLElement;
      itemEl.style.transition = 'transform 200ms ease';

      const isDraggedItem = index === draggedItemPos;

      if (posDiff > 0) {
        if (index > draggedItemPos && index <= targetPos) {
          itemEl.style.transform = `translateY(-${draggedItemDim.height}px)`;
        } else if (isDraggedItem) {
          itemEl.style.transform = `translateY(${(targetPos - draggedItemPos!) * draggedItemDim.height}px)`;
        } else {
          itemEl.style.transform = '';
        }
      } else {
        if (index < draggedItemPos && index >= targetPos) {
          itemEl.style.transform = `translateY(${draggedItemDim.height}px)`;
        } else if (isDraggedItem) {
          itemEl.style.transform = `translateY(${(targetPos - draggedItemPos!) * draggedItemDim.height}px)`;
        } else {
          itemEl.style.transform = '';
        }
      }
    });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const targetPos = getItemIndex(e.currentTarget.parentElement!.id);
    if (draggedItemPos === null || targetPos === null || draggedItemPos === targetPos) return;

    const newList = [...items];
    const draggedItem = newList[draggedItemPos];
    newList.splice(draggedItemPos, 1);
    newList.splice(targetPos, 0, draggedItem);

    resetTransforms(true);
    onListChange(newList);
  };

  const listItems = items.map((item, index) => (
    <li
      ref={(ref) => {
        itemEls.current[index] = ref;
      }}
      key={`${listItemIdPrefix}${index}`}
      id={`${listItemIdPrefix}${index}`}
      className={styles.itemWrapper}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div>{item}</div>
      <div
        className={`${styles.dropper} ${draggedItemPos !== null ? styles.dropperShow : ''}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDrop={handleDrop}
      ></div>
    </li>
  ));

  return <ul className={styles.listWrapper}>{listItems}</ul>;
};
