import { describe, expect, it } from "vitest";
import { buildEmbedUrl, parseVideoUrl } from "@/lib/video/provider";

/**
 * The provider layer is the only place where an admin-supplied URL turns into
 * an iframe `src`. These tests lock down the security rules: exact hostname
 * matching, HTTPS-only, and refusal to guess identifiers.
 */
describe("parseVideoUrl", () => {
  describe("YouTube", () => {
    it("parses a watch URL", () => {
      const result = parseVideoUrl("https://www.youtube.com/watch?v=aqz-KE-bpKQ");
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.video.provider).toBe("youtube");
      expect(result.video.videoId).toBe("aqz-KE-bpKQ");
      expect(result.video.canonicalUrl).toBe("https://www.youtube.com/watch?v=aqz-KE-bpKQ");
    });

    it("parses a youtu.be short link", () => {
      const result = parseVideoUrl("https://youtu.be/aqz-KE-bpKQ");
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.video.videoId).toBe("aqz-KE-bpKQ");
    });

    it("parses a shorts URL", () => {
      const result = parseVideoUrl("https://www.youtube.com/shorts/aqz-KE-bpKQ");
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.video.videoId).toBe("aqz-KE-bpKQ");
    });

    it("parses an embed URL", () => {
      const result = parseVideoUrl("https://www.youtube.com/embed/aqz-KE-bpKQ");
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.video.videoId).toBe("aqz-KE-bpKQ");
    });

    it("parses a youtube-nocookie embed URL", () => {
      const result = parseVideoUrl("https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ");
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.video.videoId).toBe("aqz-KE-bpKQ");
    });

    it("rejects a video id with the wrong length", () => {
      const result = parseVideoUrl("https://www.youtube.com/watch?v=tooshort");
      expect(result.ok).toBe(false);
    });

    it("rejects a watch URL without a video id", () => {
      const result = parseVideoUrl("https://www.youtube.com/watch");
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toContain("video ID");
    });
  });

  describe("Facebook", () => {
    it("parses a numeric watch URL", () => {
      const result = parseVideoUrl("https://www.facebook.com/watch/?v=10153231379946729");
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.video.provider).toBe("facebook");
      expect(result.video.videoId).toBe("10153231379946729");
    });

    it("accepts a watch permalink it cannot normalise to an id", () => {
      const result = parseVideoUrl("https://www.facebook.com/watch/?v=abcdef");
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.video.provider).toBe("facebook");
    });

    it("rejects a share link it cannot normalise, with guidance", () => {
      const result = parseVideoUrl("https://www.facebook.com/share/r/abcdef");
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.hint).toBeTruthy();
    });
  });

  describe("security", () => {
    it("rejects javascript: URLs", () => {
      const result = parseVideoUrl("javascript:alert(1)");
      expect(result.ok).toBe(false);
    });

    it("rejects data: URLs", () => {
      const result = parseVideoUrl("data:text/html,<script>alert(1)</script>");
      expect(result.ok).toBe(false);
    });

    it("rejects plain http", () => {
      const result = parseVideoUrl("http://www.youtube.com/watch?v=aqz-KE-bpKQ");
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toContain("HTTPS");
    });

    it("rejects a hostname that merely contains youtube.com", () => {
      const result = parseVideoUrl("https://youtube.com.evil.test/watch?v=aqz-KE-bpKQ");
      expect(result.ok).toBe(false);
    });

    it("rejects a hostname that merely ends with facebook.com", () => {
      const result = parseVideoUrl("https://notfacebook.com/watch/?v=10153231379946729");
      expect(result.ok).toBe(false);
    });

    it("rejects a lookalike hostname", () => {
      const result = parseVideoUrl("https://myyoutube.com/watch?v=aqz-KE-bpKQ");
      expect(result.ok).toBe(false);
    });

    it("rejects an unrelated host", () => {
      const result = parseVideoUrl("https://example.com/video.mp4");
      expect(result.ok).toBe(false);
    });

    it("rejects an empty string", () => {
      const result = parseVideoUrl("   ");
      expect(result.ok).toBe(false);
    });

    it("rejects a URL containing whitespace", () => {
      const result = parseVideoUrl("https://www.youtube.com/watch?v=aqz KE bpKQ");
      expect(result.ok).toBe(false);
    });

    it("rejects an over-long URL", () => {
      const result = parseVideoUrl(`https://www.youtube.com/watch?v=${"a".repeat(3000)}`);
      expect(result.ok).toBe(false);
    });
  });
});

describe("buildEmbedUrl", () => {
  it("builds a privacy-enhanced YouTube embed without autoplay", () => {
    const embed = buildEmbedUrl("https://www.youtube.com/watch?v=aqz-KE-bpKQ");
    expect(embed).not.toBeNull();
    expect(embed!.embedUrl.startsWith("https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ")).toBe(
      true,
    );
    expect(embed!.embedUrl).not.toContain("autoplay=1");
  });

  it("builds the official Facebook plugin embed", () => {
    const embed = buildEmbedUrl("https://www.facebook.com/watch/?v=10153231379946729");
    expect(embed).not.toBeNull();
    expect(embed!.embedUrl.startsWith("https://www.facebook.com/plugins/video.php")).toBe(true);
    expect(embed!.embedUrl).toContain("autoplay=0");
  });

  it("returns null for an invalid URL instead of echoing the input", () => {
    expect(buildEmbedUrl("https://example.com/video.mp4")).toBeNull();
    expect(buildEmbedUrl("javascript:alert(1)")).toBeNull();
  });
});
