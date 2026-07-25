import { useEffect, useRef } from "react";

import * as Notifications from "expo-notifications";

import { router, useRootNavigationState } from "expo-router";

import { useAuthStore } from "../stores/auth.store";

import { notificationsService } from "../services/notifications.service";

import { useNotificationsStore } from "../stores/notifications.store";

interface PushNotificationData {
  notificationId?: unknown;
  type?: unknown;
  caseId?: unknown;
  sessionId?: unknown;
  invitationId?: unknown;
  documentId?: unknown;
}

function getStringValue(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return value.trim();
}

export function usePushNotificationNavigation() {
  const rootNavigationState = useRootNavigationState();

  const lastResponse = Notifications.useLastNotificationResponse();

  const isInitializing = useAuthStore((state) => state.isInitializing);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const user = useAuthStore((state) => state.user);

  /*
   * Evita abrir dos veces la misma notificación
   * cuando el listener y useLastNotificationResponse
   * reciben la misma respuesta.
   */
  const handledResponseId = useRef<string | null>(null);

  useEffect(() => {
    if (
      !rootNavigationState?.key ||
      isInitializing ||
      !isAuthenticated ||
      !user ||
      !lastResponse
    ) {
      return;
    }

    const notification = lastResponse.notification;

    const responseId = notification.request.identifier;

    if (handledResponseId.current === responseId) {
      return;
    }

    handledResponseId.current = responseId;

    const data = notification.request.content.data as PushNotificationData;

    console.log("Datos recibidos desde la push:", data);

    const notificationId = getStringValue(data.notificationId);

    const type = getStringValue(data.type);

    const caseId = getStringValue(data.caseId);

    const invitationId = getStringValue(data.invitationId);

    const documentId = getStringValue(data.documentId);

    /*
     * Marcamos la notificación interna como leída,
     * pero no bloqueamos la navegación.
     */
    if (notificationId) {
      void notificationsService
        .markAsRead(notificationId)
        .then((updatedNotification) => {
          useNotificationsStore
            .getState()
            .updateNotification(updatedNotification);
        })
        .catch((error) => {
          console.log(
            "No fue posible marcar la notificación como leída:",
            error,
          );
        });
    }

    /*
     * Esperamos un ciclo para que Stack.Protected
     * termine de montar el grupo del usuario.
     */
    const clearNotificationResponse = () => {
      setTimeout(() => {
        void Notifications.clearLastNotificationResponseAsync().catch(
          (error: unknown) => {
            console.log(
              "No fue posible limpiar la respuesta de la push:",
              error,
            );
          },
        );
      }, 500);
    };

    const navigationTimer = setTimeout(() => {
      console.log("Intentando navegar desde push:", {
        role: user.role,
        type,
        caseId,
        documentId,
        invitationId,
      });

      if (type === "INVITATION_CREATED" && user.role === "CLIENT") {
        router.replace("/(client)/invitations");
        clearNotificationResponse();
        return;
      }

      if (user.role === "MEDIATOR") {
        if (
          documentId &&
          (type === "DOCUMENT_CREATED" || type === "DOCUMENT_VERSION_CREATED")
        ) {
          console.log("Redirigiendo al documento del mediador:", documentId);

          router.replace({
            pathname: "/(mediator)/cases/documents/[documentId]",
            params: {
              documentId,
            },
          });

          clearNotificationResponse();
          return;
        }

        if (caseId) {
          console.log("Redirigiendo al caso del mediador:", caseId);

          router.replace({
            pathname: "/(mediator)/cases/[id]",
            params: {
              id: caseId,
            },
          });

          clearNotificationResponse();
          return;
        }

        router.replace("/(mediator)/notifications");
        clearNotificationResponse();
        return;
      }

      if (user.role === "CLIENT") {
        if (
          documentId &&
          (type === "DOCUMENT_CREATED" || type === "DOCUMENT_VERSION_CREATED")
        ) {
          console.log("Redirigiendo al documento del cliente:", documentId);

          router.replace({
            pathname: "/(client)/cases/documents/[documentId]",
            params: {
              documentId,
            },
          });

          clearNotificationResponse();
          return;
        }

        if (caseId) {
          console.log("Redirigiendo al caso del cliente:", caseId);

          router.replace({
            pathname: "/(client)/cases/[id]",
            params: {
              id: caseId,
            },
          });

          clearNotificationResponse();
          return;
        }

        router.replace("/(client)/notifications");
        clearNotificationResponse();
        return;
      }

      if (user.role === "ADMIN") {
        router.replace("/(admin)");
        clearNotificationResponse();
      }
    }, 700);

    return () => {
      clearTimeout(navigationTimer);
    };
  }, [
    rootNavigationState?.key,
    isInitializing,
    isAuthenticated,
    user?.id,
    user?.role,
    lastResponse,
  ]);
}
