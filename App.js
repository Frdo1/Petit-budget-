import { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, Share, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import APP_HTML from './web/appHtml';

// Toutes les données (produits, tickets, objectif) sont gardées sur le téléphone.
const STORAGE_KEY = 'pbs-data-v1';
const BG = '#3FA265';

export default function App() {
  const [saved, setSaved] = useState(null);
  const pageBg = '#F3F9F0';

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => setSaved(v || 'null'))
      .catch(() => setSaved('null'));
  }, []);

  const onMessage = useCallback(async (event) => {
    let msg;
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'save') {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(msg.data));
      } catch (e) {
        console.warn('Sauvegarde impossible', e);
      }
    } else if (msg.type === 'share' && typeof msg.text === 'string') {
      try {
        await Share.share({ message: msg.text });
      } catch (e) {
        console.warn('Partage impossible', e);
      }
    }
  }, []);

  if (saved === null) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: pageBg }]}>
        <ActivityIndicator color={BG} size="large" />
      </View>
    );
  }

  // Données lues sur le téléphone, injectées avant le chargement de la page.
  const injected = `window.__PBS_DATA__ = ${saved}; true;`;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.fill, { backgroundColor: pageBg }]} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <WebView
          style={[styles.fill, { backgroundColor: pageBg }]}
          originWhitelist={['*']}
          source={{ html: APP_HTML, baseUrl: 'https://petit-budget.local/' }}
          injectedJavaScriptBeforeContentLoaded={injected}
          onMessage={onMessage}
          domStorageEnabled
          javaScriptEnabled
          setSupportMultipleWindows={false}
          overScrollMode="never"
          textZoom={100}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
