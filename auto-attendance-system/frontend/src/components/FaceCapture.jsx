import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';

/**
 * Face Capture Component
 * Captures user's face photo using webcam for face recognition enrollment
 * Similar to mobile face lock registration
 */

const FaceCapture = ({ onFaceCaptured, onError, userId = null }) => {
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [captureStatus, setCaptureStatus] = useState('idle'); // idle, capturing, processing, success, error
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Start webcam
  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraReady(true);
        };
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      onError?.('Unable to access camera. Please grant camera permissions.');
    }
  }, [onError]);

  // Stop webcam
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setCameraReady(false);
    }
  }, [stream]);

  // Capture photo from webcam
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setCaptureStatus('capturing');
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setCaptureStatus('error');
        onError?.('Failed to capture image');
        return;
      }

      // Create image URL for preview
      const imageUrl = URL.createObjectURL(blob);
      setCapturedImage(imageUrl);
      
      // Stop camera after capture
      stopCamera();
      
      // Process the image with AI service
      await processImage(blob);
    }, 'image/jpeg', 0.95);
  }, [stopCamera, onError]);

  // Process captured image with AI service
  const processImage = async (imageBlob) => {
    setIsProcessing(true);
    setCaptureStatus('processing');

    try {
      const formData = new FormData();
      formData.append('file', imageBlob, 'face-capture.jpg');

      // Send to AI service's enroll-student endpoint for face validation
      const response = await axios.post(
        `${import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000'}/enroll-student`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Check if enrollment was successful
      if (!response.data.success) {
        setCaptureStatus('error');
        setFaceDetected(false);
        onError?.(response.data.message || 'Face enrollment failed. Please try again.');
        return;
      }

      // Face detected and enrolled successfully
      setFaceDetected(true);
      setCaptureStatus('success');

      // Pass face data to parent component
      onFaceCaptured({
        faceEmbedding: response.data.faceEmbedding,
        faceLocation: response.data.faceLocation,
        capturedImage: capturedImage,
        timestamp: new Date().toISOString(),
        quality: response.data.quality,
        message: response.data.message
      });

    } catch (error) {
      console.error('Error processing face image:', error);
      setCaptureStatus('error');
      setFaceDetected(false);
      
      // Handle specific error messages from AI service
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message ||
                          'Failed to process face image. Please try again.';
      
      onError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Retake photo
  const retake = () => {
    setCapturedImage(null);
    setFaceDetected(false);
    setCaptureStatus('idle');
    startCamera();
  };

  // Cleanup on unmount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (capturedImage) {
        URL.revokeObjectURL(capturedImage);
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Camera View or Captured Image */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
        {!capturedImage ? (
          <>
            {/* Live Camera Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Camera Overlay - Face Guide */}
            {cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-4 border-blue-500 rounded-full w-64 h-80 opacity-50"></div>
              </div>
            )}
            
            {/* Camera Status */}
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p>Starting camera...</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Captured Image Preview */}
            <img
              src={capturedImage}
              alt="Captured face"
              className="w-full h-full object-cover"
            />
            
            {/* Processing Overlay */}
            {isProcessing && (
              <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p>Analyzing face...</p>
                </div>
              </div>
            )}
            
            {/* Success Indicator */}
            {captureStatus === 'success' && !isProcessing && (
              <div className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-full flex items-center">
                <span className="mr-2">✓</span>
                Face detected successfully
              </div>
            )}
          </>
        )}
        
        {/* Hidden canvas for image capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">📸 Face Registration Instructions:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Position your face within the oval guide</li>
          <li>• Ensure good lighting and remove glasses if possible</li>
          <li>• Look directly at the camera with a neutral expression</li>
          <li>• Make sure only your face is visible in the frame</li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {!capturedImage ? (
          <button
            type="button"
            onClick={capturePhoto}
            disabled={!cameraReady || isProcessing}
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center"
          >
            <span className="mr-2">📷</span>
            Capture Face
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={retake}
              disabled={isProcessing}
              className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              🔄 Retake
            </button>
            {captureStatus === 'success' && (
              <button
                type="button"
                onClick={() => {}}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-medium cursor-default"
              >
                ✓ Face Registered
              </button>
            )}
          </>
        )}
      </div>

      {/* Status Messages */}
      {captureStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">
            ⚠️ Please retake the photo following the instructions above.
          </p>
        </div>
      )}
    </div>
  );
};

export default FaceCapture;
