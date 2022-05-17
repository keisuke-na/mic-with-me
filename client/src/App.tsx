import { RefObject, useEffect, useRef, useState } from 'react'
import logo from './logo.svg'
import './App.css'

function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [onMicroPhone, setOnMicroPhone] = useState<boolean>(false)
  const [onCamera, setOnCamera] = useState<boolean>(false)
  const [stream, setStream] = useState<MediaStream | null>(null)

  // for Camera
  useEffect(() => {
    if (onCamera || onMicroPhone) { 
      startUserMediaStream(videoRef)
    }

    // 2つのToggle Button を on->off に切り替えたときの処理
    if (!onCamera && !onMicroPhone && stream) {
      resetUserMediaStream(videoRef)
    }
  }, [onCamera, onMicroPhone])

  const startUserMediaStream = async (mediaRef: RefObject<HTMLVideoElement>) => {
    if (stream) resetUserMediaStream(mediaRef)

    const mediaStream = await navigator.mediaDevices.getUserMedia({ video: onCamera, audio: onMicroPhone })
    mediaRef.current!.srcObject = mediaStream
    mediaRef.current!.volume = (onCamera) ? 0.0 : 1.0
    mediaRef.current!.muted = (onCamera) ? true : false
    setStream(mediaStream)
  }

  // 古い Stream のトラッカーを停止させる処理 (HTML要素のstreamの解除だけではカメラは停止しない)
  const resetUserMediaStream = (mediaRef: RefObject<HTMLVideoElement>) => {
    mediaRef.current!.srcObject = null

    if (stream!.getVideoTracks()[0]) stream!.getVideoTracks()[0].stop()
    if (stream!.getAudioTracks()[0]) stream!.getAudioTracks()[0].stop()
  }

  return (
    <div className="App">
      <div className="form-check form-switch">
        <input
          className="form-check-input appearance-none w-9 -ml-10 rounded-full float-left h-5 align-top bg-white bg-no-repeat bg-contain bg-gray-300 
            focus:outline-none cursor-pointer shadow-sm"
          type="checkbox"
          role="switch"
          id="cameraCheckChecked"
          checked={onCamera}
          onChange={() => { setOnCamera(!onCamera) }}
        />
        <label className="form-check-label inline-block text-gray-800 float-left" htmlFor="cameraCheckChecked">Camera</label>
      </div>
      <br />
      <div className="form-check form-switch">
        <input
          className="form-check-input appearance-none w-9 -ml-10 rounded-full float-left h-5 align-top bg-white bg-no-repeat bg-contain bg-gray-300 
            focus:outline-none cursor-pointer shadow-sm"
          type="checkbox"
          role="switch"
          id="microphoneCheckChecked"
          checked={onMicroPhone}
          onChange={() => { setOnMicroPhone(!onMicroPhone) }}
        />
        <label className="form-check-label inline-block text-gray-800 float-left" htmlFor="microphoneCheckChecked">Microphone</label>
      </div>
      <br />
      <video id="video_local" width="320" height="240" style={{ border: "1px solid black" }} ref={videoRef} autoPlay></video>
    </div>
  )
}

export default App
