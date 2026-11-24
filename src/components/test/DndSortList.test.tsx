import { act, fireEvent, render, screen } from '@testing-library/react';
import { type ReactNode, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DndSortList } from '../DndSortList/DndSortList';

const ITEM_HEIGHT = 40;
const LABELS = ['A', 'B', 'C', 'D', 'E'];

const makeItems = (labels: string[] = LABELS): ReactNode[] =>
  labels.map((label) => <span key={label}>{label}</span>);

const renderList = (items: ReactNode[] = makeItems(), onListChange = vi.fn()) => {
  const utils = render(<DndSortList items={items} onListChange={onListChange} />);
  return { ...utils, onListChange };
};

const getRows = () => screen.getAllByRole('listitem');
const contentOf = (row: HTMLElement) => row.children[0] as HTMLElement;
const dropperOf = (row: HTMLElement) => row.children[1] as HTMLElement;
const transforms = () => getRows().map((row) => contentOf(row).style.transform);

/** Reads the visible label of every row, in DOM order. */
const renderedLabels = () => getRows().map((row) => contentOf(row).textContent);

const startDrag = (index: number) => {
  fireEvent.dragStart(getRows()[index]);
};

const enter = (index: number) => {
  fireEvent.dragEnter(dropperOf(getRows()[index]));
};

const drop = (index: number) => {
  fireEvent.drop(dropperOf(getRows()[index]));
};

describe('DndSortList', () => {
  let offsetHeightSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Drag start defers its opacity change with setTimeout; fake timers let tests
    // decide when it fires.
    vi.useFakeTimers();
    // jsdom has no layout engine, so offsetHeight is always 0 unless stubbed.
    offsetHeightSpy = vi
      .spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
      .mockReturnValue(ITEM_HEIGHT);
  });

  afterEach(() => {
    offsetHeightSpy.mockRestore();
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('renders one draggable list item per item, in order', () => {
      renderList();

      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(getRows()).toHaveLength(LABELS.length);
      expect(renderedLabels()).toEqual(LABELS);
      getRows().forEach((row) => expect(row).toHaveAttribute('draggable', 'true'));
    });

    it('renders an empty list when there are no items', () => {
      renderList([]);

      expect(screen.getByRole('list')).toBeEmptyDOMElement();
    });

    it('gives each item a unique id with a shared per-instance prefix and its index', () => {
      renderList();

      const ids = getRows().map((row) => row.id);
      expect(new Set(ids).size).toBe(ids.length);

      const prefix = ids[0].replace(/0$/, '');
      expect(prefix).toMatch(/^dnd-sort-list-item-.+-$/);
      ids.forEach((id, index) => expect(id).toBe(`${prefix}${index}`));
    });

    it('uses a different id prefix for each component instance', () => {
      render(
        <>
          <DndSortList items={makeItems(['A'])} onListChange={vi.fn()} />
          <DndSortList items={makeItems(['B'])} onListChange={vi.fn()} />
        </>,
      );

      const [first, second] = getRows();
      expect(first.id).not.toBe(second.id);
    });

    it('keeps the id prefix stable across re-renders', () => {
      const onListChange = vi.fn();
      const { rerender } = renderList(makeItems(), onListChange);
      const idsBefore = getRows().map((row) => row.id);

      rerender(
        <DndSortList items={makeItems([...LABELS].reverse())} onListChange={onListChange} />,
      );

      expect(getRows().map((row) => row.id)).toEqual(idsBefore);
    });
  });

  describe('drag start', () => {
    it('shows the drop zones only while an item is being dragged', () => {
      renderList();
      const dropper = dropperOf(getRows()[0]);
      const idleClassName = dropper.className;

      startDrag(1);

      getRows().forEach((row) => expect(dropperOf(row).className).toMatch(/dropperShow/));
      expect(idleClassName).not.toMatch(/dropperShow/);
    });

    it('fades out the dragged item on the next tick', () => {
      renderList();

      startDrag(2);
      // Deferred so the browser takes the drag image before the item fades.
      expect(getRows()[2].style.opacity).toBe('');

      act(() => {
        vi.runAllTimers();
      });

      expect(getRows()[2].style.opacity).toBe('0.01');
      expect(getRows()[0].style.opacity).toBe('');
    });

    it('does not throw if the list unmounts before the fade-out timer fires', () => {
      const { unmount } = renderList();

      startDrag(2);
      unmount();

      expect(() => vi.runAllTimers()).not.toThrow();
    });

    it('does not throw if the dragged item is removed before the fade-out timer fires', () => {
      const onListChange = vi.fn();
      const { rerender } = renderList(makeItems(), onListChange);

      startDrag(4);
      rerender(<DndSortList items={makeItems(['A', 'B'])} onListChange={onListChange} />);

      expect(() => act(() => vi.runAllTimers())).not.toThrow();
    });
  });

  describe('drag enter', () => {
    it('shifts the items in between up when dragging downwards', () => {
      renderList();

      startDrag(1);
      enter(3);

      expect(transforms()).toEqual([
        '',
        `translateY(${2 * ITEM_HEIGHT}px)`,
        `translateY(-${ITEM_HEIGHT}px)`,
        `translateY(-${ITEM_HEIGHT}px)`,
        '',
      ]);
    });

    it('shifts the items in between down when dragging upwards', () => {
      renderList();

      startDrag(3);
      enter(0);

      expect(transforms()).toEqual([
        `translateY(${ITEM_HEIGHT}px)`,
        `translateY(${ITEM_HEIGHT}px)`,
        `translateY(${ITEM_HEIGHT}px)`,
        `translateY(-${3 * ITEM_HEIGHT}px)`,
        '',
      ]);
    });

    it('animates the transforms', () => {
      renderList();

      startDrag(0);
      enter(1);

      getRows().forEach((row) =>
        expect(contentOf(row).style.transition).toBe('transform 200ms ease'),
      );
    });

    it('clears transforms of items no longer in between when the target moves back', () => {
      renderList();

      startDrag(0);
      enter(4);
      enter(1);

      expect(transforms()).toEqual([
        `translateY(${ITEM_HEIGHT}px)`,
        `translateY(-${ITEM_HEIGHT}px)`,
        '',
        '',
        '',
      ]);
    });

    it('resets all transforms when re-entering the dragged item itself', () => {
      renderList();

      startDrag(2);
      enter(4);
      enter(2);

      expect(transforms()).toEqual(['', '', '', '', '']);
    });

    it('does nothing when no drag is in progress', () => {
      renderList();

      enter(2);

      expect(transforms()).toEqual(['', '', '', '', '']);
    });

    it('prevents the default action so the element is a valid drop target', () => {
      renderList();
      startDrag(0);

      const notCancelled = fireEvent.dragEnter(dropperOf(getRows()[1]));

      expect(notCancelled).toBe(false);
    });
  });

  describe('drag over', () => {
    it('prevents the default action so dropping is allowed', () => {
      renderList();

      const notCancelled = fireEvent.dragOver(dropperOf(getRows()[1]));

      expect(notCancelled).toBe(false);
    });
  });

  describe('drop', () => {
    it.each([
      { from: 0, to: 2, expected: ['B', 'C', 'A', 'D', 'E'] },
      { from: 0, to: 4, expected: ['B', 'C', 'D', 'E', 'A'] },
      { from: 4, to: 0, expected: ['E', 'A', 'B', 'C', 'D'] },
      { from: 3, to: 1, expected: ['A', 'D', 'B', 'C', 'E'] },
      { from: 1, to: 2, expected: ['A', 'C', 'B', 'D', 'E'] },
    ])('moves the item from $from to $to', ({ from, to, expected }) => {
      const { onListChange } = renderList();

      startDrag(from);
      enter(to);
      drop(to);

      expect(onListChange).toHaveBeenCalledTimes(1);
      const newList = onListChange.mock.calls[0][0] as ReactNode[];
      const labels = newList.map(
        (node) => (node as { props: { children: string } }).props.children,
      );
      expect(labels).toEqual(expected);
    });

    it('does not mutate the items prop', () => {
      const items = makeItems();
      const snapshot = [...items];
      renderList(items);

      startDrag(0);
      drop(3);

      expect(items).toEqual(snapshot);
    });

    it('passes the original nodes through, not copies', () => {
      const items = makeItems();
      const { onListChange } = renderList(items);

      startDrag(0);
      drop(1);

      const newList = onListChange.mock.calls[0][0] as ReactNode[];
      expect(newList[0]).toBe(items[1]);
      expect(newList[1]).toBe(items[0]);
    });

    it('does not report a change when dropped onto its own position', () => {
      const { onListChange } = renderList();

      startDrag(2);
      drop(2);

      expect(onListChange).not.toHaveBeenCalled();
    });

    it('does not report a change when no drag is in progress', () => {
      const { onListChange } = renderList();

      drop(2);

      expect(onListChange).not.toHaveBeenCalled();
    });

    it('clears transforms and transitions so items snap into their new place', () => {
      renderList();

      startDrag(0);
      enter(3);
      drop(3);

      getRows().forEach((row) => {
        expect(contentOf(row).style.transform).toBe('');
        expect(contentOf(row).style.transition).toBe('');
      });
    });

    it('prevents the default action (e.g. the browser opening a dropped link)', () => {
      renderList();
      startDrag(0);

      const notCancelled = fireEvent.drop(dropperOf(getRows()[1]));

      expect(notCancelled).toBe(false);
    });
  });

  describe('drag end', () => {
    it('restores the dragged item opacity, hides drop zones and clears transforms', () => {
      renderList();

      startDrag(1);
      act(() => {
        vi.runAllTimers();
      });
      enter(3);

      fireEvent.dragEnd(getRows()[1]);

      expect(getRows()[1].style.opacity).toBe('1');
      expect(transforms()).toEqual(['', '', '', '', '']);
      getRows().forEach((row) => expect(dropperOf(row).className).not.toMatch(/dropperShow/));
    });

    it('ends the drag so a later drop does not reorder anything', () => {
      const { onListChange } = renderList();

      startDrag(0);
      fireEvent.dragEnd(getRows()[0]);
      drop(3);

      expect(onListChange).not.toHaveBeenCalled();
    });

    it('is safe to fire without a drag in progress', () => {
      renderList();

      expect(() => fireEvent.dragEnd(getRows()[0])).not.toThrow();
      expect(getRows()[0].style.opacity).toBe('');
    });
  });

  describe('with a parent that owns the list state', () => {
    const Harness = ({ initial }: { initial: string[] }) => {
      const [items, setItems] = useState<ReactNode[]>(makeItems(initial));
      return <DndSortList items={items} onListChange={setItems} />;
    };

    it('renders the reordered list after a full drag-and-drop cycle', () => {
      render(<Harness initial={LABELS} />);

      startDrag(0);
      enter(2);
      drop(2);
      fireEvent.dragEnd(getRows()[0]);

      expect(renderedLabels()).toEqual(['B', 'C', 'A', 'D', 'E']);
    });

    it('supports several consecutive reorders', () => {
      render(<Harness initial={LABELS} />);

      startDrag(4);
      drop(0);
      fireEvent.dragEnd(getRows()[4]);

      startDrag(1);
      drop(3);
      fireEvent.dragEnd(getRows()[1]);

      expect(renderedLabels()).toEqual(['E', 'B', 'C', 'A', 'D']);
    });
  });
});
