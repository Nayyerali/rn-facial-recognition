import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import FacialRecognition from './src/components/FacialRecognition';
import { Button, Text, TextInput, View } from 'react-native';

function App() {
  const [showModal, setShowModal] = useState(false);
  const [userId, setUserId] = useState('');
  const [type, setType] = useState('');

  return (
    <SafeAreaProvider
      style={{
        flex: 1,
        backgroundColor: 'white',
        marginTop: 50,
      }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'white',
          marginTop: 20,
          padding: 20,
          gap: 20,
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'center' }}>
          Facial Recognition App
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <Button
            title="Register"
            onPress={() => {
              setType('register');
            }}
          />
          <Button
            title="Validate"
            onPress={() => {
              setType('login');
            }}
          />
        </View>
        <Text style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'center' }}>
          Selected Type: {type.toUpperCase()}
        </Text>
        <TextInput
          value={userId}
          onChangeText={setUserId}
          placeholder="Enter User Id"
          placeholderTextColor={'gray'}
          style={{ borderWidth: 1, marginVertical: 10, padding: 10 }}
        />
        <Button
          title="Continue"
          onPress={() => setShowModal(true)}
          disabled={userId.length === 0 || type.length === 0}
        />
      </View>
      <FacialRecognition
        isVisible={showModal}
        onModalClose={() => setShowModal(false)}
        type={type}
        userId={userId}
      />
    </SafeAreaProvider>
  );
}

export default App;
