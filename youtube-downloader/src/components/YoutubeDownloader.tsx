import { useState } from 'react'
import {Loader2, Check, FileDown } from 'lucide-react'

interface VideoQuality {
  itag: number;
  resolution: string;
  filesize: number;
  has_audio: boolean;
}

interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: number;
  views: number;
  author: string;
  qualities: VideoQuality[];
}

const YoutubeDownloader = () => {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [selectedItag, setSelectedItag] = useState<number | null>(null)
  const [downloading, setDownloading] = useState(false)

  // Format filesize to human readable format
  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Byte'
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString())
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
  }

  // Format duration to MM:SS
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Format views count
  const formatViews = (views: number): string => {
    if (views >= 1000000) {
      return (views / 1000000).toFixed(1) + 'M'
    } else if (views >= 1000) {
      return (views / 1000).toFixed(1) + 'K'
    }
    return views.toString()
  }

  const handleFetchInfo = async () => {
    if (!url.trim()) {
      setError('Please enter a YouTube URL')
      return
    }

    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      setError('Please enter a valid YouTube URL')
      return
    }

    setLoading(true)
    setError('')
    setVideoInfo(null)

    try {
      const response = await fetch('http://127.0.0.1:5000/api/video-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch video information')
      }

      const data = await response.json()
      setVideoInfo(data)
      // Select highest quality by default
      const highestQuality = data.qualities.reduce((prev: VideoQuality, current: VideoQuality) => {
        if (!prev || (current.has_audio && parseInt(current.resolution) > parseInt(prev.resolution))) {
          return current
        }
        return prev
      })
      setSelectedItag(highestQuality?.itag)
    } catch (err) {
      setError('Failed to fetch video information. Please try again.' + err)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!selectedItag) {
      setError('Please select a resolution')
      return
    }

    setDownloading(true)
    setError('')

    try {
      const response = await fetch('http://127.0.0.1:5000/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url,
          itag: selectedItag
        }),
      })

      if (!response.ok) {
        throw new Error('Download failed')
      }

      // Create a blob from the response
      const blob = await response.blob()
      // Create a download link
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `${videoInfo?.title || 'video'}.mp4`
      document.body.appendChild(a)
      a.click()
      // Cleanup
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)
    } catch (err) {
      setError('Failed to download video. Please try again.' + err)
    } finally {
      setDownloading(false)
    }
  }

  const resetForm = () => {
    setUrl('')
    setVideoInfo(null)
    setSelectedItag(null)
    setError('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-dark-lighter p-6 rounded-xl shadow-xl border border-gray-700">
        <div className="flex items-center gap-2 mb-6">
          <h1 className="text-2xl font-bold text-white">YouTube Downloader</h1>
        </div>

        <div className="space-y-4">
          {/* Step 1: URL Input */}
          <div className="space-y-2">
            <input
              type="url"
              placeholder="Paste YouTube URL here..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="input-dark w-full"
              disabled={loading || !!videoInfo}
            />
            
            {!videoInfo && (
              <button
                className="btn-primary w-full"
                onClick={handleFetchInfo}
                disabled={loading || !url}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Fetching Video Info...
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5" />
                    Fetch Video Info
                  </>
                )}
              </button>
            )}
          </div>

          {/* Step 2: Video Info & Quality Selection */}
          {videoInfo && (
            <div className="space-y-4 border border-gray-700 rounded-lg p-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-white">{videoInfo.title}</h3>
                <img 
                  src={videoInfo.thumbnail} 
                  alt={videoInfo.title}
                  className="w-full h-48 object-cover rounded-lg"
                />
                <div className="flex justify-between text-sm text-gray-400">
                  <span>{videoInfo.author}</span>
                  <span>{formatDuration(videoInfo.duration)} • {formatViews(videoInfo.views)} views</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Select Quality:
                </label>
                <select
                  value={selectedItag || ''}
                  onChange={(e) => setSelectedItag(Number(e.target.value))}
                  className="input-dark w-full"
                >
                  {videoInfo.qualities
                    .sort((a, b) => parseInt(b.resolution) - parseInt(a.resolution))
                    .map((quality) => (
                    <option key={quality.itag} value={quality.itag}>
                      {quality.resolution} - {formatFileSize(quality.filesize)} 
                      {quality.has_audio ? ' (with audio)' : ' (no audio)'}
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="btn-primary w-full"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <FileDown className="h-5 w-5" />
                    Download
                  </>
                )}
              </button>

              <button
                className="w-full text-gray-400 hover:text-white text-sm"
                onClick={resetForm}
              >
                Start Over
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-900/50 border border-red-900 text-red-200 rounded-lg p-3">
              {error}
            </div>
          )}

          <p className="text-xs text-gray-400 text-center">
            This tool is for personal use only. Please respect YouTube's terms of service.
          </p>
        </div>
      </div>
    </div>
  )
}

export default YoutubeDownloader