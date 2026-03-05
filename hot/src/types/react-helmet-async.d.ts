declare module 'react-helmet-async' {
  import { Component } from 'react';
  
  export interface HelmetProps {
    defer?: boolean;
    encodeSpecialCharacters?: boolean;
    children?: React.ReactNode;
  }
  
  export class Helmet extends Component<HelmetProps> {}
  
  export interface HelmetProviderProps {
    context?: any;
    children?: React.ReactNode;
  }
  
  export class HelmetProvider extends Component<HelmetProviderProps> {}
} 