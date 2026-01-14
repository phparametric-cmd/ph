
import React, { useMemo } from 'react';
import '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import '../types';

interface DimensionLineProps {
  start: [number, number, number];
  end: [number, number, number];
  label: string;
  color?: string;
  offsetY?: number;
  visible?: boolean;
}

const TextLabel = ({ text }: { text: string }) => {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Крупная контрастная подложка для размеров
      ctx.fillStyle = 'rgba(15, 23, 42, 1.0)'; 
      ctx.beginPath();
      // Чуть увеличили подложку
      ctx.roundRect(80, 15, 352, 98, 14);
      ctx.fill();
      
      ctx.fillStyle = 'white';
      // Увеличено на ~15% (с 64 до 74)
      ctx.font = '900 74px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 256, 64);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 16;
    return tex;
  }, [text]);

  return (
    <Billboard>
      <mesh>
        {/* Увеличено на ~15% (5.5x1.4 -> 6.4x1.6) */}
        <planeGeometry args={[6.4, 1.6]} />
        <meshBasicMaterial map={texture} transparent alphaTest={0.5} depthWrite={false} />
      </mesh>
    </Billboard>
  );
};

const DimensionLine: React.FC<DimensionLineProps> = ({ start, end, label, color = "#0f172a", offsetY = 0.05, visible = true }) => {
  if (!visible) return null;
  const startVec = new THREE.Vector3(start[0], start[1] + offsetY, start[2]);
  const endVec = new THREE.Vector3(end[0], end[1] + offsetY, end[2]);
  
  const midPoint = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
  const direction = new THREE.Vector3().subVectors(endVec, startVec).normalize();
  
  const points = [startVec, endVec];
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <group>
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial attach="material" color={color} linewidth={3} transparent opacity={0.7} />
      </lineSegments>

      {/* Жирные засечки на концах */}
      {[startVec, endVec].map((pos, i) => (
        <mesh key={i} position={pos} rotation={[0, -Math.atan2(direction.z, direction.x), Math.PI / 4]}>
          <boxGeometry args={[0.1, 2.1, 0.1]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}

      <group position={[midPoint.x, midPoint.y + 1.0, midPoint.z]}>
        <TextLabel text={label} />
      </group>
    </group>
  );
};

interface DimensionsGroupProps {
  plotWidth: number;
  plotLength: number;
  houseWidth: number;
  houseLength: number;
  housePosX: number;
  housePosZ: number;
  showHouse: boolean;
  currentStep: number;
}

const DimensionLines: React.FC<DimensionsGroupProps> = ({ 
  plotWidth, plotLength, houseWidth, houseLength, housePosX, housePosZ, showHouse, currentStep
}) => {
  const plotMargin = 1.4; 
  const houseMargin = 1.2;

  return (
    <group>
      {/* ГРАНИЦЫ УЧАСТКА */}
      <group>
        <DimensionLine 
          start={[-plotWidth / 2, 0, plotLength / 2 + plotMargin]} 
          end={[plotWidth / 2, 0, plotLength / 2 + plotMargin]} 
          label={`${plotWidth.toFixed(1)}m`} 
          color="#1e293b"
        />
        <DimensionLine 
          start={[plotWidth / 2 + plotMargin, 0, -plotLength / 2]} 
          end={[plotWidth / 2 + plotMargin, 0, plotLength / 2]} 
          label={`${plotLength.toFixed(1)}m`} 
          color="#1e293b"
        />
      </group>

      {/* ГАБАРИТЫ ДОМА */}
      {showHouse && (
        <group>
          <DimensionLine 
            start={[-houseWidth / 2 + housePosX, 0.1, houseLength / 2 + housePosZ + houseMargin]} 
            end={[houseWidth / 2 + housePosX, 0.1, houseLength / 2 + housePosZ + houseMargin]} 
            label={`${houseWidth.toFixed(1)}m`} 
            color="#ff5f1f"
            offsetY={0.6}
          />
          <DimensionLine 
            start={[houseWidth / 2 + housePosX + houseMargin, 0.1, -houseLength / 2 + housePosZ]} 
            end={[houseWidth / 2 + housePosX + houseMargin, 0.1, houseLength / 2 + housePosZ]} 
            label={`${houseLength.toFixed(1)}m`} 
            color="#ff5f1f"
            offsetY={0.6}
          />
        </group>
      )}
    </group>
  );
};

export default DimensionLines;
