"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function ShieldShape() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.18;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <icosahedronGeometry args={[1.35, 0]} />
        <meshBasicMaterial color="#0ea5e9" wireframe transparent opacity={0.5} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <octahedronGeometry args={[0.82, 0]} />
        <meshBasicMaterial color="#2563eb" transparent opacity={0.82} />
      </mesh>
    </group>
  );
}

export function ShieldCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.15, rootMargin: "80px" },
    );
    observer.observe(el);
    const onVis = () => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div ref={hostRef} className="h-full w-full">
      {visible ? (
        <Canvas
          dpr={[1, 1.15]}
          frameloop={tabVisible ? "always" : "never"}
          camera={{ position: [0, 0, 4.4], fov: 45 }}
          gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
          style={{ background: "transparent" }}
        >
          <ambientLight intensity={0.7} />
          <ShieldShape />
        </Canvas>
      ) : (
        <div className="flex h-full items-center justify-center">
          <div className="h-40 w-40 rounded-full border border-cyan-300/30 bg-gradient-to-br from-sky-400/20 to-blue-600/20" />
        </div>
      )}
    </div>
  );
}
