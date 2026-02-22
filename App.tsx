import { SafeAreaProvider } from 'react-native-safe-area-context';
import FacialRecognition from './src/components/FacialRecognition';

function App() {
  return (
    <SafeAreaProvider>
      <FacialRecognition isVisible={true} />
    </SafeAreaProvider>
  );
}

export default App;
