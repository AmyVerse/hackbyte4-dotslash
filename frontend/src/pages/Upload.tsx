import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Upload = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoRecorder, setVideoRecorder] = useState<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    startCamera();
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Camera access is required for media reports.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    navigate('/success');
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (blob) {
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        await handleFileUpload(file);
        stopCamera();
      }
    }, 'image/jpeg');
  };

  const startVideoRecording = () => {
    if (!cameraStream) return;
    const recorder = new MediaRecorder(cameraStream);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const file = new File([blob], `video_${Date.now()}.webm`, { type: 'video/webm' });
      await handleFileUpload(file);
      stopCamera();
    };
    recorder.start();
    setVideoRecorder(recorder);
    setIsRecordingVideo(true);
  };

  const stopVideoRecording = () => {
    if (videoRecorder) {
      videoRecorder.stop();
      setIsRecordingVideo(false);
    }
  };

  async function handleFileUpload(file: File) {
    try {
      setIsSubmitting(true);
      const response = await fetch('https://rescuevultr.amyverse.in/get-upload-url', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ fileName: file.name, fileType: file.type }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }

      const { uploadUrl, publicUrl } = await response.json();

      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      console.log("✅ File uploaded! Access it here:", publicUrl);
      return publicUrl;
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-5000 bg-black flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-lg aspect-square md:aspect-video bg-zinc-900 rounded-sm overflow-hidden border border-white/10 shadow-2xl">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {isRecordingVideo && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase animate-pulse">
            <div className="w-2 h-2 rounded-full bg-white" />
            Recording
          </div>
        )}
        
        {isSubmitting && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-white text-[10px] font-black uppercase tracking-widest">Uploading Media...</p>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
        {!isRecordingVideo ? (
          <>
            <button
              onClick={capturePhoto}
              disabled={isSubmitting}
              className="w-full bg-white text-black py-4 font-black uppercase tracking-widest text-[12px] rounded-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              Capture Photo
            </button>
            <button
              onClick={startVideoRecording}
              disabled={isSubmitting}
              className="w-full bg-red-600 text-white py-4 font-black uppercase tracking-widest text-[12px] rounded-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              Record Video
            </button>
          </>
        ) : (
          <button
            onClick={stopVideoRecording}
            disabled={isSubmitting}
            className="w-full bg-white text-black py-4 font-black uppercase tracking-widest text-[12px] rounded-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            Stop & Upload
          </button>
        )}

        <button
          onClick={stopCamera}
          disabled={isSubmitting}
          className="w-full text-white/50 py-2 font-bold uppercase tracking-widest text-[10px] hover:text-white transition-colors cursor-pointer disabled:opacity-0"
        >
          Skip Media
        </button>
      </div>
    </div>
  );
};

export default Upload;
