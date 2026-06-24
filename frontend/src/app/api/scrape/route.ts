import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const html = await res.text();
    
    // Simple HTML strip to reduce payload size for the LLM
    const text = html.replace(/<style[^>]*>.*?<\/style>/gi, '')
                     .replace(/<script[^>]*>.*?<\/script>/gi, '')
                     .replace(/<[^>]*>?/gm, ' ')
                     .replace(/\s+/g, ' ')
                     .trim();
    
    // Return up to 12000 characters to stay within LLM context limits
    return NextResponse.json({ text: text.substring(0, 12000) });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
