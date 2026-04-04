import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReducer } from 'spacetimedb/react';
import { motion, AnimatePresence } from 'framer-motion';
import { reducers } from '../module_bindings';
import { processIncidentWithAI, formatIncidentDescription } from '../lib/ai';

const IncidentReporter = () => {
  const [description, setDescription] = useState('');
  const [userLat, setUserLat] = useState(40.7128);
  const [userLng, setUserLng] = useState(-74.006);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const navigate = useNavigate();

  const createIncident = useReducer(reducers.createIncident);

  useEffect(() => {
    let intervalId: any;
    if (isRecording && !isPaused) {
      intervalId = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [isRecording, isPaused]);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLat(position.coords.latitude);
          setUserLng(position.coords.longitude);
        },
        (error) => {
          console.log('Geolocation error:', error);
        }
      );
    }
  }, []);

  const handleSubmit = async (overrideDescription?: string, audioBlob?: Blob) => {
    const input = overrideDescription || description;
    if (!input.trim() && !audioBlob) return;

    setIsSubmitting(true);
    setIsAIProcessing(true);

    try {
      let audioData = undefined;
      if (audioBlob) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve(base64String);
          };
        });
        reader.readAsDataURL(audioBlob);
        const base64Data = await base64Promise;
        audioData = { data: base64Data, mimeType: audioBlob.type || 'audio/webm' };
      }

      const aiResponse = await processIncidentWithAI(input.trim(), audioData);
      const markdownDescription = formatIncidentDescription(aiResponse);

      await createIncident({
        category: aiResponse.category.toLowerCase(),
        description: markdownDescription,
        lat: userLat,
        lng: userLng,
      });

      /*  if (aiResponse.severity.toLowerCase() === 'critical' || aiResponse.severity.toLowerCase() === 'high') {
         try {
           fetch('https://rescue-api.amyverse.in/broadcast');
         } catch (e) { }
       } */

      setDescription('');
      setIsRecording(false);
      setRecordingSeconds(0);

      // Go to upload page
      navigate('/upload');
    } catch (error) {
      console.error('Failed to report incident:', error);
    } finally {
      setIsSubmitting(false);
      setIsAIProcessing(false);
    }
  };

  const toggleRecording = async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          handleSubmit("Audio transcription...", audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };

        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
        setIsPaused(false);
        setRecordingSeconds(0);
      } catch (err) {
        alert('Microphone access is required for voice reporting.');
      }
    } else {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.onstop = () => { }; // Prevent triggering submission
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="bg-white p-1 md:p-2 flex items-center gap-2 border border-espresso/20 rounded-sm relative shadow-sm">
        <AnimatePresence mode="wait">
          {!isRecording ? (
            <motion.div
              key="text-input"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex-1 flex items-end gap-2"
            >
              <textarea
                placeholder="Describe the incident..."
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  // Auto-expand logic
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                rows={1}
                disabled={isSubmitting}
                className="flex-1 bg-surface p-3 md:p-4 text-[14px] md:text-[15px] outline-none disabled:opacity-50 rounded-xs resize-none overflow-y-hidden min-h-[44px] md:min-h-[50px] leading-relaxed transition-all duration-200"
                style={{ height: 'auto' }}
              />
              <button
                type="button"
                onClick={toggleRecording}
                disabled={isSubmitting}
                className="w-[44px] h-[44px] md:w-[50px] md:h-[50px] bg-surface flex items-center justify-center shrink-0 transition-colors hover:bg-espresso/5 cursor-pointer text-espresso rounded-sm border border-espresso/10 selection:bg-espresso/20"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="recorder-active"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex-1 bg-terracotta/5 p-3 md:p-4 flex items-center justify-between rounded-sm"
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full bg-terracotta ${isPaused ? '' : 'animate-pulse'}`} />
                <span className="font-black text-[12px] md:text-[14px] text-espresso uppercase tracking-widest">
                  {isPaused ? 'Paused' : `${recordingSeconds}s`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsPaused(!isPaused)} className="px-3 py-1 bg-espresso/5 hover:bg-espresso/10 text-[10px] font-black uppercase cursor-pointer rounded-xs border border-espresso/10">
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button onClick={cancelRecording} className="px-3 py-1 bg-espresso/5 hover:bg-espresso/10 text-[10px] font-black uppercase cursor-pointer text-terracotta rounded-xs border border-espresso/10">
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={() => {
          if (isRecording) {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
            }
          } else {
            handleSubmit();
          }
        }}
        disabled={isSubmitting || (!description.trim() && !isRecording)}
        className="bg-terracotta text-white py-4 md:py-5 font-black text-[12px] md:text-[14px] tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-transform disabled:cursor-not-allowed cursor-pointer rounded-sm border border-espresso/20 shadow-lg"
      >
        {isSubmitting ? (isAIProcessing ? 'ANALYZING...' : 'REPORTING...') : (isRecording ? 'FINISH & UPLOAD' : 'REPORT INCIDENT')}
      </button>
    </div>
  );
};

export default IncidentReporter;
