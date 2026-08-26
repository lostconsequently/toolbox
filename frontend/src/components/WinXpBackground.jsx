import { useTheme } from "../context/ThemeContext";

export default function WinXpBackground() {
  const { theme } = useTheme();

  if (theme !== "winxp") return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "-5%",
          filter: "blur(14px)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, #2f6fc2 0%, #6fa8dd 38%, #bcdcf2 62%, #d9ecf6 78%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: "-10%",
            left: "8%",
            width: "45%",
            height: "45%",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 70%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: "-15%",
            right: "-15%",
            bottom: "-30%",
            height: "55%",
            borderRadius: "50%",
            background:
              "linear-gradient(180deg, #7fc94f 0%, #4fa63a 55%, #327a29 100%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: "-20%",
            right: "-5%",
            bottom: "-42%",
            height: "45%",
            borderRadius: "50%",
            background: "linear-gradient(180deg, #5fae3f 0%, #2f7a2c 100%)",
            opacity: 0.85,
          }}
        />
      </div>
    </div>
  );
}
