import type { NextPage } from "next";
import { useCallback, useEffect } from "react";
import { useAppMachine } from "../src/app-machine.hook";
import { useAppChannel } from "../src/app.hook";
import { useWakeLock } from "../src/hooks/wake-lock.hook";
import styles from "../styles/app.module.css";

const Index: NextPage<{ code: string }> = ({ code }) => {
  const { context, Component, send, stepAsString } = useAppMachine(code);

  useWakeLock();

  const { channel, isSubscribed, players } = useAppChannel({
    context,
    send,
  });

  const beforeUnloadListener = useCallback((event: BeforeUnloadEvent) => {
    if (stepAsString.includes("game")) {
      return (event.returnValue = true);
    }
  }, [stepAsString]);

  useEffect(() => {
    addEventListener("beforeunload", beforeUnloadListener);

    return () => {
      removeEventListener("beforeunload", beforeUnloadListener);
    };
  }, [beforeUnloadListener]);

  return (
    <div className={styles.container}>
      <p className={styles.creditBanner}>
        MODIFIED VERSION 0.1.7 BY YUVRAJ | CREED INC.
      </p>
      {Component && (
        <Component
          channel={channel}
          context={context}
          isSubscribed={isSubscribed}
          players={players}
          send={send}
        />
      )}
    </div>
  );
};

Index.getInitialProps = async (context): Promise<{ code: string }> => {
  return {
    code: (context.query?.code ?? "") as string,
  };
};

export default Index;
