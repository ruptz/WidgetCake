import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { apps, site } from '@/lib/content';

export const dynamic = 'force-static';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = `${site.name}: ${site.tagline}`;

const dataUrl = async (file: string) =>
  `data:image/png;base64,${(await readFile(join(process.cwd(), 'public', file))).toString('base64')}`;

/**
 * The share card is the launcher in miniature: the cake, the name run wide,
 * and the overlays it holds as their own badges, on the app's dark ground.
 */
export default async function OpenGraphImage() {
  const cake = await dataUrl('widgetcake.png');
  const badges = await Promise.all(apps.map((app) => dataUrl(app.logo.slice(1))));

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 64,
          padding: 72,
          background: '#101114',
          color: '#f2f2f3',
          fontFamily: 'sans-serif',
        }}
      >
        <img src={cake} width={360} height={360} style={{ borderRadius: 80 }} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 92, fontWeight: 800, letterSpacing: -2 }}>{site.name}</div>
          <div style={{ marginTop: 16, fontSize: 38, color: '#a8acb4', maxWidth: 620 }}>{site.tagline}</div>
          <div style={{ display: 'flex', gap: 18, marginTop: 44 }}>
            {badges.map((src, i) => (
              <img key={i} src={src} width={84} height={84} style={{ borderRadius: 18 }} />
            ))}
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: 18,
                border: '3px dashed #6d727b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 40,
                color: '#6d727b',
              }}
            >
              +
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
