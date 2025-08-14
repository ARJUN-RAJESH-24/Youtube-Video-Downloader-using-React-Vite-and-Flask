from flask import Flask, request, jsonify, send_file
from yt_dlp import YoutubeDL
from flask_cors import CORS
import os
import re
import tempfile
import shutil
from urllib.parse import urlparse

app = Flask(__name__)
CORS(app)  # Enable CORS for all origins

DOWNLOAD_FOLDER = 'downloads'
if not os.path.exists(DOWNLOAD_FOLDER):
    os.makedirs(DOWNLOAD_FOLDER)

# Helper function to format duration
def format_duration(seconds):
    if not seconds or seconds == 0:
        return "0:00"
    
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    remaining_seconds = int(seconds % 60)
    
    if hours > 0:
        return f"{hours}:{minutes:02d}:{remaining_seconds:02d}"
    return f"{minutes}:{remaining_seconds:02d}"

# Helper function to clean filename
def clean_filename(filename):
    # Remove or replace invalid characters for filenames
    filename = re.sub(r'[<>:"/\\|?*]', '', filename)
    filename = re.sub(r'\s+', ' ', filename).strip()
    # Limit length
    if len(filename) > 100:
        filename = filename[:100]
    return filename

# Helper function to validate YouTube URL
def is_valid_youtube_url(url):
    youtube_patterns = [
        r'(https?://)?(www\.)?(youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)',
        r'(https?://)?(www\.)?youtube\.com/shorts/',
        r'(https?://)?(www\.)?youtube\.com/playlist\?list='
    ]
    return any(re.match(pattern, url) for pattern in youtube_patterns)

@app.route('/api/fetch-video', methods=['POST'])
def fetch_video_info():
    """
    Endpoint to fetch video information from a YouTube URL.
    """
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        url = data.get('url', '').strip()
        if not url:
            return jsonify({'error': 'Video URL is required'}), 400

        # Validate URL
        if not is_valid_youtube_url(url):
            return jsonify({'error': 'Please provide a valid YouTube URL'}), 400

        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
        }

        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            # Handle playlists
            if 'entries' in info:
                return jsonify({'error': 'Playlist URLs are not supported. Please use individual video URLs.'}), 400
            
            video_info = {
                'id': info.get('id', ''),
                'title': info.get('title', 'Unknown Title'),
                'thumbnail': info.get('thumbnail', ''),
                'duration': format_duration(info.get('duration', 0)),
                'views': f"{info.get('view_count', 0):,}" if info.get('view_count') else 'N/A',
                'description': (info.get('description', '')[:200] + '...') if info.get('description') and len(info.get('description', '')) > 200 else info.get('description', ''),
                'uploader': info.get('uploader', 'Unknown'),
                'upload_date': info.get('upload_date', ''),
            }
            
        return jsonify(video_info)
        
    except Exception as e:
        error_message = str(e)
        if "Video unavailable" in error_message:
            return jsonify({'error': 'Video is unavailable or private'}), 400
        elif "not available" in error_message.lower():
            return jsonify({'error': 'Video not available in your region'}), 400
        else:
            return jsonify({'error': f'Failed to fetch video info: {error_message}'}), 500

@app.route('/api/download-video', methods=['POST'])
def download_video():
    """
    Endpoint to download a video or audio file.
    """
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        video_id = data.get('id', '').strip()
        file_format = data.get('format', '').strip().lower()
        quality = data.get('quality', '').strip()
        title = data.get('title', video_id)

        if not video_id or not file_format or not quality:
            return jsonify({'error': 'Video ID, format, and quality are required'}), 400
        
        url = f'https://www.youtube.com/watch?v={video_id}'
        
        # Clean the title for filename
        clean_title = clean_filename(title)
        if not clean_title:
            clean_title = video_id
            
        # Create unique filename to avoid conflicts
        timestamp = str(int(os.path.getctime(__file__)) if os.path.exists(__file__) else 0)
        base_filename = f"{clean_title}_{timestamp}"

        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
        }

        if file_format == 'mp4':
            # Map quality strings to actual format selectors
            quality_map = {
                '1080': 'best[height<=1080]',
                '720': 'best[height<=720]',
                '480': 'best[height<=480]',
                '360': 'best[height<=360]',
                '240': 'best[height<=240]',
                '144': 'best[height<=144]'
            }
            
            format_selector = quality_map.get(quality, 'best')
            ydl_opts['format'] = format_selector
            ydl_opts['outtmpl'] = os.path.join(DOWNLOAD_FOLDER, f'{base_filename}.%(ext)s')
            expected_file = os.path.join(DOWNLOAD_FOLDER, f'{base_filename}.mp4')
            
        elif file_format == 'mp3':
            # Map quality strings to bitrates
            quality_map = {
                'high': '320',
                'medium': '192',
                'low': '128'
            }
            
            bitrate = quality_map.get(quality, '192')
            ydl_opts['format'] = 'bestaudio/best'
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': bitrate,
            }]
            ydl_opts['outtmpl'] = os.path.join(DOWNLOAD_FOLDER, f'{base_filename}.%(ext)s')
            expected_file = os.path.join(DOWNLOAD_FOLDER, f'{base_filename}.mp3')
            
        else:
            return jsonify({'error': 'Invalid format specified. Use "mp4" or "mp3"'}), 400

        # Download the file
        with YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        
        # Find the actual downloaded file
        downloaded_file = None
        for file in os.listdir(DOWNLOAD_FOLDER):
            if file.startswith(base_filename):
                downloaded_file = os.path.join(DOWNLOAD_FOLDER, file)
                break
        
        if downloaded_file and os.path.exists(downloaded_file):
            # Determine MIME type
            mime_type = 'video/mp4' if file_format == 'mp4' else 'audio/mpeg'
            
            def remove_file():
                try:
                    if os.path.exists(downloaded_file):
                        os.remove(downloaded_file)
                except:
                    pass
            
            # Schedule file cleanup after sending
            response = send_file(
                downloaded_file, 
                as_attachment=True, 
                mimetype=mime_type,
                download_name=f"{clean_title}.{file_format}"
            )
            
            # Clean up file after a delay (you might want to implement this differently)
            # For now, we'll keep the files and clean them up manually or with a cron job
            
            return response
        else:
            return jsonify({'error': 'Download failed - file not found'}), 500
            
    except Exception as e:
        error_message = str(e)
        if "ffmpeg" in error_message.lower():
            return jsonify({'error': 'FFmpeg is required for audio conversion. Please install FFmpeg.'}), 500
        else:
            return jsonify({'error': f'Download failed: {error_message}'}), 500

@app.route('/api/cleanup', methods=['POST'])
def cleanup_downloads():
    """
    Endpoint to clean up old download files.
    """
    try:
        cleaned_files = 0
        for filename in os.listdir(DOWNLOAD_FOLDER):
            file_path = os.path.join(DOWNLOAD_FOLDER, filename)
            try:
                os.remove(file_path)
                cleaned_files += 1
            except:
                continue
        
        return jsonify({'message': f'Cleaned up {cleaned_files} files'})
    except Exception as e:
        return jsonify({'error': f'Cleanup failed: {str(e)}'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint.
    """
    return jsonify({'status': 'healthy', 'message': 'YouTube Downloader API is running'})

if __name__ == '__main__':
    print("Starting YouTube Downloader Server...")
    print("Server will run on http://localhost:5000")
    print("Endpoints:")
    print("  POST /api/fetch-video - Fetch video information")
    print("  POST /api/download-video - Download video/audio")
    print("  POST /api/cleanup - Clean up downloaded files")
    print("  GET /health - Health check")
    app.run(debug=True, port=5000)