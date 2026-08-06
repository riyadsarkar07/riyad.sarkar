"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Points, PointMaterial, Sphere } from "@react-three/drei";
import * as THREE from "three";

/**
 * Animated cyber globe — a glowing wireframe sphere wrapped in
 * a field of drifting points, rotating slowly in 3D space.
 */

function PointField({ count = 500 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const positions = useRef<Float32Array | null>(null);

  if (!positions.current) {
    positions.current = new Float32Array(count * 3);
    const radius = 1.15;
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * (0.9 + Math.random() * 0.25);
      positions.current[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions.current[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions.current[i * 3 + 2] = r * Math.cos(phi);
    }
  }

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.05;
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
    }
  });

  return (
    <Points ref={pointsRef} positions={positions.current} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#38bdf8"
        size={0.015}
        sizeAttenuation
        depthWrite={false}
        opacity={0.75}
      />
    </Points>
  );
}

function CoreGlobe() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.12;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      <Sphere args={[1, 48, 48]}>
        <meshBasicMaterial wireframe color="#0ea5e9" transparent opacity={0.28} />
      </Sphere>
      <Sphere args={[0.98, 32, 32]}>
        <meshBasicMaterial color="#0b4a7a" transparent opacity={0.25} side={THREE.DoubleSide} />
      </Sphere>
    </group>
  );
}

function OrbitingRing() {
  const ringRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.15;
    }
  });
  return (
    <mesh ref={ringRef} rotation={[Math.PI / 2.6, 0, 0]}>
      <torusGeometry args={[1.55, 0.008, 12, 120]} />
      <meshBasicMaterial color="#38bdf8" transparent opacity={0.55} />
    </mesh>
  );
}

export function CyberGlobeCanvas() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 4.2], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.6} />
      <Float speed={1.4} rotationIntensity={0.4} floatIntensity={0.8}>
        <CoreGlobe />
        <OrbitingRing />
        <PointField />
      </Float>
    </Canvas>
  );
}
