import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Video, VideoOff, Camera, Wifi, WifiOff, Activity, Upload, Film, Download, Play } from 'lucide-react';
import { getAssetUrl, getStreamWsUrl, processVideo } from '../services/api';

export default function LiveStream() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const confidenceRef = useRef(0.35);

  // Live Stream State
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [annotatedFrame, setAnnotatedFrame] = useState(null);
  const [streamStats, setStreamStats] = useState({ fps: 0, total_detections: 0, categories: {} });
  const [error, setError] = useState(null);
  const [confidence, setConfidence] = useState(0.35);

  // Video Upload State
  const [videoFile, setVideoFile] = useState(null);
  const [videoProcessing, setVideoProcessing] = useState(false);
  const [videoResult, setVideoResult] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mode, setMode] = useState('live'); // 'live' | 'upload'

  // ─── Live Stream Logic ───
  const cleanupLocalStream = useCallback((clearPreview = true) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
    setIsConnected(false);
    setStreamStats({ fps: 0, total_detections: 0, categories: {} });
    if (clearPreview) {
      setAnnotatedFrame(null);
    }
  }, []);

  const stopStream = useCallback(() => {
    if (wsRef.current) {
      const socket = wsRef.current;
      wsRef.current = null;
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      socket.close();
    }
    cleanupLocalStream(true);
  }, [cleanupLocalStream]);

  useEffect(() => {
    confidenceRef.current = confidence;
  }, [confidence]);

  const startStream = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const wsUrl = getStreamWsUrl();
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsStreaming(true);
        intervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN && videoRef.current) {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            canvas.width = 640;
            canvas.height = 480;
            ctx.drawImage(videoRef.current, 0, 0, 640, 480);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            const base64 = dataUrl.split(',')[1];
            ws.send(JSON.stringify({ frame: base64, confidence: confidenceRef.current, skip_frames: 3 }));
          }
        }, 100);
      };

      ws.onmessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          setError('Received an unreadable response from the backend stream.');
          return;
        }

        if (data.error) {
          setError(data.error);
          return;
        }

        if (data.frame) {
          setAnnotatedFrame(`data:image/jpeg;base64,${data.frame}`);
          setStreamStats({
            fps: data.fps || 0,
            total_detections: data.total_detections || 0,
            categories: data.categories || {},
          });
        }
      };

      ws.onerror = () => {
        setError('WebSocket connection failed. Ensure the backend is running.');
        cleanupLocalStream(false);
      };
      ws.onclose = () => {
        wsRef.current = null;
        cleanupLocalStream(false);
      };
    } catch (err) {
      setError(err.name === 'NotAllowedError'
        ? 'Camera access denied. Please allow camera permissions.'
        : 'Failed to access camera: ' + err.message);
    }
  }, [cleanupLocalStream]);

  useEffect(() => () => stopStream(), [stopStream]);

  // ─── Video Upload Logic ───
  const onDropVideo = useCallback((files) => {
    if (files[0]) {
      setError(null);
      setVideoFile(files[0]);
      setVideoResult(null);
    }
  }, []);

  const dzVideo = useDropzone({
    onDrop: onDropVideo,
    accept: { 'video/*': ['.mp4', '.avi', '.mov', '.mkv'] },
    maxFiles: 1,
  });

  const handleProcessVideo = async () => {
    if (!videoFile) return;
    setError(null);
    setVideoProcessing(true);
    setUploadProgress(0);
    try {
      const result = await processVideo(videoFile, confidence, 60, (e) => {
        if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      });
      setVideoResult(result);
    } catch (err) {
      setError('Video processing failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setVideoProcessing(false);
    }
  };

  const catEntries = Object.entries(mode === 'live' ? streamStats.categories : (videoResult?.category_totals || {}));

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Mode Switcher */}
      <div className="flex items-center gap-1 bg-surface-900/60 rounded-xl p-1">
        <button
          onClick={() => { setMode('live'); setError(null); stopStream(); }}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all
            ${mode === 'live' ? 'bg-emerald-500/20 text-emerald-300' : 'text-surface-300 hover:text-surface-200'}`}
        >
          <Camera size={14} /> Live Camera Feed
        </button>
        <button
          onClick={() => { setMode('upload'); setError(null); stopStream(); }}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all
            ${mode === 'upload' ? 'bg-blue-500/20 text-blue-300' : 'text-surface-300 hover:text-surface-200'}`}
        >
          <Film size={14} /> Upload Video File
        </button>
      </div>

      {/* Confidence Slider */}
      <div className="glass-card p-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs font-medium text-surface-300">Detection Confidence</label>
          <span className="text-xs font-mono font-bold text-brand-400">{Math.round(confidence * 100)}%</span>
        </div>
        <input type="range" min="0.1" max="0.9" step="0.05" value={confidence}
          onChange={(e) => setConfidence(parseFloat(e.target.value))} className="w-full" />
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">{error}</div>
      )}

      {/* ═══ LIVE MODE ═══ */}
      {mode === 'live' && (
        <>
          <div className="flex items-center gap-3">
            {!isStreaming ? (
              <button onClick={startStream} className="flex-1 btn-primary flex items-center justify-center gap-2">
                <Camera size={16} /> Start Live Camera Feed
              </button>
            ) : (
              <button onClick={stopStream}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all">
                <VideoOff size={16} /> Stop Stream
              </button>
            )}
            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold
              ${isConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-surface-800/40 text-surface-300/40 border border-surface-700/30'}`}>
              {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
              {isConnected ? 'Live' : 'Offline'}
            </div>
          </div>

          <div className="relative glass-card overflow-hidden">
            <video ref={videoRef} style={{ display: 'none' }} playsInline muted />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            {annotatedFrame ? (
              <img src={annotatedFrame} alt="Live AI Detection" className="w-full rounded-2xl" />
            ) : isStreaming ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-10 h-10 border-3 border-brand-500/30 border-t-brand-400 rounded-full animate-spin mb-4" />
                <p className="text-xs text-surface-300">Connecting to AI inference engine...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-surface-800/60 flex items-center justify-center mb-4">
                  <Video className="w-7 h-7 text-surface-300/30" />
                </div>
                <p className="text-sm text-surface-300/60 font-medium">Real-time Drone Feed</p>
                <p className="text-xs text-surface-300/30 mt-1 max-w-[250px]">
                  Click "Start Live Camera Feed" to begin real-time AI detection using your camera
                </p>
              </div>
            )}
            {isStreaming && streamStats.total_detections > 0 && (
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-sm">
                  <Activity size={12} className="text-emerald-400" />
                  <span className="text-xs font-mono text-emerald-400">{streamStats.fps} FPS</span>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-sm">
                  <span className="text-xs font-mono text-amber-400">{streamStats.total_detections} assets</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══ VIDEO UPLOAD MODE ═══ */}
      {mode === 'upload' && (
        <>
          {/* Drop Zone */}
          <div
            {...dzVideo.getRootProps()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-6 transition-all duration-300 text-center
              ${dzVideo.isDragActive ? 'border-blue-400 bg-blue-500/5' : 'border-surface-700/60 hover:border-blue-500/40'}`}
          >
            <input {...dzVideo.getInputProps()} />
            {videoFile ? (
              <div>
                <Film className="mx-auto mb-2 text-blue-400" size={28} />
                <p className="text-sm text-surface-200 font-semibold">{videoFile.name}</p>
                <p className="text-[10px] text-surface-300/60 mt-1">
                  {(videoFile.size / (1024 * 1024)).toFixed(1)} MB • Click to change
                </p>
              </div>
            ) : (
              <div>
                <Upload className="mx-auto mb-2 text-surface-300/40" size={28} />
                <p className="text-sm text-surface-300/60">Drop drone video here</p>
                <p className="text-[10px] text-surface-300/30 mt-1">MP4, AVI, MOV, MKV</p>
              </div>
            )}
          </div>

          {/* Process Button */}
          <button
            onClick={handleProcessVideo}
            disabled={!videoFile || videoProcessing}
            className={`w-full btn-primary flex items-center justify-center gap-2
              ${(!videoFile) ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {videoProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {uploadProgress < 100 ? `Uploading ${uploadProgress}%...` : 'Processing frames...'}
              </>
            ) : (
              <><Play size={16} /> Process Video</>
            )}
          </button>

          {/* Video Result */}
          {videoResult && (
            <div className="space-y-3 animate-slide-up">
              {/* Video Info */}
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {[
                  { label: 'Duration', value: `${videoResult.video_info.duration_seconds}s` },
                  { label: 'Resolution', value: videoResult.video_info.resolution },
                  { label: 'Frames', value: videoResult.video_info.frames_analyzed },
                  { label: 'Detections', value: videoResult.total_unique_detections },
                ].map(({ label, value }) => (
                  <div key={label} className="glass-card p-3 text-center">
                    <p className="text-sm font-bold text-brand-400">{value}</p>
                    <p className="text-[9px] text-surface-300/60 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Download annotated video */}
              {videoResult.annotated_video_url && (
                <button
                  onClick={async () => {
                    const res = await fetch(getAssetUrl(videoResult.annotated_video_url));
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `annotated_${videoResult.job_id.slice(0, 8)}.mp4`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold
                    bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg hover:shadow-emerald-500/20 transition-all"
                >
                  <Download size={14} /> Download Annotated Video (.mp4)
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Category Summary (shared) */}
      {catEntries.length > 0 && (
        <div className="glass-card p-4">
          <p className="text-xs font-semibold text-surface-200 mb-3 flex items-center gap-1.5">
            <Activity size={12} className="text-emerald-400" />
            {mode === 'live' ? 'Live Detections' : 'Video Detections'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {catEntries.map(([cat, count]) => (
              <div key={cat} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-800/40">
                <span className="text-[10px] text-surface-300 truncate mr-2">{cat}</span>
                <span className="text-xs font-bold text-brand-400">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
