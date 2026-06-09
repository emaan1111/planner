'use client';

import { forwardRef, useLayoutEffect, useRef, TextareaHTMLAttributes } from 'react';

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string };

// A textarea that grows to fit its content so paragraphs read like a word
// processor rather than a fixed scrolling box.
export const AutoGrowTextarea = forwardRef<HTMLTextAreaElement, Props>(function AutoGrowTextarea(
  { value, className, ...rest },
  ref
) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);

  const setRefs = (node: HTMLTextAreaElement | null) => {
    innerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
  };

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={setRefs}
      value={value}
      rows={1}
      className={className}
      {...rest}
    />
  );
});
