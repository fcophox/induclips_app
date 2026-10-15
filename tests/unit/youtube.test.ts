import { describe, it, expect } from "vitest";
import { isYouTubeThumbnail, parseYouTubeId, youTubeThumbnail, youTubeWatchUrl } from "@/lib/indulearn/youtube";

/**
 * Enlaces de YouTube que pega el administrador. Un id mal leído no da error:
 * la cápsula simplemente muestra otro video o ninguno.
 */
describe("parseYouTubeId", () => {
  const id = "dQw4w9WgXcQ";

  it.each([
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?v=${id}&t=42s&list=PL123`,
    `https://m.youtube.com/watch?feature=share&v=${id}`,
    `https://youtu.be/${id}`,
    `https://youtu.be/${id}?si=abc123`,
    `https://www.youtube.com/shorts/${id}`,
    `https://youtube.com/shorts/${id}?feature=share`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube-nocookie.com/embed/${id}`,
    `https://www.youtube.com/live/${id}`,
    `youtube.com/watch?v=${id}`,
    `  youtu.be/${id}  `,
  ])("reconoce %s", (url) => {
    expect(parseYouTubeId(url)).toBe(id);
  });

  it.each([
    "",
    "no es un enlace",
    "https://vimeo.com/123456789",
    "https://www.youtube.com/watch?v=corto",
    "https://www.youtube.com/channel/UC1234567890",
    "https://example.com/watch?v=dQw4w9WgXcQ",
    "/indulearn/videos/frenos.mp4",
  ])("rechaza %s", (url) => {
    expect(parseYouTubeId(url)).toBeNull();
  });
});

describe("miniaturas y enlace canónico", () => {
  it("arma la miniatura y la reconoce", () => {
    const thumb = youTubeThumbnail("dQw4w9WgXcQ", "maxresdefault");
    expect(thumb).toBe("https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg");
    expect(isYouTubeThumbnail(thumb)).toBe(true);
    expect(isYouTubeThumbnail("/indulearn/videos/frenos.jpg")).toBe(false);
    expect(isYouTubeThumbnail(undefined)).toBe(false);
  });

  it("guarda siempre el mismo formato de enlace", () => {
    expect(youTubeWatchUrl("dQw4w9WgXcQ")).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });
});
