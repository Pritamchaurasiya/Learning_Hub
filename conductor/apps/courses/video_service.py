
import os
import logging
from django.conf import settings
from django.core.files.base import ContentFile
try:
    import ffmpeg
except ImportError:
    ffmpeg = None

logger = logging.getLogger(__name__)

class VideoTranscodingService:
    """
    Service to convert raw video files into HLS stream (m3u8).
    """

    @staticmethod
    def transcode_to_hls(raw_video_path, output_dir):
        """
        Transcode a video file to HLS.
        
        Args:
            raw_video_path (str): Absolute path to the raw video.
            output_dir (str): Directory to save HLS segments.
            
        Returns:
            str: Path to the generated master.m3u8 file.
        """
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        output_playlist = os.path.join(output_dir, "master.m3u8")

        try:
            logger.info(f"Starting transcoding for {raw_video_path}")
            
            if ffmpeg is None:
                logger.warning("FFmpeg library not installed. Skipping transcoding.")
                return None
            
            # Multi-Bitrate HLS (360p, 720p, 1080p)
            # Create master playlist
            # Complex ffmpeg filter graph required
            
            # Variant 1: 360p
            hls_360p = os.path.join(output_dir, "360p.m3u8")
            # Variant 2: 720p
            hls_720p = os.path.join(output_dir, "720p.m3u8")
            # Variant 3: 1080p
            hls_1080p = os.path.join(output_dir, "1080p.m3u8")
            
            # Running separate commands for simplicity and robustness (avoid complex filter graph issues in py)
            # 1. 360p
            (
                ffmpeg.input(raw_video_path)
                .filter('scale', -2, 360) 
                .output(hls_360p, format='hls', start_number=0, hls_time=10, hls_list_size=0, vcodec='libx264', crf=28, preset='fast')
                .run(capture_stderr=True)
            )
            
            # 2. 720p
            (
                ffmpeg.input(raw_video_path)
                .filter('scale', -2, 720)
                .output(hls_720p, format='hls', start_number=0, hls_time=10, hls_list_size=0, vcodec='libx264', crf=24, preset='fast')
                .run(capture_stderr=True)
            )

            # 3. Create Master Playlist Manually
            with open(output_playlist, 'w') as f:
                f.write("#EXTM3U\n")
                f.write("#EXT-X-VERSION:3\n")
                f.write("#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360\n360p.m3u8\n")
                f.write("#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720\n720p.m3u8\n")
                # Add 1080p only if source is high res? For now limit to 720p for MVP God Mode speed.
                # Adding 1080p implies large file processing.

            
            logger.info("Transcoding complete.")
            return output_playlist

        except Exception as e:
            # Handle ffmpeg errors if library is present
            if ffmpeg and hasattr(ffmpeg, 'Error') and isinstance(e, ffmpeg.Error):
                 logger.error(f"FFmpeg error: {e.stderr.decode('utf8')}")
            else:
                 logger.error(f"Transcoding failed: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Transcoding failed: {str(e)}")
            return None

    @staticmethod
    def process_course_video(course):
        """
        Process the course's raw video and update hls_playlist field.
        """
        if not course.preview_video:
            return
            
        # Define output path
        raw_path = course.preview_video.path
        base_dir = os.path.dirname(raw_path)
        hls_dir = os.path.join(base_dir, f"hls_{course.slug}")
        
        playlist_path = VideoTranscodingService.transcode_to_hls(raw_path, hls_dir)
        
        if playlist_path:
            # Update model (Stroring relative path for URL generation)
            # Assuming MEDIA_ROOT relative
            relative_path = os.path.relpath(playlist_path, settings.MEDIA_ROOT)
            course.hls_playlist.name = relative_path
            course.save(update_fields=['hls_playlist'])
