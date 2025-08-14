# server.py
from flask import Flask, request, jsonify, send_file
from yt_dlp import YoutubeDL
from flask_cors import CORS
import os
import re

app = Flask(__name__)
CORS(app)  # Enable CORS for all origins

DOWNLOAD_FOLDER = 'downloads'
if not os.path.exists(DOWNLOAD_FOLDER):
    os.makedirs(DOWNLOAD_FOLDER)

# Helper function to format duration
def format_duration(seconds):
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    remaining_seconds = seconds % 60
    if hours > 0:
        return f"{hours}:{minutes:02}:{remaining_seconds:02}"
    return f"{minutes}:{remaining_seconds:02}"

@app.route('/api/fetch-video', methods=['POST'])
def fetch_video_info():
    """
    Endpoint to fetch video information from a YouTube URL.
    """
    data = request.json
    url = data.get('url')
    if not url:
        return jsonify({'error': 'Video URL is required'}), 400

    ydl_opts = {
        'format': 'best',
        'quiet': True,
        'skip_download': True,
    }

    try:
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            video_info = {
                'id': info.get('id'),
                'title': info.get('title'),
                'thumbnail': info.get('thumbnail'),
                'duration': format_duration(info.get('duration', 0)),
                'views': f"{info.get('view_count', 0):,}",
                'description': info.get('description', ''),
            }
        return jsonify(video_info)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/download-video', methods=['GET'])
def download_video():
    """
    Endpoint to download a video or audio file.
    """
    video_id = request.args.get('id')
    file_format = request.args.get('format')
    quality = request.args.get('quality')

    if not video_id or not file_format or not quality:
        return jsonify({'error': 'Video ID, format, and quality are required'}), 400
    
    url = f'https://www.youtube.com/watch?v={video_id}'
    filename = re.sub(r'[^\w\s]', '', video_id) # Clean filename

    ydl_opts = {}
    if file_format == 'mp4':
        ydl_opts['format'] = f'bestvideo[height<=?{quality}]+bestaudio/best'
        ydl_opts['outtmpl'] = os.path.join(DOWNLOAD_FOLDER, f'{filename}.mp4')
        file_path = os.path.join(DOWNLOAD_FOLDER, f'{filename}.mp4')
    elif file_format == 'mp3':
        ydl_opts['format'] = 'bestaudio/best'
        ydl_opts['postprocessors'] = [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }]
        ydl_opts['outtmpl'] = os.path.join(DOWNLOAD_FOLDER, f'{filename}.mp3')
        file_path = os.path.join(DOWNLOAD_FOLDER, f'{filename}.mp3')
    else:
        return jsonify({'error': 'Invalid format specified'}), 400
    
    try:
        with YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        
        if os.path.exists(file_path):
            return send_file(file_path, as_attachment=True, mimetype=f'application/{file_format}', download_name=f'{filename}.{file_format}')
        else:
            return jsonify({'error': 'Download failed, file not found on server'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000)
