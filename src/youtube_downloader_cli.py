from pytubefix import YouTube
from pytubefix.cli import on_progress
import os
from pathlib import Path


def download_video(url, output_path=None):
    """
    Download a YouTube video given its URL.
    
    Args:
        url (str): The YouTube video URL
        output_path (str, optional): Directory to save the video. Defaults to Downloads folder.
    
    Returns:
        str: Path to downloaded video file
    """
    try:
        # Create YouTube object
        yt = YouTube(url, on_progress_callback = on_progress)
        
        # Get highest resolution stream
        video_no_sound = yt.streams.filter(file_extension='mp4', progressive=False)\
            .order_by('resolution').desc().first()
        video_with_sound = yt.streams.filter(file_extension='mp4', progressive=True)\
            .order_by('resolution').desc().first()
        if video_no_sound.resolution > video_with_sound.resolution:
            video = video_no_sound
        else:
            video = video_with_sound
            
        # Set default output path to Downloads folder if none specified
        if output_path is None:
            output_path = str(Path.home() / "Downloads")
        
        # Create output directory if it doesn't exist
        os.makedirs(output_path, exist_ok=True)
        
        # Download the video
        print(f"Downloading: {yt.title}")
        video_path = video.download(output_path)
        print(f"Download complete! Saved to: {video_path}")
        
        # return video_path
        
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        return None

def main():
    # Example usage
    url = input("Enter YouTube URL: ")
    download_video(url)

if __name__ == "__main__":
    main()