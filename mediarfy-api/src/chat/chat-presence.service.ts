import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatPresenceService {
  /*
   * conversationId
   *   → userId
   *       → socketIds
   */
  private readonly conversationUsers =
    new Map<
      string,
      Map<string, Set<string>>
    >();

  /*
   * Permite retirar rápidamente un socket
   * cuando se desconecta inesperadamente.
   */
  private readonly socketMemberships =
    new Map<
      string,
      Set<string>
    >();

  joinConversation(
    socketId: string,
    userId: string,
    conversationId: string,
  ): void {
    let users =
      this.conversationUsers.get(
        conversationId,
      );

    if (!users) {
      users = new Map();
      this.conversationUsers.set(
        conversationId,
        users,
      );
    }

    let userSockets =
      users.get(userId);

    if (!userSockets) {
      userSockets = new Set();
      users.set(
        userId,
        userSockets,
      );
    }

    userSockets.add(socketId);

    let memberships =
      this.socketMemberships.get(socketId);

    if (!memberships) {
      memberships = new Set();
      this.socketMemberships.set(
        socketId,
        memberships,
      );
    }

    memberships.add(
      this.createMembershipKey(
        conversationId,
        userId,
      ),
    );
  }

  leaveConversation(
    socketId: string,
    userId: string,
    conversationId: string,
  ): void {
    const users =
      this.conversationUsers.get(
        conversationId,
      );

    const userSockets =
      users?.get(userId);

    userSockets?.delete(socketId);

    if (
      userSockets &&
      userSockets.size === 0
    ) {
      users?.delete(userId);
    }

    if (
      users &&
      users.size === 0
    ) {
      this.conversationUsers.delete(
        conversationId,
      );
    }

    const memberships =
      this.socketMemberships.get(socketId);

    memberships?.delete(
      this.createMembershipKey(
        conversationId,
        userId,
      ),
    );

    if (
      memberships &&
      memberships.size === 0
    ) {
      this.socketMemberships.delete(
        socketId,
      );
    }
  }

  removeSocket(
    socketId: string,
  ): void {
    const memberships =
      this.socketMemberships.get(socketId);

    if (!memberships) {
      return;
    }

    for (
      const membership
      of memberships
    ) {
      const separatorIndex =
        membership.indexOf('::');

      if (separatorIndex < 0) {
        continue;
      }

      const conversationId =
        membership.slice(
          0,
          separatorIndex,
        );

      const userId =
        membership.slice(
          separatorIndex + 2,
        );

      const users =
        this.conversationUsers.get(
          conversationId,
        );

      const userSockets =
        users?.get(userId);

      userSockets?.delete(socketId);

      if (
        userSockets &&
        userSockets.size === 0
      ) {
        users?.delete(userId);
      }

      if (
        users &&
        users.size === 0
      ) {
        this.conversationUsers.delete(
          conversationId,
        );
      }
    }

    this.socketMemberships.delete(
      socketId,
    );
  }

  isUserViewingConversation(
    userId: string,
    conversationId: string,
  ): boolean {
    const userSockets =
      this.conversationUsers
        .get(conversationId)
        ?.get(userId);

    return Boolean(
      userSockets &&
      userSockets.size > 0,
    );
  }

  private createMembershipKey(
    conversationId: string,
    userId: string,
  ): string {
    return `${conversationId}::${userId}`;
  }
}