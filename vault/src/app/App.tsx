import React from 'react';
import MainScreen from './MainScreen';
import {SafeAreaProvider} from 'react-native-safe-area-context';

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <MainScreen></MainScreen>
    </SafeAreaProvider>
  );
}

export default App;
