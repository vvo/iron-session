import type { IronSession } from ".";

export default function getPropertyDescriptorForReqSession(
  session: IronSession,
): PropertyDescriptor {
  return {
    enumerable: true,
    get() {
      return session;
    },
    set(value) {
      const keys = Object.keys(value);
      const currentKeys = Object.keys(session);

      currentKeys.forEach((key) => {
        if (!keys.includes(key)) {
          // @ts-ignore See comment in IronSessionData interface
          delete session[key];
        }
      });

      keys.forEach((key) => {
        // @ts-ignore See comment in IronSessionData interface
        session[key] = value[key];
      });
    },
  };
}
