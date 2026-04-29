# Video Systems 101: Engineering Streaming

**Course Instructor:** Antigravity AI
**Level:** Expert Systems
**Topic:** HLS, Adaptive Bitrate, and FFmpeg

---

## Module 1: Why YouTube Doesn't Buffer

If you send a 1GB MP4 file to a mobile user on 3G:

1.  They wait 2 minutes for it to start.
2.  It pauses every 10 seconds.
3.  They rage quit.

**Solution: Adaptive Bitrate Streaming (ABR).**
We cut the video into small 10-second chunks (`.ts` files) and create a playlist (`.m3u8`).

- **Good Internet?** Download High Quality chunks.
- **Bad Internet?** Seamlessly switch to Low Quality chunks.

---

## Module 2: The Transcoding Pipeline (FFmpeg)

We don't do this manually. We use `FFmpeg`.

```python
ffmpeg.input('movie.mp4')
      .output('master.m3u8', format='hls', hls_time=10)
      .run()
```

This automagically creates:

- `segment_000.ts`
- `segment_001.ts`
- `master.m3u8`

Our `VideoTranscodingService` handles this logic in the background, keeping the main thread free.

---

## Module 3: Frontend Playback

HTML5 `<video>` tags don't support HLS natively on all browsers.
In Flutter, we use `video_player` (which uses ExoPlayer on Android and AVPlayer on iOS).
These players handle the network logic: "Buffer is getting low, switch to 480p!"

---

## Assignment

1.  Upload a video to a course.
2.  Check the `media/courses/hls/` folder.
3.  **Challenge:** Modify `VideoTranscodingService` to generate 3 quality levels (1080p, 720p, 480p) and a Master Playlist pointing to them.

_Class Dismissed. We are live._
