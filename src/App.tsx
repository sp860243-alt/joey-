import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, RefreshCw, Sparkles, CheckCircle2, ChevronRight, Share2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getFaceLandmarker, extractFaceTraits } from './services/faceService';
import { getPhysiognomy } from './services/geminiService';

type Step = 'intro' | 'camera' | 'analyzing' | 'result';

export default function App() {
  const [step, setStep] = useState<Step>('intro');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const webcamRef = useRef<Webcam>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);

  // Pre-load model on mount
  useEffect(() => {
    getFaceLandmarker().then(() => {
      setIsModelLoaded(true);
    }).catch(err => {
      console.error("Failed to load face landmarker", err);
      setError("AI 모델 로딩에 실패했습니다. 새로고침 해주세요.");
    });
  }, []);

  const handleCapture = useCallback(async () => {
    if (!webcamRef.current) return;
    
    setError(null);
    const imageSrc = webcamRef.current.getScreenshot();
    
    if (!imageSrc) {
      setError("사진 촬영에 실패했습니다.");
      return;
    }

    setStep('analyzing');

    try {
      const landmarker = await getFaceLandmarker();
      
      // We need to create an HTMLImageElement to pass to landmarker.detect
      const img = new Image();
      img.src = imageSrc;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const landmarksResult = landmarker.detect(img);
      
      if (!landmarksResult || !landmarksResult.faceLandmarks || landmarksResult.faceLandmarks.length === 0) {
        throw new Error("얼굴을 찾을 수 없습니다. 밝은 곳에서 정면을 응시해주세요.");
      }

      const traits = extractFaceTraits(landmarksResult.faceLandmarks[0]);
      if (!traits) {
         throw new Error("특징점 추출에 실패했습니다.");
      }

      const physiognomyResult = await getPhysiognomy(traits, imageSrc);
      
      if (!physiognomyResult || !physiognomyResult.title) {
         throw new Error("분석 결과를 받아오는데 실패했습니다.");
      }

      setResult(physiognomyResult);
      setStep('result');

    } catch (err: any) {
      console.error(err);
      setError(err.message || "분석 중 오류가 발생했습니다.");
      setStep('camera');
    }

  }, [webcamRef]);

  const handleShare = () => {
    if (navigator.share && result) {
      navigator.share({
        title: result.title,
        text: result.share_message,
        url: window.location.href,
      }).catch(console.error);
    } else {
      alert("공유하기 기능이 지원되지 않는 브라우저입니다.");
    }
  };

  const resetAll = () => {
    setStep('intro');
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 relative overflow-hidden font-sans selection:bg-fuchsia-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-fuchsia-900/20 via-slate-950 to-slate-950 pointer-events-none" />
      
      <main className="max-w-md mx-auto min-h-screen flex flex-col relative z-10 px-4 py-8">
        
        {/* Header */}
        <header className="flex items-center justify-between py-4 mb-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5 text-fuchsia-400" />
            <h1 className="font-bold text-lg tracking-tight">트렌디 AI 관상</h1>
          </motion.div>
          {step === 'result' && (
            <button onClick={resetAll} className="text-slate-400 hover:text-white transition-colors">
              <RefreshCw className="w-5 h-5" />
            </button>
          )}
        </header>

        <AnimatePresence mode="wait">
          {step === 'intro' && (
            <motion.div 
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col justify-center items-center text-center pb-20"
            >
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-fuchsia-500 to-indigo-600 flex items-center justify-center mb-8 shadow-2xl shadow-fuchsia-500/20">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-extrabold mb-4 tracking-tight leading-tight">
                내 얼굴 속에 숨겨진<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-indigo-400">
                  찐 포텐셜
                </span> 찾기
              </h2>
              <p className="text-slate-400 mb-10 leading-relaxed max-w-[280px]">
                Google AI 기술로 얼굴 468개 특징점을 분석하여 요즘 느낌으로 재해석한 관상을 확인해보세요.
              </p>
              
              <button 
                onClick={() => setStep('camera')}
                disabled={!isModelLoaded}
                className="w-full max-w-[280px] group relative inline-flex h-14 items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-8 font-medium text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-fuchsia-500/25 active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
              >
                <span className="flex items-center gap-2">
                  {isModelLoaded ? '관상 분석 시작하기' : 'AI 모델 준비중...'}
                  {isModelLoaded && <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
                </span>
              </button>
            </motion.div>
          )}

          {step === 'camera' && (
            <motion.div 
              key="camera"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex-1 flex flex-col items-center justify-center w-full"
            >
              <div className="relative w-full aspect-[3/4] max-h-[60vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 mt-4">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: 'user', aspectRatio: 3/4 }}
                  onUserMedia={() => setIsCameraReady(true)}
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />
                
                {/* Face Overlay Guide */}
                <div className="absolute inset-0 border-[3px] border-white/20 border-dashed rounded-[40%] m-8 pointer-events-none flex items-center justify-center">
                   {!isCameraReady && <RefreshCw className="w-8 h-8 animate-spin text-white/50" />}
                </div>

                <div className="absolute bottom-6 left-0 right-0 text-center">
                  <p className="text-sm font-medium text-white/80 drop-shadow-md">
                    가이드 선 안에 얼굴을 맞춰주세요
                  </p>
                </div>
              </div>

              {error && (
                <div className="mt-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl w-full text-center">
                  <p className="text-rose-400 text-sm">{error}</p>
                </div>
              )}

              <div className="mt-8 flex items-center justify-center gap-6 w-full">
                <button 
                  onClick={() => setStep('intro')}
                  className="p-4 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <button 
                  onClick={handleCapture}
                  disabled={!isCameraReady}
                  className="w-20 h-20 rounded-full bg-white flex items-center justify-center p-1 shadow-lg shadow-white/20 transition-transform active:scale-95 disabled:opacity-50"
                >
                  <div className="w-full h-full rounded-full bg-white border-2 border-slate-900 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-slate-900" />
                  </div>
                </button>
                <div className="w-[56px]" /> {/* Spacer for balance */}
              </div>
            </motion.div>
          )}

          {step === 'analyzing' && (
            <motion.div 
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-center"
            >
              <div className="relative w-32 h-32 mb-8">
                <div className="absolute inset-0 rounded-full border-4 border-fuchsia-500/20 border-t-fuchsia-500 animate-spin" />
                <div className="absolute inset-2 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin-reverse delay-150" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-fuchsia-400 animate-pulse" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">얼굴 특징점 분석 중</h3>
              <p className="text-slate-400 text-sm">AI가 눈썹, 미간, 턱관절을 스캔하고 있어요...</p>
            </motion.div>
          )}

          {step === 'result' && result && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col"
            >
              {/* Title Section */}
              <div className="text-center py-6">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-fuchsia-500/10 text-fuchsia-400 text-sm font-semibold mb-4"
                >
                  AI 관상 분석 완료
                </motion.div>
                <h2 className="text-3xl font-extrabold mb-4">{result.title}</h2>
                <div className="flex flex-wrap justify-center gap-2">
                  {result.summary_tags?.map((tag: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-300">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Analysis Cards */}
              <div className="space-y-4 mb-8">
                <ResultCard title="💸 통장&재물운" content={result.detailed_analysis.wealth} delay={0.1} />
                <ResultCard title="💖 멘탈&포용력" content={result.detailed_analysis.character} delay={0.2} />
                <ResultCard title="👩‍❤️‍👨 연애&도화살" content={result.detailed_analysis.love} delay={0.3} />
                <ResultCard title="💪 내면&건강운" content={result.detailed_analysis.health} delay={0.4} />
                <ResultCard title="🌊 인생의 파도" content={result.detailed_analysis.life_flow} delay={0.5} />
              </div>

              {/* Actions */}
              <div className="mt-auto pt-4 space-y-3 pb-8">
                <button 
                  onClick={handleShare}
                  className="w-full flex items-center justify-center gap-2 h-14 rounded-2xl bg-indigo-500 hover:bg-indigo-600 transition-colors font-medium text-white shadow-lg shadow-indigo-500/20"
                >
                  <Share2 className="w-5 h-5" />
                  SNS 공유하기
                </button>
                <button 
                  onClick={resetAll}
                  className="w-full flex items-center justify-center gap-2 h-14 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors font-medium text-white"
                >
                  다시 해보기
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function ResultCard({ title, content, delay }: { title: string, content: string, delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="p-5 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md"
    >
      <h4 className="text-base font-bold text-slate-100 mb-2 flex items-center gap-2">
        {title}
      </h4>
      <p className="text-sm text-slate-400 leading-relaxed">
        {content}
      </p>
    </motion.div>
  );
}
