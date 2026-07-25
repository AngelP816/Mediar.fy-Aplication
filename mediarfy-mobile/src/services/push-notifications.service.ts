import {
  Platform,
} from 'react-native';

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

import { api } from './api.service';

interface RegisterPushTokenResponse {
  id: string;
  token: string;
  platform: string;
  isActive: boolean;
}

let currentExpoPushToken: string | null = null;

function getExpoProjectId(): string {
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    throw new Error(
      'No se encontró extra.eas.projectId',
    );
  }

  return projectId;
}

export async function obtainExpoPushToken():
Promise<string | null> {
  if (!Device.isDevice) {
    console.log(
      'Las notificaciones push requieren un dispositivo físico',
    );

    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(
      'default',
      {
        name: 'Notificaciones generales',
        importance:
          Notifications.AndroidImportance.HIGH,
        vibrationPattern: [
          0,
          250,
          250,
          250,
        ],
        lightColor: '#1A365D',
      },
    );
  }

  const permission =
    await Notifications.getPermissionsAsync();

  let finalStatus =
    permission.status;

  if (finalStatus !== 'granted') {
    const requestedPermission =
      await Notifications.requestPermissionsAsync();

    finalStatus =
      requestedPermission.status;
  }

  if (finalStatus !== 'granted') {
    console.log(
      'El usuario no concedió permiso de notificaciones',
    );

    return null;
  }

  const projectId =
    getExpoProjectId();

  const response =
    await Notifications.getExpoPushTokenAsync({
      projectId,
    });

  return response.data;
}

export async function registerCurrentDevicePushToken():
Promise<string | null> {
  const token =
    await obtainExpoPushToken();

  if (!token) {
    return null;
  }

  await api.post<RegisterPushTokenResponse>(
    '/push-tokens/register',
    {
      token,
      platform: Platform.OS,
    },
  );

  currentExpoPushToken = token;

  console.log(
    'Token push registrado correctamente',
  );

  return token;
}

export async function unregisterPushToken(
  token: string,
): Promise<void> {
  await api.delete(
    '/push-tokens/unregister',
    {
      data: {
        token,
      },
    },
  );
}

export async function unregisterCurrentDevicePushToken():
Promise<void> {
  let token =
    currentExpoPushToken;

  /*
   * La variable se pierde cuando la aplicación
   * se cierra. En ese caso recuperamos nuevamente
   * el token correspondiente al dispositivo.
   */
  if (!token) {
    try {
      token =
        await obtainExpoPushToken();
    } catch (error) {
      console.log(
        'No fue posible obtener el token push actual:',
        error,
      );

      return;
    }
  }

  if (!token) {
    console.log(
      'No existe un token push para desregistrar',
    );

    return;
  }

  await unregisterPushToken(token);

  currentExpoPushToken = null;

  console.log(
    'Token push desregistrado correctamente',
  );
}