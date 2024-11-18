from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import os
from pathlib import Path
from pytubefix import YouTube
import tempfile

app = Flask(__name__)
CORS(app)

@app.route('/api/video-info', methods=['POST'])
def get_video_info():
    try:
        url = request.json.get('url')
        yt = YouTube(url)
        
        # Get available qualities
        video_streams = yt.streams.filter(file_extension='mp4')
        qualities = [
            {
                'itag': stream.itag,
                'resolution': stream.resolution,
                'filesize': stream.filesize,
                'has_audio': stream.is_progressive
            }
            for stream in video_streams
        ]
        
        return jsonify({
            'title': yt.title,
            'thumbnail': yt.thumbnail_url,
            'duration': yt.length,
            'views': yt.views,
            'author': yt.author,
            'qualities': qualities
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400



@app.route('/api/download', methods=['POST'])
def download_video():
    try:
        url = request.json.get('url')
        itag = request.json.get('itag')
        
        yt = YouTube(url)
        video = yt.streams.get_by_itag(itag)
        
        # Create temporary directory for download
        with tempfile.TemporaryDirectory() as temp_dir:
            # Download the video
            file_path = video.download(temp_dir)
            
            # Send the file
            return send_file(
                file_path,
                as_attachment=True,
                download_name=f"{yt.title}.mp4",
                mimetype='video/mp4'
            )
            
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True, port=5000)