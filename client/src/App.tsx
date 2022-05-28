import { MutableRefObject, RefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import ServerToClientEvents from 'socket.io-client'
import ClientToServerEvents from 'socket.io-client'
import logo from './logo.svg'
import './App.css'


function App() {
  const socket = useMemo(() => io(), [])
  const videoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const remoteAudioRef = useRef<HTMLVideoElement>(null)
  const [onCamera, setOnCamera] = useState<boolean>(false)
  const [onMicroPhone, setOnMicroPhone] = useState<boolean>(false)
  const [asSpearker, setAsSpearker] = useState<boolean>(false)
  const peerConnection = useRef<RTCPeerConnection | null>()
  const [textMessage, setTextMessage] = useState<string>()
  const textAreaMessageReceived = useRef<HTMLTextAreaElement>(null)
  const dataChannel = useRef<RTCDataChannel | null>()

  useEffect(() => {
    if (onCamera || onMicroPhone) {
      initUserMediaStream(videoRef)
      startUserMediaStream(videoRef)
    } else {
      initUserMediaStream(videoRef)
    }
  }, [onCamera, onMicroPhone])

  useEffect(() => {
    videoRef.current!.muted = (asSpearker) ? false : true
  }, [asSpearker])

  useEffect(() => {
    // 接続時の処理
    socket.on('connect', () => {
      console.log('Socket Event : connect')
    })

    socket.on('signaling', (objData: any) => {
      console.log('Socket Event : signaling')
      console.log('- type : ', objData.type)
      console.log('- data : ', objData.data)
      console.log('- socketid : ', objData.socketid)

      if ('offer' === objData.type) {
        if (peerConnection.current) {
          alert('Connection object already exists. on socket.on(\'signaling\')')
          return
        }

        // RTCPeerConnection オブジェクトの作成
        console.log('Call : createPeerConnection')
        const rtcPeerConnection = createPeerConnection(videoRef.current!.srcObject as MediaStream)

        // OfferSDPの設定
        console.log('Call : setOfferSDPandCreateAnswerSDP()')
        setOfferSDPandCreateAnswerSDP(rtcPeerConnection, objData.data)
      } else if (objData.type === 'answer') {
        if (!peerConnection.current) {
          alert('Connection object does not exists. on socket.on(\'signaling\')')
          return
        }

        // AnswerSDP の設定
        console.log(' Call : setAnswerSDP()')
        setAnswerSDP(peerConnection.current, objData.data)
      } else if (objData.type === 'candidate') {
        if (!peerConnection.current) {
          // コネクションオブジェクトがない
          alert('Connection object does not exist.')
          return
        }

        // ICE candidate の追加
        console.log('Call: addCandidate()')
        // 受信したICE candidate の追加
        addCandidate(peerConnection.current, objData.data)
      } else {
        console.error(' Unexpected : Socket Event : signaling')
      }
    })

  }, [])


  // 受信したICE candidate の追加
  const addCandidate = (rtcPeerConnection: RTCPeerConnection, candidate: RTCIceCandidate) => {
    console.log(' Call : rtcPeerConnection.addIceCandidate()')
    rtcPeerConnection.addIceCandidate(candidate)
      .catch((error) => {
        console.log('Error : ', error)
      })
  }

  const startUserMediaStream = async (videoRef: RefObject<HTMLVideoElement>) => {
    const mediaStream = await navigator.mediaDevices.getUserMedia({ video: onCamera, audio: onMicroPhone })
    setStreamToElement(videoRef, mediaStream)
  }

  const initUserMediaStream = (videoRef: RefObject<HTMLVideoElement>) => {
    const mediaStream = videoRef.current!.srcObject as MediaStream
    if (mediaStream) {
      // 古いトラッカーを停止させ初期化する処理 (HTML要素のstreamの解除だけではgetしたUserMediaは停止しない)
      if (mediaStream.getVideoTracks()[0]) mediaStream.getVideoTracks()[0].stop()
      if (mediaStream.getAudioTracks()[0]) mediaStream.getAudioTracks()[0].stop()
    }
    console.log(' Call : setStreamToElement(videoRef, null)')
    setStreamToElement(videoRef, null)
  }

  const setStreamToElement = (mediaRef: RefObject<HTMLVideoElement>, stream: MediaStream | null) => {
    mediaRef.current!.srcObject = stream

    if (!stream) return

    if (mediaRef.current!.tagName === 'VIDEO') {
      mediaRef.current!.volume = 0.0
      mediaRef.current!.muted = true
    } else if (mediaRef.current!.tagName === 'AUDIO') {
      mediaRef.current!.volume = 1.0
      mediaRef.current!.muted = false
    } else {
      console.error('Unexpected : Unknown ElementTagName : ', mediaRef.current!.tagName)
    }
  }

  const createPeerConnection = (mediaStream: MediaStream) => {
    const config = {
      'iceServers': [
        { "urls": "stun:stun.l.google.com:19302" },
        { "urls": "stun:stun1.l.google.com:19302" },
        { "urls": "stun:stun2.l.google.com:19302" },
      ]
    }

    // RTCPeerConnection オブジェクトの生成
    const rtcPeerConnection = new RTCPeerConnection(config)

    // RTCPeerConnection オブジェクトのイベントハンドラを登録
    setupRTCPeerConnectionEventHandler(rtcPeerConnection)

    // RTCPeerConnection オブジェクトのストリームにローカルのメディアストリームを追加
    if (mediaStream) {
      mediaStream.getTracks().map((track) => {
        rtcPeerConnection.addTrack(track, mediaStream)
      })
    } else {
      console.log('No local stram')
    }

    // refオブジェクトに格納
    peerConnection.current = rtcPeerConnection

    return rtcPeerConnection
  }

  const setupRTCPeerConnectionEventHandler =
    (
      rtcPeerConnection: RTCPeerConnection,
    ) => {
      // Negotiation needed イベントが発生したときのイベントハンドラの登録
      rtcPeerConnection.onconnectionstatechange = () => {
        console.log('Event : Negotiation needed')
      }

      // ICE candidate イベントが発生したときのイベントハンドラの登録
      rtcPeerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          // ICE candidate がある
          console.log('- ICE candidate : ', event.candidate)

          // ICE candidate をサーバを経由して相手に送信
          console.log('- Send ICE candidate server')
          socket.emit('signaling', { type: 'candidate', data: event.candidate })
        } else {
          console.log('- ICE candidate: empty')
        }
      }

      // ICE candidate error イベントが発生したときのイベントハンドラを登録
      // fix: ErrorCodeが受け取れない
      // see: https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnectionIceErrorEvent
      rtcPeerConnection.onicecandidateerror = () => {
        console.error('Event : ICE condidate error. error code : ')
      }

      // ICE gathering state change イベントが発生したときのイベントハンドラ
      rtcPeerConnection.onicegatheringstatechange = () => {
        console.log('Event : ICE gathering state change')
        console.log('- ICE gathering state: ', rtcPeerConnection.iceGatheringState)

        if (rtcPeerConnection.iceGatheringState === 'complete') {
          if (rtcPeerConnection.localDescription!.type === 'offer') {
            // Offer側のOfferSDP用のテキストエリアに貼付
            // textAreaOfferSideOfferSDPRef.current!.value = rtcPeerConnection.localDescription!.sdp
            // textAreaOfferSideOfferSDPRef.current!.focus()
            // textAreaOfferSideOfferSDPRef.current!.select()

            // OfferSDPをサーバに送信
            // console.log('- Send OfferSDP to the server')
            // socket.emit('signaling', { type: 'offer', data: rtcPeerConnection.localDescription })
          } else if (rtcPeerConnection.localDescription!.type === 'answer') {
            // Answer側のAnswerSDP用のテキストエリアに貼付
            // textAreaAnswerSideAnswerSDPRef.current!.value = rtcPeerConnection.localDescription!.sdp
            // textAreaAnswerSideAnswerSDPRef.current!.focus()
            // textAreaAnswerSideAnswerSDPRef.current!.select()

            // AnswerSDPをサーバに送信
            // console.log('Send AnswerSDP to the server')
            // socket.emit('signaling', { type: 'answer', data: rtcPeerConnection.localDescription })
          } else {
            console.error('Unexpected : Unknown loacalDesctiption.type. type = ', rtcPeerConnection.localDescription!.type)
          }
        }
      }

      // ICE connection state change イベントが発生したときのイベントハンドラを登録
      rtcPeerConnection.oniceconnectionstatechange = () => {
        console.log(' Event : ICE connection state chnage')
        console.log('- ICE connection state : ', rtcPeerConnection.iceConnectionState)
        // "disconnected" : コンポーネントがまだ接続されていることを確認するために、RTCPeerConnectionオブジェクトの少なくとも
        //                  1つのコンポーネントに対して失敗したことを確認します。これは、"failed "よりも厳しいテストではなく、
        //                  断続的に発生し、信頼性の低いネットワークや一時的な切断中に自然に解決することがあります。問題が
        //                  解決すると、接続は "接続済み "の状態に戻ることがあります。
        // "failed"       : ICE candidateは、すべての候補のペアを互いにチェックしたが、接続のすべてのコンポーネントに
        //                  互換性のあるものを見つけることができなかった。しかし、ICEエージェントがいくつかの
        //                  コンポーネントに対して互換性のある接続を見つけた可能性がある。
        // see : https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/iceConnectionState
      }

      // Signaling state change イベントが発生したときのイベントハンドラを登録
      rtcPeerConnection.onsignalingstatechange = () => {
        console.log(' Event : Signaling state change')
        console.log('- Signaling state : ', rtcPeerConnection.signalingState)
      }

      // Connection state change イベントが発生したときのイベントハンドラを登録
      rtcPeerConnection.onconnectionstatechange = () => {
        console.log(' Event : Connection state change')
        console.log('- Connection state : ', rtcPeerConnection.connectionState)
        // "disconnected" : 接続のためのICEトランスポートの少なくとも1つが「disconnected」状態であり、
        //                  他のトランスポートのどれも「failed」、「connecting」、「checking」の状態ではない。
        // "failed"       : 接続の1つ以上のICEトランスポートが「失敗」状態になっている。
        // see : https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/connectionState

        if (rtcPeerConnection.connectionState === 'failed') {
          // 「ビデオチャット相手との通信が切断」が「しばらく」続き、通信が復帰しないとき、Connection state「failed」となる。
          console.log(' Call : endPeerConnection( rtcPeerConnection )')
          endPeerConnection(rtcPeerConnection)
        }
      }

      // Track イベントが発生したときのイベントハンドラを登録
      rtcPeerConnection.ontrack = (event) => {
        console.log(' Event : Track')
        console.log('- stream', event.streams[0])
        console.log('- track', event.track)

        const stream = event.streams[0]
        const track = event.track
        if (track.kind === 'video') {
          console.log(' Call : setStreamToElement(remoteVideoRef, stream')
          setStreamToElement(remoteVideoRef, stream)
        } else if (track.kind === 'audio') {
          console.log(' Call : setStreamToElement(remoteAudioRef, stream')
          setStreamToElement(remoteAudioRef, stream)
        } else {
          console.error('Unexpected : Unknown track kind : ', track.kind)
        }
      }

      rtcPeerConnection.ondatachannel = (event) => {
        console.log(' Event : Data Channel')

        // DataChannel オブジェクトをグローバル変数に追加
        dataChannel.current = event.channel
        // DataChannel オブジェクトのイベントハンドラを登録
        console.log(' Call : setupDataChannelEventHundler()')
        setupDataChannelEventHundler()
      }
    }

  // OfferSDP の作成
  const createOfferSDP = (rtcPeerConnection: RTCPeerConnection) => {
    console.log('Call : rtcPeerConnection.createOffer()')
    rtcPeerConnection.createOffer()
      .then((sessionDescription) => {
        console.log('Call : rtcPeerConnection.setLocalDescription()')
        return rtcPeerConnection.setLocalDescription(sessionDescription)
      })
      .then(() => {
        // Vanilla ICE
        // Trickle ICE

        // 初期OfferSDPをサーバを経由して相手に送信
        console.log('- Send Offer SDP to server')
        socket.emit('signaling', { type: 'offer', data: rtcPeerConnection.localDescription })
      })
      .catch((error) => {
        console.error(' Error : ', error)
      })
  }

  // OfferSDPの設定とAnswerSDPの作成
  const setOfferSDPandCreateAnswerSDP =
    (rtcPeerConnection: RTCPeerConnection, sessionDescription: RTCSessionDescription) => {
      console.log('Call : rtcPeerConnection.setRemoteDescription()')
      rtcPeerConnection.setRemoteDescription(sessionDescription)
        .then(() => {
          // AnswerSDPの作成
          console.log('Call : rtcPeerConnection.createAnswer()')
          return rtcPeerConnection.createAnswer()
        })
        .then((sessionDescription) => {
          // 作成されたAnswerSDPをLocalDescriptionに設定
          console.log('Call : rtcPeerConnection.setLocalDesctiption()')
          return rtcPeerConnection.setLocalDescription(sessionDescription)
        })
        .then(() => {
          // Vanilla ICE 
          // Trickle ICE

          // 初期AnswerSDPをサーバを経由して相手に送信
          console.log('- Send AnswerSDP to server')
          socket.emit('signaling', { type: 'answer', data: rtcPeerConnection.localDescription })
        })
        .catch((error) => {
          console.error('Error : ', error)
        })

    }

  const setAnswerSDP =
    (
      rtcPeerConnection: RTCPeerConnection, sessionDescription: RTCSessionDescription
    ) => {
      console.log('Call : rtcPeerConnection.setRemoteDescription()')
      rtcPeerConnection.setRemoteDescription(sessionDescription)
        .catch((error) => {
          console.error('Error : ', error)
        })

    }

  const hundleSendOfferSDP = () => {
    console.log('UI Event : Send OfferSDP : Button clicked')

    if (peerConnection.current) {
      alert('Connection object already exists. on hundleSendOfferSDP()')
      return
    }

    // RTCPeerConnection オブジェクトの作成
    console.log('Call : createPeerConnection()')
    const rtcPeerConnection = createPeerConnection(videoRef.current!.srcObject as MediaStream)
    console.log(' - peerConnection after setPeerConnection : ', rtcPeerConnection)

    // DataChannel オブジェクトをグローバル変数に追加
    dataChannel.current = rtcPeerConnection.createDataChannel('my dataChannel')
    // DataChannelオブジェクトのイベントハンドラを登録
    console.log(' Call : setupDataChannelEventHundler()')
    setupDataChannelEventHundler()

    // OfferSDPの作成
    createOfferSDP(rtcPeerConnection)
  }

  const hundleSendMessage = () => {
    console.log(' UI Event : Send Message : button clicked')

    if (!peerConnection.current) {
      alert('Connection does not exist.')
      return
    }
    if (!dataChannel.current) {
      alert('DataChannel is not open.')
      return 
    }
    if (!textMessage) {
      alert('Message for send is empty. Please eneter the message for send.')
      return
    }

    // メッセージを DataChannel を通して相手に直接送信
    console.log('- Send Message through DataChannel')
    dataChannel.current.send( JSON.stringify({type: 'message', data: textMessage}) )

    // 送信メッセージをメッセージテキストエリアへ追加
    textAreaMessageReceived.current!.value = textMessage + textAreaMessageReceived.current!.value
  }

  const setupDataChannelEventHundler = () => {
    if (!dataChannel.current) {
      console.log('Unexpected : DataChannel does not exist.')
      return
    }

    // message イベントが発生したときのイベントハンドラを登録
    dataChannel.current.onmessage = (event) => {
      console.log('DataChannel Event : message')
      const objData = JSON.parse(event.data)
      console.log(' - type : ', objData.type)
      console.log(' - data : ', objData.data)

      if (objData.type === 'message') {
        // 受信メッセージをメッセージテキストエリアへ追加
        const strMessage = objData.data
        textAreaMessageReceived.current!.value = strMessage + textAreaMessageReceived.current!.value
      }
    }
  }

  const hundleLeaveChat = () => {
    console.log(' UI Event : Leave Chat : button clicked')

    if (peerConnection.current) {
      console.log(' Call : endPeerConnection() ')
      endPeerConnection(peerConnection.current)
    }
  }

  const endPeerConnection = (rtcPeerConnection: RTCPeerConnection) => {
    // リモート映像の停止
    console.log("Call : setStreamToElement(remoteVideoRef, null)");
    setStreamToElement(remoteVideoRef, null);
    // リモート音声の停止
    console.log("Call : setStreamToElement(remoteAudioRef, null)");
    setStreamToElement(remoteAudioRef, null);

    // DataChannel の終了
    if (dataChannel.current) {
      dataChannel.current.close()
      dataChannel.current = null
    }

    // グローバル変数のクリア
    peerConnection.current = null;

    // ピアコネクションの終了
    rtcPeerConnection.close();
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
      <div className='flex'>
        <video
          id="video_local" width="320" height="240"
          className=''
          style={{ border: "1px solid black" }}
          ref={videoRef}
          autoPlay
        >
        </video>
        <video
          id="video_remote" width="320" height="240"
          className=''
          style={{ border: "1px solid black" }}
          ref={remoteVideoRef}
          autoPlay
        >
        </video>
        <audio id="audio_remote" ref={remoteAudioRef} autoPlay></audio>
        <button
          className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
          onClick={() => { hundleSendOfferSDP() }}
        >
          Send OfferSDP
        </button>
      </div>
      <br />
      <button
        className='bg-blue-500 hover:bg-blue-700 text-white float-left font-bold py-2 px-4 rounded'
        onClick={() => { hundleLeaveChat() }}
      >
        Leave Chat
      </button>
      <br />
      <input
        className='
          shadow
          appearance-none
          border
          rounded
          w-full 
          py-2 
          px-3 
          text-gray-700 
          leading-tight 
          focus:outline-none 
          focus:shadow-outline
        '
        type="text"
        id="text_message_for_send"
        size={40}
        placeholder='Type messages'
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => { setTextMessage(event.target.value) }}
      />
      <input
        className='bg-blue-500 hover:bg-blue-700 text-white float-left font-bold py-2 px-4 rounded'
        type="button"
        value="Send message"
        onClick={hundleSendMessage}
      />
      <textarea
        id="textarea_message_received"
        className='
          form-control
          block
          w-full
          px-3
          py-1.5
          text-base
          font-normal
          text-gray-700
          bg-white bg-clip-padding
          border border-solid border-gray-300
          rounded
          transition
          ease-in-out
          m-0
          focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none
        '
        ref={textAreaMessageReceived}
        rows={10}
        cols={60}
        readOnly={true}>
      </textarea>

    </div>
  )
}

export default App
