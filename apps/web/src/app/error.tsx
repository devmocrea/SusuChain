"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the uncaught error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Something went wrong!</h2>
        <p style={styles.message}>
          An unexpected error occurred. The incident has been automatically logged and reported to our monitoring team.
        </p>
        <div style={styles.btnGroup}>
          <button style={styles.primaryBtn} onClick={() => reset()}>
            Try Again
          </button>
          <button
            style={styles.secondaryBtn}
            onClick={() => (window.location.href = "/")}
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "80vh",
    backgroundColor: "#0a0a0a",
    color: "#fff",
    fontFamily: "system-ui, sans-serif",
    padding: "20px",
  },
  card: {
    backgroundColor: "#111",
    border: "1px solid #222",
    borderRadius: "12px",
    padding: "32px",
    maxWidth: "480px",
    width: "100%",
    textAlign: "center" as const,
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
  },
  title: {
    fontSize: "24px",
    fontWeight: 700,
    marginBottom: "16px",
    color: "#ff4d4d",
  },
  message: {
    fontSize: "15px",
    color: "#9ca3af",
    lineHeight: "1.6",
    marginBottom: "28px",
  },
  btnGroup: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
  },
  primaryBtn: {
    backgroundColor: "#fff",
    color: "#0a0a0a",
    border: "none",
    borderRadius: "8px",
    padding: "12px 24px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  secondaryBtn: {
    backgroundColor: "transparent",
    color: "#9ca3af",
    border: "1px solid #333",
    borderRadius: "8px",
    padding: "12px 24px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  },
};
