import Headquarters from "@/headquarters/Headquarters";

export default function PreviewHeadquarters() {
  return (
    <div>
      <p
        style={{
          margin: 0,
          padding: "8px 16px",
          background: "#1a1408",
          color: "#e8c56b",
          fontSize: 12,
          letterSpacing: ".12em",
          textAlign: "center",
        }}
      >
        PREVIEW · ROOMS LOCKED · NO OWNER SESSION · LIVE /command STAYS GATED
      </p>
      <Headquarters />
    </div>
  );
}
