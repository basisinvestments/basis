import clsx from 'clsx';

/** The uppercase mono eyebrow. 10px / .22em, used everywhere. */
export function Label({
  children,
  on = false,
  className,
  style,
}: {
  children: React.ReactNode;
  on?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className={clsx('lab', on && 'lab-on', className)} style={style}>
      {children}
    </span>
  );
}
