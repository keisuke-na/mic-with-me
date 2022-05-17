import { RefObject, useEffect, useRef, useState } from 'react'
import logo from './logo.svg'
import './App.css'

function App() {
  const mediaRef = useRef<HTMLVideoElement>(null)
  const [onCamera, setOnCamera] = useState<boolean>(false)
  const [onMicroPhone, setOnMicroPhone] = useState<boolean>(false)
  const [asSpearker, setAsSpearker] = useState<boolean>(false)

  useEffect(() => {
    if(onCamera || onMicroPhone) {
      initUserMediaStream(mediaRef)
      startUserMediaStream(mediaRef)
    }else {
      initUserMediaStream(mediaRef)
    }
  }, [onCamera ,onMicroPhone])
  
  useEffect(() => {
    mediaRef.current!.muted = (asSpearker) ? false : true
  }, [asSpearker])
  
  const startUserMediaStream = async (mediaRef: RefObject<HTMLVideoElement>) => {
    const mediaStream = await navigator.mediaDevices.getUserMedia({ video: onCamera, audio: onMicroPhone })
    mediaRef.current!.srcObject = mediaStream
    mediaRef.current!.volume = 1.0
  }

  const initUserMediaStream = (mediaRef: RefObject<HTMLVideoElement>) => {
    const mediaStream = mediaRef.current!.srcObject as MediaStream
    if (mediaStream) {
      // 古いトラッカーを停止させ初期化する処理 (HTML要素のstreamの解除だけではgetしたUserMediaは停止しない)
      if (mediaStream.getVideoTracks()[0]) mediaStream.getVideoTracks()[0].stop()
      if (mediaStream.getAudioTracks()[0]) mediaStream.getAudioTracks()[0].stop()
      mediaRef.current!.srcObject = null
    }
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
          checked={asSpearker}
          onChange={() => { setAsSpearker(!asSpearker) }}
        />
        <label className="form-check-label inline-block text-gray-800 float-left" htmlFor="cameraCheckChecked">AsSpeaker</label>
      </div>
      <br />
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
      <video id="video_local" width="320" height="240" style={{ border: "1px solid black" }} ref={mediaRef} autoPlay></video>
    </div>
  )
}

export default App
