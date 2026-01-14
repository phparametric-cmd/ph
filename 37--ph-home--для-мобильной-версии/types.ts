
import React from 'react';
import { ThreeElements } from '@react-three/fiber';

export type Language = 'ru' | 'en' | 'kk';

export type RoofType = 'flat' | 'hipped' | 'gabled';
export type HouseType = 
  | 'Modern Minimalism' 
  | 'Modern Classics' 
  | 'Wright Style' 
  | 'Industrial'
  | 'Custom';

export type LivingFormat = 'ordinary' | 'signature';

export interface RoomInfo {
  name: string;
  area: number;
}

export interface FloorPlan {
  floorNumber: number;
  rooms: RoomInfo[];
  comment: string;
}

export interface ProjectFile {
  name: string;
  type: string;
  data: string; // Base64
}

export interface HouseState {
  lang: Language;
  userName: string;
  userPhone: string;
  userEmail: string;
  type: HouseType;
  format: LivingFormat;
  styleDescription: string;
  styleImageUrl?: string; 
  customStyleImage?: string;
  area: number;
  floors: number;
  roofType: RoofType;
  wallColor: string;
  roofColor: string;
  doorColor: string;
  name: string;
  description: string;
  plotWidth: number;
  plotLength: number;
  gatePosX: number;
  houseWidth: number;
  houseLength: number;
  housePosX: number;
  housePosZ: number;
  projectDate?: string;
  bedroomsCount: number;
  bedroomArea: number;
  bathroomsCount: number;
  hasOffice: boolean;
  hasPantry: boolean;
  isKitchenLivingCombined: boolean;
  floorComments: string[];
  calculatedPlan?: FloorPlan[];
  planningWishes?: string;
  
  hasTerrace: boolean;
  terraceWidth: number;
  terraceDepth: number;
  terracePosX: number;
  terracePosZ: number;
  hasBBQ: boolean;
  bbqLabel: string;
  bbqWidth: number;
  bbqDepth: number;
  bbqPosX: number;
  bbqPosZ: number;
  hasSummerKitchen: boolean;
  summerKitchenWidth: number;
  summerKitchenDepth: number;
  summerKitchenPosX: number;
  summerKitchenPosZ: number;
  hasBath: boolean;
  bathWidth: number;
  bathDepth: number;
  bathPosX: number;
  bathPosZ: number;
  hasPool: boolean;
  poolWidth: number;
  poolDepth: number;
  poolPosX: number;
  poolPosZ: number;
  hasJacuzzi: boolean;
  jacuzziWidth: 2.5;
  jacuzziDepth: 2.5;
  jacuzziPosX: -14;
  jacuzziPosZ: -16;
  hasGarage: boolean;
  garageCars: number;
  garageWeight: number;
  garageGateOpen: boolean;
  garagePosX: number;
  garagePosZ: number;
  garageRotation: number;
  hasCarport: boolean;
  carportCars: number;
  carportWeight: number;
  carportPosX: number;
  carportPosZ: number;
  carportRotation: number;
  hasCustomObj: boolean;
  customObjLabel: string;
  customObjWidth: number;
  customObjDepth: number;
  customObjPosX: number;
  customObjPosZ: number;
  extraWishes?: string;
  projectFiles: ProjectFile[];
  
  aiProjectDescription?: string;
  renderFrontUrl?: string;
  sitePlanUrl?: string;
}

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements extends ThreeElements {}
    }
  }
}
