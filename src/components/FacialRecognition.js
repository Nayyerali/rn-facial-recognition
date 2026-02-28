import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  BackHandler,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  Text,
  Button,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import {
  Face,
  useFaceDetector,
} from 'react-native-vision-camera-face-detector';
import Modal from 'react-native-modal';
import Slider from '@react-native-community/slider';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Worklets } from 'react-native-worklets-core';
import axios from 'axios';

// Request storage permission
export async function requestStoragePermission() {
  if (Platform.OS === 'android') {
    if (Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  }
  return true;
}

const FacialRecognition = props => {
  const cameraRef = useRef(null);
  const { callback, isVisible, type, userId } = props;

  const [cameraPosition, setCameraPosition] = useState('front');
  const [zoom, setZoom] = useState(0);
  const [photoPath, setPhotoPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [facesData, setFacesData] = useState([]);

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice(cameraPosition);

  const { detectFaces } = useFaceDetector({ performanceMode: 'fast' });

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission]);

  useEffect(() => {
    if (device) {
      setZoom(
        device.neutralZoom ??
          Math.min(Math.max(1, device.minZoom), device.maxZoom),
      );
    }
  }, [device]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        callback(); // close modal
        return true;
      },
    );
    return () => backHandler.remove();
  }, []);

  // JS callback for face detection results
  const handleFaceDetected = Worklets.createRunOnJS(faces => {
    setFaceDetected(faces && faces.length > 0);
    setFacesData(faces);
  });

  // Frame processor
  const frameProcessor = useFrameProcessor(
    frame => {
      'worklet';
      try {
        const faces = detectFaces(frame);
        handleFaceDetected(faces);
      } catch (e) {}
    },
    [detectFaces],
  );

  const takePhoto = async () => {
    try {
      if (!cameraRef.current) return;
      if (!(await requestStoragePermission())) {
        Alert.alert('Permission Denied', 'Cannot save to gallery');
        return;
      }

      const photo = await cameraRef.current.takePhoto({ flash: 'off' });
      setPhotoPath(`file://${photo.path}`);
    } catch (err) {
      Alert.alert('Error', 'Failed to take photo.');
      console.warn(err);
    }
  };

  const retakePhoto = () => {
    setPhotoPath('');
    setFaceDetected(false);
    setFacesData([]);
    setZoom(device?.neutralZoom ?? 0);
  };

  const confirmPhoto = () => {
    if (!photoPath) return Alert.alert('Error', 'No photo captured');

    const finalPhoto = {
      image: photoPath,
      name: photoPath.split('/').pop(),
      type: 'image/jpeg',
    };

    if (type === 'register') {
      handleRegisterFace(finalPhoto);
    } else {
      handleValidateFace(finalPhoto);
    }
  };

  const API_URL = 'https://stag-clickgateway.lmkr.com/facial';

  const handleRegisterFace = async finalPhoto => {
    const formData = new FormData();
    formData.append('date', new Date().toLocaleDateString());
    formData.append('userId', userId); // Unique ID based on timestamp
    formData.append('image', {
      uri: finalPhoto.image,
      type: finalPhoto.type,
      name: finalPhoto.name,
    });

    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/signup`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('Sign Up Response: ', response.data);

      Alert.alert(
        'Signup',
        response.data.message || 'Face registered successfully',
      );
    } catch (err) {
      console.log('Sign Up Error: ', err.response?.data || err.message);
      Alert.alert(
        'Error',
        err?.response?.data?.message ||
          err.message ||
          'Face registration failed',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleValidateFace = async finalPhoto => {
    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('image', {
      uri: finalPhoto.image,
      type: finalPhoto.type,
      name: finalPhoto.name,
    });

    try {
      setLoading(true);
      console.log('Called');

      const response = await axios.post(`${API_URL}/login`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('Sign In Response: ', response.data);

      Alert.alert(
        'Login',
        response.data.message || 'Face matched successfully',
      );
    } catch (err) {
      console.log('Sign In Error: ', err.response?.data || err.message);
      Alert.alert(
        'Error',
        err?.response?.data?.message || err.message || 'Face validation failed',
      );
    } finally {
      setLoading(false);
    }
  };

  const getFaceStatus = () => {
    const bgColor =
      facesData && facesData.length === 1
        ? 'rgba(0,255,0,0.6)'
        : 'rgba(255,0,0,0.6)';
    return (
      <View
        style={{
          position: 'absolute',
          top: 10,
          width: '100%',
          alignItems: 'center',
          zIndex: 10,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: 'white',
            backgroundColor: bgColor,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
          }}
        >
          {facesData && facesData.length === 1
            ? 'Face Detected'
            : facesData && facesData.length > 1
            ? 'Multiple Faces Detected'
            : 'Face Not Detected'}
        </Text>
      </View>
    );
  };

  return (
    <Modal
      isVisible={isVisible}
      backdropTransitionOutTiming={0}
      animationIn="slideInUp"
      style={styles.modal}
    >
      <View style={styles.container}>
        {loading && (
          <View style={styles.loadingCont}>
            <ActivityIndicator color="maroon" size="large" />
          </View>
        )}
        <Text style={styles.heading}>
          {type === 'register' ? 'Register Yourself' : 'Validate Yourself'}
        </Text>
        <Text style={styles.desc}>
          Make sure your face is straight and not wearing glasses
        </Text>
        {!device || !hasPermission ? (
          <Text style={{ color: 'black', textAlign: 'center' }}>
            Loading Camera...
          </Text>
        ) : photoPath ? (
          <View style={styles.flex}>
            <Image
              source={{ uri: photoPath }}
              style={styles.previewImage}
              resizeMode="contain"
            />
            <View style={styles.previewControlsContainer}>
              <TouchableOpacity
                style={[styles.previewBtn, { backgroundColor: 'red' }]}
                onPress={retakePhoto}
              >
                <Text style={styles.buttonText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.previewBtn, { backgroundColor: 'green' }]}
                onPress={confirmPhoto}
              >
                <Text style={styles.buttonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.flex}>
            <Camera
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={true}
              photo={true}
              zoom={zoom}
              frameProcessor={frameProcessor}
              frameProcessorFps={5}
            />

            {getFaceStatus()}

            <TouchableOpacity
              onPress={takePhoto}
              style={[
                styles.captureRing,
                !facesData || facesData.length !== 1
                  ? { borderColor: 'gray' }
                  : {},
              ]}
              disabled={!facesData || facesData.length !== 1}
            />
            <TouchableOpacity
              style={styles.switchButton}
              onPress={() =>
                setCameraPosition(prev => (prev === 'back' ? 'front' : 'back'))
              }
            >
              <MaterialIcons name="flip-camera-ios" size={28} color="#000" />
            </TouchableOpacity>
            <View style={styles.zoomSliderWrapper}>
              <TouchableOpacity
                onPress={() => setZoom(z => Math.max(device.minZoom, z - 1))}
              >
                <MaterialIcons name="zoom-out" size={28} color="white" />
              </TouchableOpacity>
              <Slider
                style={styles.zoomSlider}
                minimumValue={device.minZoom}
                maximumValue={device.maxZoom}
                step={0.1}
                value={Math.min(Math.max(zoom, device.minZoom), device.maxZoom)}
                onValueChange={setZoom}
                minimumTrackTintColor="#0000"
                maximumTrackTintColor="#FFFFFF"
              />
              <TouchableOpacity
                onPress={() => setZoom(z => Math.min(device.maxZoom, z + 1))}
              >
                <MaterialIcons name="zoom-in" size={28} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
      <Button title="Close" onPress={() => props.onModalClose()} />
    </Modal>
  );
};

export default FacialRecognition;

const styles = StyleSheet.create({
  modal: { backgroundColor: 'white', margin: 0 },
  container: { flex: 1, padding: 16 },
  flex: { flex: 1 },
  heading: {
    color: 'darkGray',
    textAlign: 'center',
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
  },
  desc: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: 'gray',
    textAlign: 'center',
    marginBottom: 8,
  },
  captureRing: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 8,
    borderColor: 'white',
    backgroundColor: 'transparent',
  },
  switchButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 50,
  },
  zoomSliderWrapper: {
    position: 'absolute',
    bottom: 110,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
  },
  zoomSlider: { flex: 1, height: 40, marginHorizontal: 10 },
  previewImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'black',
  },
  previewControlsContainer: { flexDirection: 'row', gap: 12, marginTop: 12 },
  previewBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { color: 'white', fontFamily: 'Poppins-SemiBold' },
  loadingCont: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: 0,
    left: 0,
    bottom: 0,
    top: 0,
    zIndex: 999,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
});
