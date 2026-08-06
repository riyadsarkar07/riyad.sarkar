"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

/**
 * 3D glowing shield built from layered shapes — used in the
 * cyber security section. Purely decorative (client-side).
 */

function ShieldShape() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.25;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.2;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Outer shell */}
      <mesh position={[0, 0, 0]}>
        <icosahedronGeometry args={[1.35, 1]} />
        <meshStandardMaterial
          color="#0ea5e9"
          metalness={0.85}
          roughness={0.25}
          wireframe
          transparent
          opacity={0.55}
        />
      </mesh>
      {/* Core shield */}
      <mesh position={[0, 0.15, 0]} rotation={[0, Math.PI / 4, 0]}>
        <octahedronGeometry args={[0.85, 0]} />
        <meshStandardMaterial
          color="#2563eb"
          emissive="#0ea5e9"
          emissiveIntensity={0.55}
          metalness={0.4}
          roughness={0.2}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Orbiting dot */}
      <mesh position={[1.1, 0.4, 0.6]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>
    </group>
  );
}

export function ShieldCanvas() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 4.4], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[4, 4, 4]} intensity={40} color="#38bdf8" />
      <pointLight position={[-4, -2, 2]} intensity={25} color="#2563eb" />
      <Float speed={1.6} rotationIntensity={0.6} floatIntensity={1}>
        <ShieldShape />
      </Float>
    </Canvas>
  );
}
