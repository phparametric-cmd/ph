
import React from 'react';
import '@react-three/fiber';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import '../types'; // Import global types and JSX augmentation

/**
 * Visualization of the land plot, including surface and perimeter fences.
 * JSX elements are typed via global augmentation in types.ts.
 */
interface PlotProps {
  width: number;
  length: number;
  gatePosX: number;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
  onPointerMove?: (e: ThreeEvent<PointerEvent>) => void;
}

const Plot: React.FC<PlotProps> = ({ width, length, gatePosX, onClick, onPointerMove }) => {
  const fenceHeight = 0.8;
  const fenceThickness = 0.15;
  const fenceColor = "#6b4f2a"; // Wood
  const gateWidth = 4.0;

  // Front fence split by gate
  const frontLeftWidth = (width / 2) + (gatePosX - gateWidth / 2);
  const frontRightWidth = (width / 2) - (gatePosX + gateWidth / 2);

  return (
    <group>
      {/* 🌱 Plot Surface (Grass) */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.01, 0]} 
        receiveShadow 
        onClick={onClick}
        onPointerMove={onPointerMove}
      >
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial color="#8fcf7a" roughness={1} />
      </mesh>

      {/* 🚧 Fence boundary */}
      
      {/* Front Fence Left segment */}
      {frontLeftWidth > 0 && (
        <mesh position={[(-width / 2) + (frontLeftWidth / 2), fenceHeight / 2, length / 2]} castShadow receiveShadow>
          <boxGeometry args={[frontLeftWidth, fenceHeight, fenceThickness]} />
          <meshStandardMaterial color={fenceColor} />
        </mesh>
      )}

      {/* Front Fence Right segment */}
      {frontRightWidth > 0 && (
        <mesh position={[(width / 2) - (frontRightWidth / 2), fenceHeight / 2, length / 2]} castShadow receiveShadow>
          <boxGeometry args={[frontRightWidth, fenceHeight, fenceThickness]} />
          <meshStandardMaterial color={fenceColor} />
        </mesh>
      )}
      
      {/* Back Boundary Fence */}
      <mesh position={[0, fenceHeight / 2, -length / 2]} castShadow receiveShadow>
        <boxGeometry args={[width, fenceHeight, fenceThickness]} />
        <meshStandardMaterial color={fenceColor} />
      </mesh>

      {/* Side Boundary Fences */}
      <mesh position={[width / 2, fenceHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[fenceThickness, fenceHeight, length]} />
        <meshStandardMaterial color={fenceColor} />
      </mesh>

      <mesh position={[-width / 2, fenceHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[fenceThickness, fenceHeight, length]} />
        <meshStandardMaterial color={fenceColor} />
      </mesh>
    </group>
  );
};

export default Plot;
