// CORREÇÃO C11: o guia sugere testar o tempo real com o celular + uma aba do
// navegador (npx expo start --web), mas no web o Alert.alert com botões não
// faz nada: apagar mensagem, sair da sala e sair da conta ficavam mudos.
// Este helper usa o Alert no celular e o window.confirm no navegador.
import { Alert, Platform } from 'react-native';

export function confirmAction(
  title: string,
  message: string,
  confirmText: string,
  onConfirm: () => void,
) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: confirmText, style: 'destructive', onPress: onConfirm },
  ]);
}

export function showMessage(title: string, message: string) {
  if (Platform.OS === 'web') {
    globalThis.alert?.(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
