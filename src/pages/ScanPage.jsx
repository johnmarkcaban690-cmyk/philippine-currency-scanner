import { useEffect, useRef, useState } from 'react'
import { detectCurrency } from '../services/currencyDetector'

function ScanPage() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraSupported, setCameraSupported] = useState(true)
  const [cameraError, setCameraError] = useState('')
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [result, setResult] = useState(() => detectCurrency(''))
  const [capturedPreview, setCapturedPreview] = useState('')

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsCameraActive(false)
  }

  const startCamera = async () => {
    if (!window.isSecureContext) {
      setCameraSupported(false)
      setCameraError(
        'The app is not running in a secure context. Use HTTPS or install the app to enable camera access.',
      )
      setIsCameraActive(false)
      return
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraSupported(false)
      setCameraError('This browser does not support camera access.')
      setIsCameraActive(false)
      return
    }

    try {
      setCameraError('')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraSupported(true)
      setIsCameraActive(true)
    } catch (error) {
      setCameraSupported(false)

      const errorName = error?.name || ''
      if (errorName === 'NotAllowedError') {
        setCameraError(
          'Camera permission denied. Please allow camera access and retry. If another app is using the camera, close it and try again.',
        )
      } else if (errorName === 'NotReadableError') {
        setCameraError('Another application is using the camera. Please close it and retry.')
      } else if (errorName === 'SecurityError') {
        setCameraError('The app is not running in a secure context. Use HTTPS to access the camera.')
      } else {
        setCameraError(
          'Camera access failed. Check permission, browser support, secure context, or whether another app is using the camera.',
        )
      }

      setIsCameraActive(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void startCamera()
    }, 0)

    return () => {
      window.clearTimeout(timer)
      stopCamera()
    }
  }, [])

  const handleCapture = () => {
    if (!videoRef.current) {
      return
    }

    const video = videoRef.current
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720

    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.92)
    setCapturedPreview(imageDataUrl)
    setResult(detectCurrency(imageDataUrl))
  }

  return (
    <div className="page-panel scan-page">
      <div className="page-header center-header">
        <div>
          <p className="eyebrow">Real-time detection</p>
          <h1>Scan</h1>
        </div>
      </div>

      {cameraSupported && !cameraError ? (
        <div className="camera-shell">
          <video ref={videoRef} autoPlay playsInline muted className="camera-preview" />
          {capturedPreview && (
            <img src={capturedPreview} alt="Captured currency frame" className="captured-preview" />
          )}
        </div>
      ) : (
        <div className="empty-panel scanner-warning">
          <p className="empty-state large-empty">
            {cameraError || 'No camera support detected on this browser.'}
          </p>
          {cameraError && (
            <button type="button" className="primary-button retry-button" onClick={() => void startCamera()}>
              Retry Camera
            </button>
          )}
        </div>
      )}

      <div className="scan-actions">
        <button type="button" className="primary-button" onClick={handleCapture} disabled={!isCameraActive}>
          Capture
        </button>
        <button type="button" className="secondary-button" onClick={stopCamera}>
          Back / Stop Camera
        </button>
      </div>

      <div className="result-panel">
        <h3>{result.detected ? 'Currency Detected' : 'No Currency Detected'}</h3>
        <p>{result.detected ? 'Currency identified successfully.' : 'AI model not installed yet.'}</p>
        <p>Model: {result.model}</p>
        <p>Status: {result.status === 'Model not installed' ? 'Model Not Installed' : result.status}</p>
      </div>

      <div className="pipeline-panel">
        <h3>Future HOG-SVM Pipeline</h3>
        <ul>
          {['Camera', 'Capture Image', 'Preprocessing', 'Currency/Object Localization', 'Crop Currency', 'Resize', 'Grayscale', 'HOG Feature Extraction', 'SVM Classification', 'Denomination Detection', 'Currency Counting', 'Total Value Calculation'].map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default ScanPage
