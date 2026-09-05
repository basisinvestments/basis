import { ImageResponse } from 'next/og';

/**
 * The favicon: the instrument's dot on black.
 *
 * The amber pip is the one mark that means "on" everywhere in the interface — it sits
 * beside the session label in the bar and beside the status line on the desk. A tab
 * showing the same pip reads as one more instance of the same instrument.
 */
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: '#FFB454',
            boxShadow: '0 0 10px #FFB454',
          }}
        />
      </div>
    ),
    size,
  );
}
